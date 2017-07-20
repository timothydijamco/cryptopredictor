var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/cryptopredictor';

exports.run = function() {
   MongoClient.connect(url, function(err, db) {
      console.log("Error? " + err);
      if (!err) {
         console.log("Successfully connected to MongoDB server.");
      }
      db.close();
   });
}
