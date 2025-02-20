const fs = require("fs");
const TOML = require("@iarna/toml");
const defaults = require("defaults");
const mydealzApi = require("mydealz-api");
const crypto = require("crypto");
const { sleep, sendNotification, sendError, loadCache, saveCache, checkDealTitle, checkDealUser, checkDealPrice, checkDealCategory, checkDealTemperature } = require("./utils");
const { mainTest } = require("./testMode.js");


// INIT

let CONFIG, CACHE;
try {
    CONFIG = fs.readFileSync("settings.conf", "utf8");

    try {
        CONFIG = TOML.parse(CONFIG);

        if (!CONFIG.searchterm) {
            console.log("Config file has no searchterms. Exiting...");
            process.exit(1);
        }
    } catch (error) {
        console.error("Config file has an invalid format. Exiting...", error);
        process.exit(1);
    }
} catch (error) {
    if (error.code === "ENOENT") {
        console.error("Config file not found. Please create one. Exiting...");
        process.exit(1);
    } else {
        console.error("Config file has an unknown error. Exiting...", error);
        process.exit(1);
    }
}

CONFIG = defaults(CONFIG, {
    apiCooldownMs: 500,
    emailSender: "",
    emailReceiver: "",
    notifyOnError: true,
    logNotification: true,
    proxyUrl: ""
});


// FUNCTIONS

let notified = [];

async function iterateNewDeals() {
    let page = 1;

    const lastExecuted = Math.floor(Date.now() / 1000);

    let newDeals;
    do {
        try {
            newDeals = await mydealzApi.getNewDeals(page, { proxyUrl: CONFIG.proxyUrl?.length ? CONFIG.proxyUrl : undefined });
        } catch (error) {
            console.error(error);
            await sendError(error, CONFIG);
            saveCache(CACHE);
            console.error("MyDealz API returned an error. Exiting...");
            process.exit(1);
        }

        for (let i = 0; i < newDeals.length; i++) {
            const deal = newDeals[i];

            // Aborting here when deal.publishedAt <= CACHE.lastExecuted doesn't work, because some deals are published after publishedAt somehow
            // So instead save the ids that have already been run through (and delete them from cache after one day)
            if (CACHE.id.some(item => item.id == deal.id)) {
                continue;
            }
            if (notified.includes(deal.url)) { // Don't notify the same deal twice
                continue;
            }

            CACHE.id.push({ id: deal.id, timestamp: lastExecuted });

            for (const searchterm of CONFIG.searchterm) {
                if (checkDealTitle(deal.title, searchterm) && checkDealUser(deal.user?.name, searchterm) && checkDealPrice(deal.price, searchterm) && checkDealCategory(deal.group?.name, searchterm)) {
                    if (checkDealTemperature(deal.temperature, searchterm) && (typeof (searchterm.temperature) != "number" || !deal.rePublishedAt)) {
                        notified.push(deal.url);
                        await sendNotification({ label: searchterm.label, temperature: deal.temperature, title: deal.title, url: deal.url, publishedAt: deal.publishedAt, img: deal.image.url, price: deal.price, nextBestPrice: deal.nextBestPrice }, CONFIG);
                        break; // Don't notify the same deal twice
                    } else if (
                        !searchterm.temperatureWithinMinutes ||
                        Date.now() < (deal.publishedAt + (searchterm.temperatureWithinMinutes * 60)) * 1000
                    ) {
                        let cacheDeal = {
                            label: searchterm.label,
                            url: deal.url,
                            requiredTemperature: searchterm.temperature,
                            searchtermHash: crypto.createHash("md5").update(TOML.stringify(searchterm)).digest("hex"),
                            debugTemperature: deal.temperature,
                            debugTimestamp: Math.floor(Date.now() / 1000)
                        };

                        if (CACHE.deal.some(item => item.url == cacheDeal.url && item.searchtermHash == cacheDeal.searchtermHash)) { // Don't add to cache if already exists in cache
                            continue;
                        }

                        if (deal.rePublishedAt) { // When the deal is republished, set the temperature to zero by subtracting the temperature at the time of republishing
                            cacheDeal.baseTemperature = deal.temperature;
                        }

                        if (searchterm.temperatureWithinMinutes) {
                            cacheDeal.timeout = deal.publishedAt + (searchterm.temperatureWithinMinutes * 60);
                        }

                        // Add to cache for later temperature check
                        CACHE.deal.push(cacheDeal);
                    }
                }
            }
        }

        page++;
        await sleep(CONFIG.apiCooldownMs);
    } while (CACHE.lastExecuted && CACHE.lastExecuted <= newDeals[newDeals.length - 1].publishedAt); // If cache file not found, iterate just trough the first page

    CACHE.lastExecuted = lastExecuted;
    CACHE.id = CACHE.id.filter(item => item.timestamp + 60 * 60 * 24 >= lastExecuted); // Remove IDs older than one day
    CACHE.deal = CACHE.deal.filter(item => !notified.includes(item.url)); // Remove deals that have already been notified

    saveCache(CACHE);
}

async function iterateCacheDeals() {
    for (let i = 0; i < CACHE.deal.length; i++) {
        const cacheDeal = CACHE.deal[i];

        let deal;
        try {
            deal = await mydealzApi.getDeal(cacheDeal.url, { proxyUrl: CONFIG.proxyUrl?.length ? CONFIG.proxyUrl : undefined });
        } catch (error) {
            if (error.originalError?.status == 410) { // Deal was deleted
                // Remove from cache
                CACHE.deal.splice(i, 1);
                i--;
                continue;
            } else if (error.originalError?.status == 404) { // Deal is in moderation
                if (cacheDeal.timeout) { // Extend timeout
                    cacheDeal.timeout += Math.floor((Date.now() - CACHE.lastExecuted * 1000) / 1000);
                }
                continue;
            } else {
                console.error(error);
                await sendError(error, CONFIG);
                saveCache(CACHE);
                console.error("MyDealz API returned an error. Exiting...");
                process.exit(1);
            }
        }

        if (cacheDeal.url != deal.url) { // Deal was merged with older deal
            // Remove from cache
            CACHE.deal.splice(i, 1);
            i--;
            continue;
        }

        if (notified.includes(deal.url)) { // Don't notify the same deal twice
            continue;
        }

        if (checkDealTemperature(deal.temperature - (cacheDeal.baseTemperature || 0), { temperature: cacheDeal.requiredTemperature })) {
            notified.push(deal.url);
            await sendNotification({ label: cacheDeal.label, temperature: deal.temperature, title: deal.title, url: deal.url, publishedAt: deal.publishedAt, img: deal.image, price: deal.price, nextBestPrice: deal.nextBestPrice, description: deal.description }, CONFIG);

            // Remove from cache
            CACHE.deal.splice(i, 1);
            i--;
            continue;
        }

        if (Date.now() >= cacheDeal.timeout * 1000) { // Remove from cache if timeout reached
            CACHE.deal.splice(i, 1);
            i--;
            continue;
        }

        await sleep(CONFIG.apiCooldownMs);
    }
}

async function main() {
    CACHE = await loadCache();
    await iterateCacheDeals();
    await iterateNewDeals();
}


// MAIN

if (CONFIG.searchterm.some(item => item.test)) { // Test Mode enabled
    mainTest(CONFIG);
} else {
    main();
}
