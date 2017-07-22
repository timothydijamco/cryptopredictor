var brain = require("brain.js");
var dateUtils = require("../utils/dateUtils.js");

var indent = "      ";

exports.run = function(priceHistoryDocs, currentDateTime) {
   // Begin training a neural network
   console.log(indent + "Thinking...");
   var network = trainNeuralNetwork(priceHistoryDocs, currentDateTime);

   // If there was some error in creating the neural network, return null
   if (network == null) {
      return null;
   }

   // Get the day 6 days before currentDateTime. This will be the starting point for getting the
   // 6 inputs (which are the changes in price in the 6 days leading up to the currentDateTime)
   // for making the prediction.
   var weekStartDateTime = dateUtils.addDays(currentDateTime, -6);
   var weekStartIndex = findIndexOfDateTime(priceHistoryDocs, weekStartDateTime);

   // Set up the inputs (in this case, the price changes in the 6 days leading up to the
   // currentDateTime).
   // The reliance on indices of priceHistoryDocs is buggy because occaisionally, price
   // history data points may be missing, causing the following input generation code to
   // go out of bounds. Temporarily bypass this error with a try-catch statement.
   try {
      var inputs = [];
      for (var i = 0; i < 7; i++) {
         //console.log("  Day " + (i+1) + ":" + (new Date(priceHistoryDocs[weekStartIndex + (i*24)].time * 1000)));
         var currentPrice = priceHistoryDocs[weekStartIndex + (i*24)].open;
         var previousPrice = priceHistoryDocs[weekStartIndex + ((i-1)*24)].open;
         var normalized = generateNormalized(currentPrice, previousPrice);
         inputs.push(normalized);
      }
   } catch (err) {
      console.log(indent + "Error: " + err);
      return 0;  // Do nothing
   }

   // Make the prediction
   var output = network.run(inputs);

   // De-normalize the output. For example, -0.12 means a decrease of 12% in the ETH price
   // is predicted. 0.036 means an increase of 3.6% in the ETH price is predicted.
   var prediction = output-0.5;

   return prediction;

}

function trainNeuralNetwork(priceHistoryDocs, anchorDateTime) {
   var trainingData = generateTrainingData(priceHistoryDocs, anchorDateTime);

   // If there was an error in generating the training data, then don't try to create
   // a neural network.
   if (trainingData == null) {
      return null;
   }

   // Create a neural network
   var net = new brain.NeuralNetwork({
      hiddenLayers: [4]
   });

   // Train the neural network on the training data
   net.train(trainingData, {
      errorThresh: 0.001,
      iterations: 250000,
      log: false,
      logPeriod: 10000,
      learningRate: 0.25
   });

   return net;
}

// Generates training data using the given price history
function generateTrainingData(priceHistoryDocs, anchorDateTime) {
   //var anchorDateTime = new Date("2017-06-29"); // June 29, 2017
   var anchorDateTimeEpoch = anchorDateTime.getTime()/1000;
   //console.log("anchorDateTimeEpoch: " + anchorDateTimeEpoch);

   var anchorIndex = -1;
   for (var i = priceHistoryDocs.length-1; i >= 0; i--) {
      if (priceHistoryDocs[i].time == anchorDateTimeEpoch) {
         anchorIndex = i;
         break;
      }
   }

   if (anchorIndex == -1) {
      console.log(indent + "Error: Could not find anchor datetime");
      return null;
   }

   var trainingData = [];

   // This for loop starts at anchorIndex-(13*24) to make sure that the second for loop, which
   // loops forward, will not go out of bounds. Subtracting by (13*24) ensures that the second
   // for loop starts at the correct day of the week.
   for (var i = anchorIndex-(13*24); i >= (8*24); i-=(7*24)) {
      var thisWeekInput = [];
      var thisWeekOutput = [];

      for (var j = 0; j < 7; j++) {
         //console.log("     Day " + (j+1) + ":" + (new Date(priceHistoryDocs[i+(j*24)].time * 1000)));
         var currentPrice = priceHistoryDocs[i+(j*24)].open;
         var previousPrice = priceHistoryDocs[i+((j-1)*24)].open;
         var normalized = generateNormalized(currentPrice, previousPrice);
         thisWeekInput.push(normalized);
      }

      //console.log("2nd to last day: " + (new Date(priceHistoryDocs[i+(6*24)].time * 1000)));
      //console.log("Last day: " + (new Date(priceHistoryDocs[i+(7*24)].time * 1000)));

      var lastDayPrice = priceHistoryDocs[i+(7*24)].open;
      var secondToLastDayPrice = priceHistoryDocs[i+(6*24)].open;
      var normalized = generateNormalized(lastDayPrice, secondToLastDayPrice);
      thisWeekOutput.push(normalized);

      // Combine into a training data object
      var thisWeekData = {
         input: thisWeekInput,
         output: thisWeekOutput
      };
      trainingData.push(thisWeekData);
   }

   return trainingData;
}

// Normalizes percentage like 1.05 (meaning 5% increase) or 0.75 (meaning 25%
// decrease) into a number from 0 to 1.
// 1.00 (meaning no change) becomes 0.5, 1.05 becomes 0.505, and so on.
function generateNormalized(currentPrice, previousPrice) {
   var percentage = currentPrice/previousPrice;
   var normalized = percentage - 0.5;
   return normalized;
}

// Finds the index of the price history data point in priceHistoryDocs for the
// specified dateTime.
function findIndexOfDateTime(priceHistoryDocs, dateTime) {
   var epoch = dateTime.getTime()/1000;
   for (var i = priceHistoryDocs.length-1; i >= 0; i--) {
      if (priceHistoryDocs[i].time == epoch) {
         return i;
      }
   }
   return null;
}
