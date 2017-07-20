var express = require('express');
var app = express();
var port = process.env.PORT || 8080;

var router = express.Router();

app.get("/", function(req, res) {
   res.json({ message: "good" });
})


app.use("/api", router);

router.route('/prediction').get(function(req, res) {
   var dateString = req.query.date;
   
   //res.json({prediction: -0.23 });
});

app.listen(port);
console.log("Server started. Listening on port " + port + ".");
