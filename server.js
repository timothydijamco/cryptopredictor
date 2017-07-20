var express = require('express');
var app = express();
var getPriceHistory = require("./db-utils/getPriceHistory.js");
var priceHistoryPredictor = require("./predictors/priceHistoryPredictor.js");

var port = process.env.PORT || 8080;
var router = express.Router();
app.use("/api", router);

// Endpoint: /api/prediction
router.route('/prediction').get(function(req, res) {
   var dateString = req.query.date;

   var prediction;

   // Get the price history from the database, make a prediction, and return it
   getPriceHistory.run(function(priceHistoryDocs) {
      prediction = priceHistoryPredictor.run(
         priceHistoryDocs,
         new Date(dateString)
      );
      if (prediction) {
         res.json({ prediction: prediction });
      } else {
         res.json({ error: "Could not make prediction." });
      }
   });
});

app.listen(port);
console.log("Server started. Listening on port " + port + ".");
