var getPriceHistory = require("./getPriceHistory.js");
var insertPriceHistory = require("./insertPriceHistory.js");

// Updates the price history data stored in the database with any new price
// history data from GDAX.
exports.run = function(callback) {
   getPriceHistory.run(function(priceHistoryDocs) {

      // Make start date either an hour after the latest entry in priceHistoryDocs, or July 1, 2016
      // if there are no entries at all.
      var startDate;
      if (priceHistoryDocs.length == 0) {
         startDate = new Date(1467331200000); // July 1, 2016, 12:00:00 AM GMT
      } else {
         var latestPriceHistory = priceHistoryDocs[priceHistoryDocs.length-1].time;
         startDate = new Date(latestPriceHistory*1000 + 3600000); // (The latest price history time) + (an hour in ms)
      }

      // Make the end date the current date time
      var endDate = new Date(); // Now

      // Query GDAX for the new price history and insert into the database
      insertPriceHistory.run(startDate, endDate, callback);

   });
}
