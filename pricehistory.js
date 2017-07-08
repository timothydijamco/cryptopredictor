var request = require('request');
var brain = require("brain.js");

var priceHistory = [];

addToPriceHistory(
   '2016-07-01T11:00:00+00:00',
   '2017-01-05T11:00:00+00:00',
   addToPriceHistory.bind(this,
      '2017-01-06T11:00:00+00:00',
      '2017-07-06T11:00:00+00:00',
      function() {
         var trainingData = generateTrainingData();

         var net = new brain.NeuralNetwork({
            hiddenLayers: [4]
         });

         net.train(trainingData, {
            errorThresh: 0.001,
            iterations: 250000,
            log: true,
            logPeriod: 10000,
            learningRate: 0.25
         });

         testNeuralNetwork(net, [
            0.5802273430250542,
            0.7174021976448692,
            0.5092905653720636,
            0.6575053162049578,
            0.47644453392389774,
            0.3806701030927835
        ], 0.5306944808123126);

        testNeuralNetwork(net, [
           0.5217486407099556,
           0.4312496177136216,
           0.41458128078817735,
           0.40836295737728456,
           0.6355892003004309,
           0.5976433320569499
        ], 0.45589691073562033);

        testNeuralNetwork(net, [
           0.494344957587182,
           0.5028436018957345,
           0.4924385633270322,
           0.5085714285714285,
           0.5103871576959396,
           0.502803738317757
        ], 0.5157116451016637);

        testNeuralNetwork(net, [
           0.494344957587182,
           0.5028436018957345,
           0.4924385633270322,
           0.5085714285714285,
           0.5103871576959396,
           0.502803738317757
        ], 0.4069959775948273);

        testNeuralNetwork(net, [
           0.5104166666666667,
           0.4890034364261169,
           0.47289784572619875,
           0.5042857142857142,
           0.3648648648648648,
           0.544407894736842
        ], 0.4839743589743589);
      }
   )
);

function addToPriceHistory(start, end, callback) {
   console.log("addToPriceHistory(" + start + ", " + end + ", ...)");
   request.get({
      url: 'https://api.gdax.com/products/ETH-USD/candles',
      qs: {
         start: start,
         end: end,
         granularity: '86400'
      }, headers: {
         'User-Agent': 'Crypto Predictor Node.js"'
      }
   }, function(error, response, body) {
      console.log("  response received.");
      var json = JSON.parse(body);
      json = json.reverse();
      console.log("  adding " + json.length + " items to priceHistory...");
      priceHistory = priceHistory.concat(json);
      console.log("  priceHistory length is now: " + priceHistory.length);
      console.log("  calling callback function...");
      callback();
   });
}

function generateTrainingData() {
   console.log("generateTrainingData()");
   console.log("  priceHistory length: " + priceHistory.length);
   var trainingData = [];
   for (var i = 1; i < priceHistory.length-7; i+=7) {
      //console.log("Week " + (i-1)/7 + ":");

      var thisWeekInput = [];
      var thisWeekOutput = [];
      for (var j = 0; j < 6; j++) {
         var currentPrice = priceHistory[i+j][3];
         var previousPrice = priceHistory[i+j-1][3];
         var normalized = generateNormalizedInput(currentPrice, previousPrice);
         //console.log(currentPrice + "    " + normalized);
         thisWeekInput.push(normalized);
      }

      var fridayPrice = priceHistory[i+7][3];
      var thursdayPrice = priceHistory[i+6][3];
      var normalized = generateNormalizedInput(fridayPrice, thursdayPrice);
      //console.log(fridayPrice + "    " + normalized);
      thisWeekOutput.push(normalized);

      var thisWeekData = {
         input: thisWeekInput,
         output: thisWeekOutput
      };
      trainingData.push(thisWeekData);
      //console.log(thisWeekData);
   }
   return trainingData;
}

function generateNormalizedInput(currentPrice, previousPrice) {
   var percentage = currentPrice/previousPrice;
   var normalized = percentage - 0.5;
   return normalized;
}

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
