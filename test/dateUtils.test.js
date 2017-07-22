var dateUtils = require("../utils/dateUtils.js");

describe("dateUtils.addDays", function() {
   it("should add the given number of days to the given date", function() {
      var date = new Date(1500336000000);
      var date2 = new Date(1500508800000);
      expect(dateUtils.addDays(date, 2).getTime()).toBe(date2.getTime());
   });
});
