var MongoClient = require('mongodb').MongoClient;
var request = require('request');

var url = 'mongodb://localhost:27017/cryptopredictor';

var priceHistory = [];

MongoClient.connect(url, function(err, db) {
   console.log("Connected to MongoDB server.");

   addToPriceHistory(         // The GDAX API limits the # of results to 200, so we need to use two API requests
      '2016-07-01T12:00:00',
      '2017-01-05T12:00:00',
      addToPriceHistory.bind(this,
         '2017-01-06T12:00:00',
         '2017-11-07T12:00:00', // Get the price history up to the user-provided date
         function() {
            // console.log(priceHistory);

            var documents = [];
            for (var i = 0; i < priceHistory.length; i++) {
               var doc = {
                  time: priceHistory[i][0],
                  low: priceHistory[i][1],
                  high: priceHistory[i][2],
                  open: priceHistory[i][3],
                  close: priceHistory[i][4],
                  volume: priceHistory[i][5]
               }
               documents.push(doc);
            }

            // console.log(documents);

            var collection = db.collection('priceHistory');
            collection.insertMany(documents, function(err, result) {
               console.log("Inserted price history into MongoDB (" + documents.length + " items).");
               db.close();
            });

         }
      )
   );

});


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
