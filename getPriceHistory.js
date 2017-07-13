var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/cryptopredictor';

MongoClient.connect(url, function(err, db) {
   var collection = db.collection('priceHistory');
   collection.find({}).toArray(function(err, documents) {
      console.log("Price history (" + documents.length + "):");
      console.log(documents);
      db.close();
   });
});
