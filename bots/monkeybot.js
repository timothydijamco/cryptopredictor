exports.makeDecision = function(priceHistoryDocs, currentDateTime, currentDay) {
   // If first day, spend half of USD to buy ETH. This way, this bot starts
   // with half USD and half ETH.
   if (currentDay == 1) {
      return 0.5;
   }

   // Otherwise, make a random buy/sell decision
   return (Math.random(0, 1) * 2) - 1; // Random number from -1 to 1
}
