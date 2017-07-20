var brain = require("brain.js");
var priceHistoryPredictor = require("../predictors/priceHistoryPredictor.js");

var indent = "      ";

exports.makeDecision = function(priceHistoryDocs, currentDateTime, currentDay) {
   // If first day of simulation, convert all USD to ETH
   if (currentDay == 1) {
      return 1;
   }

   // Train a neural network on the price history and make a prediction
   var prediction = priceHistoryPredictor.run(priceHistoryDocs, currentDateTime);

   // If the prediction could not be made, then return 0 (decision is: do nothing)
   if (!prediction) {
      return 0;
   }

   // This bot attempts to sell ETH if a price drop is expected, and attempts to buy ETH
   // if a price increase is expected.
   decision = prediction * 5;
   if (decision > 1) {
      decision = 1;
   } else if (decision < -1) {
      decision = -1;
   }
   return decision;

}
