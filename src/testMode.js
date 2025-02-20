const mydealzApi = require("mydealz-api");
const { checkDealTitle, checkDealUser, checkDealPrice, checkDealCategory, checkDealTemperature } = require("./utils");

async function testSearchterms(CONFIG) {
    for (const searchterm of CONFIG.searchterm.filter(item => item.test)) {
        console.log("--------------------------------------------------");
        console.log("Testing Searchterm:");
        console.log(searchterm);
        const deal = await mydealzApi.getDeal(searchterm.test);
        if (Object.keys(searchterm).some(item => item.startsWith("title"))) {
            console.log("Title matches:", checkDealTitle(deal.title, searchterm));
            console.log("\tDeal Title:", deal.title);
        }
        if (Object.keys(searchterm).some(item => item.startsWith("user"))) {
            console.log("User matches:", checkDealUser(deal.user?.name, searchterm));
            console.log("\tDeal User:", deal.user?.name);
        }
        if (Object.keys(searchterm).some(item => item.startsWith("price"))) {
            console.log("Price matches:", checkDealPrice(deal.price, searchterm));
            console.log("\tDeal Price:", deal.price);
        }
        if (Object.keys(searchterm).some(item => item.startsWith("category"))) {
            console.log("Category matches:", checkDealCategory(deal.group?.name, searchterm));
            console.log("\tDeal Category:", deal.group?.name);
        }
        if (typeof (searchterm.temperature) == "number") {
            console.log("Temperature matches:", checkDealTemperature(deal.temperature, searchterm));
            console.log("\tDeal Temperature:", deal.temperature);
        }
    }
}

function mainTest(CONFIG) {
    console.log("Test Mode enabled");

    testSearchterms(CONFIG);
}

module.exports = { mainTest };