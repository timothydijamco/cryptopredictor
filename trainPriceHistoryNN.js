var brain = require("brain.js");

exports.trainNNFromPriceHistory = trainNNFromPriceHistory;

function trainNNFromPriceHistory(priceHistoryDocs) {
   var trainingData = generateTrainingData(priceHistoryDocs);

   // Create a neural network
   var net = new brain.NeuralNetwork({
      hiddenLayers: [4]
   });

   // Train the neural network on the training data
   net.train(trainingData, {
      errorThresh: 0.001,
      iterations: 250000,
      log: true,
      logPeriod: 10000,
      learningRate: 0.25
   });

   //console.log(net.toJSON());

   return net.toJSON();
}

// Generates training data using the given price history
function generateTrainingData(priceHistoryDocs) {
   var trainingData = [];

   for (var i = priceHistoryDocs.length-1-13; i >= 8; i-=7) {
      var thisWeekInput = [];
      var thisWeekOutput = [];

      for (var j = 0; j < 7; j++) {
         var currentPrice = priceHistoryDocs[i].close;
         var previousPrice = priceHistoryDocs[i].low;
         var normalized = generateNormalized(currentPrice, previousPrice);
         thisWeekInput.push(normalized);
      }

      var lastDayPrice = priceHistoryDocs[i+7].close;
      var secondToLastDayPrice = priceHistoryDocs[i+6].open;
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
