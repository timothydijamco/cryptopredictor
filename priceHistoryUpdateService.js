var schedule = require('node-schedule');
var insertNewPriceHistory = require("./db-utils/insertNewPriceHistory.js");

console.log("Price History Update Service started.")

// Runs the program to check and update the price history data every :02 of every hour.
schedule.scheduleJob("2 * * * *", function() {
   insertNewPriceHistory.run(function() {
      console.log("Finished attempting to insert new price history.");
   });
});
