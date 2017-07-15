var MongoClient = require('mongodb').MongoClient;
var request = require('request');
var brain = require("brain.js");
var bot = require("./ethbot.js");

var url = 'mongodb://localhost:27017/cryptopredictor';

// Simulation parameters
var startDateTime = new Date("2017-01-01T20:00:00-0400"); // January 1, 2017 at 8:00 PM EDT (7:00 PM EST)
var endDateTime = new Date("2017-06-15T20:00:00-0400"); // June 15, 2017 at 8:00 PM EDT
//--

var priceHistoryDocs = [];

// Load price history data, then start simulation
MongoClient.connect(url, function(err, db) {
   var collection = db.collection('priceHistory');
   collection.find({}).toArray(function(err, documents) {
      console.log("Error? " + err);
      console.log("Price history (" + documents.length + " items) received.");
      priceHistoryDocs = documents;
      db.close();

      // BEGIN SIMULATION
      simulate(startDateTime, endDateTime, 1000);
   });
});


function simulate(startDateTime, endDateTime, startingUSD) {
   // Set up initial variables
   console.log("\n====================");
   console.log("BEGINNING SIMULATION.");
   console.log("Starting at " + startDateTime.toISOString());
   console.log("Ending at " + endDateTime.toISOString());
   console.log("Starting with $" + startingUSD.toFixed(2));

   var ethAmount = startingUSD / getPriceAtDateTime(startDateTime);
   var usdAmount = 0;
   console.log("             = " + ethAmount + " ETH");
   console.log("Price at start: $" + getPriceAtDateTime(startDateTime).toFixed(2) + "/ETH");

   // Loop through days until endDateTime is reached
   var day = 1;
   var currentDateTime = startDateTime;
   while (currentDateTime < endDateTime) {
      console.log("\n\nDay " + day + " (" + currentDateTime.toISOString() + "):");

      // The trading bot shouldn't have access to price history data after currentDateTime, so
      // generate a set of price history data from before currentDateTime.
      var priceHistoryDocsAvailableToBot = getPHDBeforeOrAtDateTime(priceHistoryDocs, currentDateTime);

      // Give information to bot and get a decision from it
      var decision = bot.makeDecision(priceHistoryDocsAvailableToBot, currentDateTime);

      // Decision can be from -1 to 1
      //  - If negative, sell an amount of ETH proportional to the decision. For example,
      //   if decision = -0.75, then sell 75% of the ETH.
      //  - If positive, use an amount of USD proportional to the decision to buy ETH. For
      //   Example, if decision = 0.45, then use 45% of USD to buy ETH.
      if (Math.abs(decision) > 1) {
         console.log("  Error: Invalid decision made!");
         decision = 0; // Do nothing this day
      }

      var percentageDisplay = (Math.abs(decision)*100).toFixed(2) + "%";
      var currentPrice = getPriceAtDateTime(currentDateTime);

      // If currentPrice is not null, then it's safe to buy/sell based on the decision made.
      if (currentPrice != null) {
         if (decision < 0) {
            var ethAmountToSell = ethAmount * (-decision);
            var usdAmountToReceive = ethAmountToSell * currentPrice;
            usdAmount += usdAmountToReceive;
            ethAmount -= ethAmountToSell;
            console.log("  Sold " + ethAmountToSell + " ETH (" + percentageDisplay + ") at $" + currentPrice + "/ETH, receiving $" + usdAmountToReceive);
         } else {
            var usdAmountToUse = usdAmount * decision;
            var ethAmountToBuy = usdAmountToUse / currentPrice;
            usdAmount -= usdAmountToUse;
            ethAmount += ethAmountToBuy;
            console.log("  Used $" + usdAmountToUse + " (" + percentageDisplay + ") at $" + currentPrice + "/ETH, receiving " + ethAmountToBuy + " ETH");
         }
      }

      currentDateTime = addDays(currentDateTime, 1);
      day++;
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
