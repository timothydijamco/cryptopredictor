var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/cryptopredictor';

exports.run = function(callback) {
   MongoClient.connect(url, function(err, db) {
      var collection = db.collection('priceHistory');
      collection.remove({}, function(err, result) {
         console.log("Error? " + err);
         console.log("Result: " + result);
      });
      db.close();
   });
}
