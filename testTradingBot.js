var MongoClient = require('mongodb').MongoClient;
var request = require('request');
var brain = require("brain.js");
var trainer = require("./trainPriceHistoryNN.js");

var url = 'mongodb://localhost:27017/cryptopredictor';

MongoClient.connect(url, function(err, db) {
   var collection = db.collection('priceHistory');
   collection.find({}).toArray(function(err, priceHistoryDocs) {

      trainer.trainNNFromPriceHistory(priceHistoryDocs);

      db.close();
   });
});
