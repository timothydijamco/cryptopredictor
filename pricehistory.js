var request = require('request');
var brain = require("brain.js");
var readlineSync = require('readline-sync');

// Ask user for a date
console.log("\nA GDAX day is from 8:00 PM to 8:00 PM on the next day (EDT).");
console.log("Enter a date to get a prediction of the change in the price of");
console.log("ETH from 8:00 PM on the provided day to 8:00 on the next day.\n");
var date = readlineSync.question('Date (YYYY-MM-DD): ');
console.log(""); // Newline

// Get ETH price history, then create, train, and use neural network
var priceHistory = [];
addToPriceHistory(         // The GDAX API limits the # of results to 200, so we need to use two API requests
   '2016-07-01T12:00:00',
   '2017-01-05T12:00:00',
   addToPriceHistory.bind(this,
      '2017-01-06T12:00:00',
      date + 'T12:00:00', // Get the price history up to the user-provided date
      function() {
         // Generate training data from the price history
         var trainingData = generateTrainingData();

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

         // Generate the prediction. First get the inputs (for the neural
         // network) from the price history of the days before the date that
         // the user provided, then run the neural network on the inputs.
         var inputs = [];
         for (var i = 0; i < 7; i++) {
            var lastIndex = priceHistory.length-1;
            var currentPrice = priceHistory[lastIndex - i][4];
            var previousPrice = priceHistory[lastIndex - i -1][4];
            var normalized = generateNormalized(currentPrice, previousPrice);
            inputs.push(normalized);
         }
         makePrediction(net, inputs);

      }
   )
);

// Get price history data from the GDAX API and add it to priceHistory.
function addToPriceHistory(start, end, callback) {
   console.log("Waiting for the GDAX API...");
   request.get({
      url: 'https://api.gdax.com/products/ETH-USD/candles',
      qs: {
         start: start,
         end: end,
         granularity: '86400'
      }, headers: {
         'User-Agent': 'cryptopredictor node.js"'
      }
   }, function(error, response, body) {
      console.log("  Response received.");
      var json = JSON.parse(body);
      json = json.reverse(); // Reverse the array so that older data is first
      priceHistory = priceHistory.concat(json);
      callback();
   });
}

// Uses price history data in priceHistory to calculate the changes in the
// ETH price for the appropriate days. Creates an array of objects containing
// the price change information. This array can be passed to the neural network
// to train it.
function generateTrainingData() {
   console.log("Processing price history and generating training data...");

   var trainingData = [];

   // Scan backwards over weeks, starting from a week before the week that the
   // date of interest is in.
   for (var i = priceHistory.length-1-13; i >= 8; i-=7) {
      console.log("Week " + Math.round((i-1)/7) + ":");

      var thisWeekInput = [];
      var thisWeekOutput = [];

      // Generate inputs
      for (var j = 0; j < 7; j++) {
         var currentPrice = priceHistory[i+j][4];
         var previousPrice = priceHistory[i+j-1][4];
         var normalized = generateNormalized(currentPrice, previousPrice);
         console.log("  " + currentPrice + "    " + ((normalized-0.5)*100) + "%");
         thisWeekInput.push(normalized);
      }

      // Generate output
      var lastDayPrice = priceHistory[i+7][4];
      var secondToLastDayPrice = priceHistory[i+6][4];
      var normalized = generateNormalized(lastDayPrice, secondToLastDayPrice);
      console.log("  " + lastDayPrice + "    " + ((normalized-0.5)*100) + "%");
      thisWeekOutput.push(normalized);

      // Combine into a training data object
      var thisWeekData = {
         input: thisWeekInput,
         output: thisWeekOutput
      };
      trainingData.push(thisWeekData);
      //console.log(thisWeekData);
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

// Tests the neural network with the given inputs and writes to the console a
// comparison of the predicted output and the actual output.
function testNeuralNetwork(net, inputs, expectedOutput) {
   var output = net.run(inputs);
   var logString = "Actual: " + output;
   logString += "    Expected: " + expectedOutput;
   logString += "    Diff: " + (output-expectedOutput);
   if (output>=0.5 && expectedOutput<0.5 || output<0.5 && expectedOutput>=0.5) {
      logString += "    !! Direction Error !!";
   }
   console.log(logString);
}

// Uses the neural network and the given inputs to make a prediction, which is
// displayed in the console as a percentage.
function makePrediction(net, inputs) {
   var output = net.run(inputs);
   var prediction = output-0.5;
   console.log("\nPredicted change: " + (prediction*100).toFixed(3) + "%");
}
