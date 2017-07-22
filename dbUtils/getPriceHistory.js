var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/cryptopredictor';

// Queries the database for the price history data stored, then calls the callback
// function with the price history data documents as the parameter.
exports.run = function(callback) {
   MongoClient.connect(url, function(err, db) {
      console.log("Error? " + err);
      var collection = db.collection('priceHistory');
      collection.find({}).toArray(function(err, documents) {
         console.log("Error? " + err);
         console.log("Price history (" + documents.length + "):");
         console.log(documents);
         db.close();
         callback(documents);
      });
   });

}
