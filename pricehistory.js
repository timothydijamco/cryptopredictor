var request = require('request');
var brain = require("brain.js");

request.get({
   url: 'https://api.gdax.com/products/ETH-USD/candles',
   qs: {
      start: '2017-01-06T11:00:00+00:00',
      end: '2017-07-01T11:00:00+00:00',
      granularity: '86400'
   }, headers: {
      'User-Agent': 'Crypto Predictor Node.js"'
   }
}, function(error, response, body) {
   var json = JSON.parse(body);
   json = json.reverse();

   var trainingData = [];
   for (var i = 1; i < json.length-7; i+=7) {
      console.log("Week " + (i-1)/7 + ":");

      var thisWeekInput = [];
      var thisWeekOutput = [];
      for (var j = 0; j < 6; j++) {
         var currentPrice = json[i+j][3];
         var previousPrice = json[i+j-1][3];
         var percentage = currentPrice/previousPrice;
         var normalized = percentage - 0.5;
         console.log(currentPrice + "    " + normalized + "    " + (percentage-1)*100 + "%");
         thisWeekInput.push(normalized);
      }

      var fridayPrice = json[i+7][3];
      var thursdayPrice = json[i+6][3];
      var percentage = fridayPrice/thursdayPrice;
      var normalized = percentage - 0.5;
      console.log(fridayPrice + "    " + normalized + "    " + (percentage-1)*100 + "%");
      thisWeekOutput.push(normalized);

      var thisWeekData = {
         input: thisWeekInput,
         output: thisWeekOutput
      };
      trainingData.push(thisWeekData);
      console.log(thisWeekData);
   }

   runBrain(trainingData);
});



function runBrain(trainingData) {
   var net = new brain.NeuralNetwork();

   net.train(trainingData, {
      errorThresh: 0.001,
      iterations: 250000,
      log: true,
      logPeriod: 10000,
      learningRate: 0.5
   });

   // Week 22
   var output1 = net.run(
      [
         0.5802273430250542,
         0.7174021976448692,
         0.5092905653720636,
         0.6575053162049578,
         0.47644453392389774,
         0.3806701030927835
     ]
   );  // Expected: [0.5306944808123126]
   console.log(output1);

   // Week 24
   var output2 = net.run(
      [
         0.5217486407099556,
         0.4312496177136216,
         0.41458128078817735,
         0.40836295737728456,
         0.6355892003004309,
         0.5976433320569499
      ]
   );  // Expected: [0.45589691073562033]
   console.log(output2);

   // Week 25
   var output3 = net.run(
      [
         0.45589691073562033,
         0.43961361282719724,
         0.5831559744603223,
         0.4697192982456141,
         0.47398415168071784,
         0.4891893899992569
      ]
   );  // Expected: [0.4069959775948273]
   console.log(output3);
}
