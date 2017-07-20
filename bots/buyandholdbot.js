exports.makeDecision = function(priceHistoryDocs, currentDateTime, currentDay) {
   // If first day, buy as much ETH as possible
   if (currentDay == 1) {
      return 1;
   }

   // Otherwise, do nothing
   return 0;
}
