# cryptopredictor
Cryptocurrency price prediction tools

## Usage
### Simple usage
You can run the simple priceHistory script, which asks you for a date The script will make a prediction on how the price of ETH will change in that day. It queries the price history data from GDAX every time you run the script, so it does not require MongoDB to be set up.
```
node priceHistory.js
```

### Setting up a MongoDB database
For the more advanced scripts, a MongoDB database to store price history data should be created.
 * It should be configured to run on the same host as you plan to run the Node.js scripts on and should be on port 27017.
 * It should contain a database named `cryptopredictor` that contains a collection `priceHistory`.

If you choose a different configuration, you can adjust the MongoDB database configuration used by editing the scripts in /dbUtils.

You need to then run a script that queries GDAX for the price history data and adds the price history data to MongoDB:
```
node -e 'require("./dbUtils/insertNewPriceHistory.js").run()'
```

### Running a simulation of the ETH trading bots in /bots
Simply run testTradingBot.js with the MongoDB server running.
```
node testTradingBot
```

### Running a server that can be queried for an ETH price prediction:
 * Run both `priceHistoryUpdateService.js` and `server.js`.
 * Query your server with a GET request to `http://[ip address]:8080/api/prediction` with a query parameter `date`.
   * The date value format is YYYY-MM-DD.
   * Example: `http://localhost:8080/api/prediction?date=2017-07-02`
