var schedule = require('node-schedule');
var insertNewPriceHistory = require("./dbUtils/insertNewPriceHistory.js");

console.log("Price History Update Service started.")

// Runs the program to check and update the price history data every :05 of every hour.
schedule.scheduleJob("5 * * * *", function() {
   insertNewPriceHistory.run(function() {
      console.log("Finished attempting to insert new price history.");
   });
});
