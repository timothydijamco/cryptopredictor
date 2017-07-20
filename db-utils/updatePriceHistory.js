var MongoClient = require('mongodb').MongoClient;
var request = require('request');

var url = 'mongodb://localhost:27017/cryptopredictor';

var priceHistory = [];

var startDate = new Date(1467331200000); // July 1, 2016 00:00:00 GMT
var endDate = new Date(1500076800000); // July 15, 2017 00:00:00 GMT
addToPriceHistory(
   startDate,
   endDate,
   432000000, // 5 days in milliseconds
   savePriceHistory
)

// Functions
function addToPriceHistory(current, end, incrementMs, doneCallback) {
   var queryStartMs = current.getTime();
   var queryEndMs = current.getTime() + incrementMs;

   if (queryStartMs > end.getTime()) { // Everything in this query would be outside of the desired range
      doneCallback();
      return;
   }

   if (queryEndMs > end.getTime()) { // Part of this query would be outside of the desired range
      queryEndMs = end.getTime();
   }

   queryStartDate = new Date(queryStartMs);
   queryEndDate = new Date(queryEndMs);

   queryStartISO = queryStartDate.toISOString();
   queryEndISO = queryEndDate.toISOString();
   console.log("Querying GDAX API for price history from " + queryStartISO + " to " + queryEndISO + "...");
   request.get({
      url: 'https://api.gdax.com/products/ETH-USD/candles',
      qs: {
         start: queryStartISO,
         end: queryEndISO,
         granularity: '3600'
      }, headers: {
         'User-Agent': 'cryptopredictor node.js"'
      }
   }, function(error, response, body) {
      console.log("  Response received.");
      if (error) {
         console.log("  Error! " + error);
      }
      var json = JSON.parse(body);
      json = json.reverse(); // Reverse the array so that older data is first
      priceHistory = priceHistory.concat(json);

      var nextCurrent = new Date(current.getTime() + incrementMs);
      setTimeout(
         function() {
            addToPriceHistory(nextCurrent, end, incrementMs, doneCallback);
         },
         1250
      );
   });
}

function savePriceHistory() {

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

   MongoClient.connect(url, function(err, db) {
      console.log("Connected to MongoDB server.");

      var collection = db.collection('priceHistory');
      collection.insertMany(documents, function(err, result) {
         console.log("Inserted price history into MongoDB (" + documents.length + " items).");
         db.close();
      });
   });

}
