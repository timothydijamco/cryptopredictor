var MongoClient = require('mongodb').MongoClient;
var request = require('request');

var priceHistoryBot = require("./bots/pricehistorybot.js");
var buyAndHoldBot = require("./bots/buyandholdbot.js");
var monkeyBot = require("./bots/monkeybot.js");


// Simulation parameters
var bots = [priceHistoryBot, buyAndHoldBot, monkeyBot];
var startDateTime = new Date("2017-01-01T20:00:00-0400"); // January 1, 2017 at 8:00 PM EDT (7:00 PM EST)
var endDateTime = new Date("2017-03-15T20:00:00-0400"); // June 15, 2017 at 8:00 PM EDT
//--


// Load price history data, then start simulation
var priceHistoryDocs = [];
var url = 'mongodb://localhost:27017/cryptopredictor';
MongoClient.connect(url, function(err, db) {
   var collection = db.collection('priceHistory');
   collection.find({}).toArray(function(err, documents) {
      console.log("Error? " + err);
      console.log("Price history (" + documents.length + " items) received.");
      priceHistoryDocs = documents;
      db.close();

      // BEGIN SIMULATION
      simulate(bots, startDateTime, endDateTime, 1000);
   });
});


function simulate(bots, startDateTime, endDateTime, startingUSD) {
   // Print out simulation parameters
   console.log("\n====================");
   console.log("BEGINNING SIMULATION.");
   console.log("Price at start: $" + getPriceAtDateTime(startDateTime).toFixed(2) + "/ETH");
   console.log("Parameters:");
   console.log("  - " + bots.length + " bots");
   console.log("  - Starting at " + startDateTime.toISOString());
   console.log("  - Ending at " + endDateTime.toISOString());
   console.log("  - Starting with $" + startingUSD.toFixed(2));

   // Set up initial state for bots
   var botStates = [];
   for (var i = 0; i < bots.length; i++) {
      var state = {
         bot: bots[i],
         usdAmount: 1000, // Give bots $1000
         ethAmount: 0,
         valueOverTime: [] // This array will keep track of total value of bot's accounts over the simulation
      };
      botStates.push(state);
   }

   // Loop through days until endDateTime is reached
   var day = 1;
   var currentDateTime = startDateTime;

   while (currentDateTime < endDateTime) {
      var currentPrice = getPriceAtDateTime(currentDateTime);
      // The trading bots shouldn't have access to price history data after currentDateTime, so
      // generate a set of price history data from before currentDateTime.
      var priceHistoryDocsAvailable = getPHDBeforeOrAtDateTime(priceHistoryDocs, currentDateTime);

      console.log("\n\n\nDay " + day + " (" + currentDateTime.toISOString() + "): (Price: $" + currentPrice + "/ETH)");

      for (var i = 0; i < botStates.length; i++) {
         var thisBotState = botStates[i];
         var totalValue = thisBotState.usdAmount + (thisBotState.ethAmount * currentPrice);
         thisBotState.valueOverTime.push(totalValue); // Log current value of account
         var percentageValueInEthDisplay = (((thisBotState.ethAmount*currentPrice) / totalValue)*100).toFixed(2) + "%";
         var percentageValueInUsdDisplay = ((thisBotState.usdAmount / totalValue)*100).toFixed(2) + "%";

         console.log("\n  Bot " + i + ":");
         console.log("    Total value: $" + totalValue.toFixed(2));
         console.log("      In ETH (" + percentageValueInEthDisplay + "): " + thisBotState.ethAmount);
         console.log("      In USD (" + percentageValueInUsdDisplay + "): " + thisBotState.usdAmount);

         // Give information to bot and get a decision from it
         var decision = thisBotState.bot.makeDecision(priceHistoryDocsAvailable, currentDateTime, day);

         // Decision can be from -1 to 1
         //  - If negative, sell an amount of ETH proportional to the decision. For example,
         //   if decision = -0.75, then sell 75% of the ETH.
         //  - If positive, use an amount of USD proportional to the decision to buy ETH. For
         //   Example, if decision = 0.45, then use 45% of USD to buy ETH.

         // Detect invalid decision
         if (Math.abs(decision) > 1) {
            console.log("    Error: Invalid decision made!");
            decision = 0; // Do nothing this day
         }

         var percentageDisplay = (Math.abs(decision)*100).toFixed(2) + "%";

         // If currentPrice is not null, then it's safe to buy/sell based on the decision made,
         // because we know what price to buy/sell at.
         if (currentPrice != null) {
            if (decision < 0) { // Sell
               var ethAmountToSell = thisBotState.ethAmount * (-decision);
               var usdAmountToReceive = ethAmountToSell * currentPrice;
               thisBotState.usdAmount += usdAmountToReceive;
               thisBotState.ethAmount -= ethAmountToSell;
               console.log("    Sold " + ethAmountToSell + " ETH (" + percentageDisplay + ") at $" + currentPrice + "/ETH, receiving $" + usdAmountToReceive);
            } else if (decision > 0) { // Buy
               var usdAmountToUse = thisBotState.usdAmount * decision;
               var ethAmountToBuy = usdAmountToUse / currentPrice;
               thisBotState.usdAmount -= usdAmountToUse;
               thisBotState.ethAmount += ethAmountToBuy;
               console.log("    Used $" + usdAmountToUse + " (" + percentageDisplay + ") at $" + currentPrice + "/ETH, receiving " + ethAmountToBuy + " ETH");
            } else {
               console.log("    Did nothing.");
            }
         }
      }

      currentDateTime = addDays(currentDateTime, 1);
      day++;
   }

   console.log("\nEND SIMULATION");

   // Print final value of bots' accounts
   console.log("\nEnding values of bots' accounts:");
   for (var i = 0; i < botStates.length; i++) {
      var totalValue = botStates[i].usdAmount + (botStates[i].ethAmount * currentPrice);
      console.log("  Bot " + i + " total value: $" + totalValue.toFixed(2));
   }

   // Print value of bots' accounts over time
   console.log("\n\nValue of bots' accounts over time:");
   for (var i = 0; i < botStates[0].valueOverTime.length; i++) {
      var row = "";
      for (var j = 0; j < botStates.length; j++) {
         row += botStates[j].valueOverTime[i];
         if (j != botStates.length-1) {
            row += ",";
         }
      }
      console.log(row);
   }

}

// Gets all price history data points in priceHistoryDocs (abbreviated to PHD here) that
// were before dateTime.
function getPHDBeforeOrAtDateTime(priceHistoryDocs, dateTime) {
   var limitedPriceHistoryDocs = [];
   for (var i = 0; i < priceHistoryDocs.length; i++) {
      var date = new Date(priceHistoryDocs[i].time*1000);
      if (date <= dateTime) {
         limitedPriceHistoryDocs.push(priceHistoryDocs[i]);
      }
   }
   return limitedPriceHistoryDocs;
}

// Get the price of ETH at the specified dateTime
function getPriceAtDateTime(dateTime) {
   var epoch = dateTime.getTime() / 1000;
   for (var i = 0; i < priceHistoryDocs.length; i++) {
      if (priceHistoryDocs[i].time == epoch) {
         return priceHistoryDocs[i].open;
      }
   }
   return null;
}


function addDays(date, days) {
  var newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}
