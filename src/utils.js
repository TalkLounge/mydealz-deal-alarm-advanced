const fs = require("fs");
const TOML = require("@iarna/toml");
const { spawn } = require("child_process");

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function mail(subject, html, CONFIG, isHtml) {
    if (CONFIG.logNotification) {
        console.log("\n[FROM]:", CONFIG.emailSender);
        console.log("[TO]:", CONFIG.emailReceiver);
        console.log("[SUBJECT]:", subject);
        console.log("[BODY]:", html);
    }

    subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`; // Otherwise email with "ä" will not be sent

    return new Promise(resolve => {
        const echo = spawn("echo", [html]);

        let args = ["-s", subject, "-a", `From:${CONFIG.emailSender}`, CONFIG.emailReceiver];
        if (isHtml) {
            args.splice(-1, 0, "-a");
            args.splice(-1, 0, "Content-Type:text/html");
        }

        const mail = spawn("mail", args);
        echo.stdout.pipe(mail.stdin);
        mail.on("close", () => {
            resolve();
        });
    });
}

async function sendNotification(info, CONFIG, isError) {
    if (isError) {
        await mail(`Error: ${info.message}`, `${info.stack ? `Stack:\n${info.stack}\n\n` : ""}${info.context ? `Context:\n${JSON.stringify(info.context)}\n\n` : ""}${info.originalError ? `Original Error:\n${JSON.stringify(info.originalError)}` : ""}`, CONFIG);
    } else {
        await mail(`${info.label ? info.label + ": " : ""}${info.title}`, `<html>
<head>
    <style>
        img {
            width: 25%;
        }
    </style>
</head>
<body>
    Deal: <a href='${info.url}'>${info.title}</a><br>
    Temperature: <span style='color: #ce1734'>${Math.floor(info.temperature)}°</span><br>
    ${info.price ? `Price: <span style='color: #24a300'>${info.price.toString().replace(".", ",")}€</span>${info.nextBestPrice ? ` <del style='color: #6b6d70'>${info.nextBestPrice.toString().replace(".", ",")}€</del> -${Math.round((1 - (info.price / info.nextBestPrice)) * 100)}%` : ""}<br>` : ""}
    Published: ${new Date(info.publishedAt * 1000).toLocaleString()}<br>
    <br>
    <img src='${info.img}'>
    <br>
    ${info.description ? `<br>${info.description}` : ""}
</body>
</html>`, CONFIG, true);
    }
}

async function sendError(error, CONFIG) {
    if (CONFIG.notifyOnError) {
        await sendNotification(error, CONFIG, true);
    }
}

async function loadCache() {
    let cache;
    try {
        cache = fs.readFileSync("CACHE", "utf8");

        try {
            cache = TOML.parse(cache);
        } catch (error) {
            console.error("Cache file has an invalid format. Exiting...", error);
            process.exit(1);
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            console.info("Cache file not found. Creating new one");
            cache = { id: [], deal: [] };
        } else {
            console.error("Cache file has an unknown error. Exiting...", error);
            process.exit(1);
        }
    }

    return cache;
}

function saveCache(cache) {
    const fileData = TOML.stringify(cache);
    fs.writeFileSync("CACHE", fileData);
}

function checkDealTitle(title, searchterm) {
    // titleContains
    if (typeof (searchterm.titleContains) == "string") { // string
        if (!title.toLowerCase().includes(searchterm.titleContains.toLowerCase())) {
            return false;
        }
    } else if (Array.isArray(searchterm.titleContains)) { // array
        for (const titleContains of searchterm.titleContains) {
            if (!title.toLowerCase().includes(titleContains.toLowerCase())) {
                return false;
            }
        }
    }

    // titleContainsNot
    if (typeof (searchterm.titleContainsNot) == "string") { // string
        if (title.toLowerCase().includes(searchterm.titleContainsNot.toLowerCase())) {
            return false;
        }
    } else if (Array.isArray(searchterm.titleContainsNot)) { // array
        for (const titleContainsNot of searchterm.titleContainsNot) {
            if (title.toLowerCase().includes(titleContainsNot.toLowerCase())) {
                return false;
            }
        }
    }

    // titleRegex
    if (typeof (searchterm.titleRegex) == "string") { // string
        if (!new RegExp(searchterm.titleRegex.toLowerCase()).test(title.toLowerCase())) {
            return false;
        }
    } else if (Array.isArray(searchterm.titleRegex)) { // array
        for (const titleRegex of searchterm.titleRegex) {
            if (!new RegExp(titleRegex.toLowerCase()).test(title.toLowerCase())) {
                return false;
            }
        }
    }

    return true;
}

function checkDealUser(user, searchterm) {
    // user
    if (typeof (searchterm.user) == "string") {
        if (user.toLowerCase() != searchterm.user.toLowerCase()) {
            return false;
        }
    }

    // userNot
    if (typeof (searchterm.userNot) == "string") { // string
        if (user.toLowerCase() == searchterm.userNot.toLowerCase()) {
            return false;
        }
    } else if (Array.isArray(searchterm.userNot)) { // array
        for (const userNot of searchterm.userNot) {
            if (user.toLowerCase() == userNot.toLowerCase()) {
                return false;
            }
        }
    }

    return true;
}

function checkDealPrice(price, searchterm) {
    // price
    if (typeof (searchterm.price) == "number") { // number
        if (price > searchterm.price) {
            return false;
        }
    }

    return true;
}

function checkDealCategory(category, searchterm) {
    // category
    if (typeof (searchterm.category) == "string") { // string
        if (category.toLowerCase() != searchterm.category.toLowerCase()) {
            return false;
        }
    } else if (Array.isArray(searchterm.category)) { // array
        if (!searchterm.category.some(item => item.toLowerCase() == category.toLowerCase())) {
            return false
        }
    }

    return true;
}

function checkDealTemperature(temperature, searchterm) {
    // temperature
    if (typeof (searchterm.temperature) == "number") {
        if (temperature < searchterm.temperature) {
            return false;
        }
    }

    return true;
}

module.exports = {
    sleep,
    sendNotification,
    sendError,
    loadCache,
    saveCache,
    checkDealTitle,
    checkDealUser,
    checkDealPrice,
    checkDealCategory,
    checkDealTemperature
};
