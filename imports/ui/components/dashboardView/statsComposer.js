import { UserRates } from '/imports/api/userRates/userRates.js';

/*
  Public stuff:
    constructor (_,_)
    - (dynamically added properties)

  The rest is private.
*/
class StatsComposer {
  constructor(dataPointsInRange, sessionsInRange) {
    this.computeDeltaFollowers(dataPointsInRange);
    this.computeDeltaIncome(dataPointsInRange, sessionsInRange);
    return this;
  };

  computeDeltaFollowers(dataPointsInRange) {
    const deltaFollowers = dataPointsInRange.reduce((sum, dataPoint) => sum + (dataPoint.deltaFollowers ? dataPoint.deltaFollowers : 0), 0);
    this.deltaFollowers = {
      value: deltaFollowers,
      sign: deltaFollowers > 0 ? "+" : deltaFollowers < 0 ? "-" : ""
    };
  };

  computeDeltaIncome(dataPointsInRange, sessionsInRange) {
    const userRates = UserRates.find({}, {
      sort: {activeStartingDate: -1}
    }).fetch();

    this.deltaIncome = {
      tokens: dataPointsInRange.reduce((sum, dataPoint) => sum + dataPoint.deltaTokens, 0),
      tokensToCurrency: dataPointsInRange.reduce((sum, dataPoint) => sum + UserRates.dataPointsTokensToCurrency(dataPoint, userRates), 0),
      extra: UserRates.sumExtraIncomeAndTokens(sessionsInRange, userRates).sum
    };
    this.deltaIncome.totalInCurrency = this.deltaIncome.tokensToCurrency + this.deltaIncome.extra;
  };
}

export {StatsComposer};
