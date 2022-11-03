

class MetricsRowComposer {
  composition = {};

  _getDataPointsInRange(startDate, endDate, sessionsInRange) {
    // Note: This function is the most computationally expensive piece of code here

    const noSessionDataPoints = DataPoints.find({
      sessionId: null,
      startTime: {$exists: true},
      endTime: {
        $gte: startDate,
        $lte: endDate,
      },
    }).fetch();

    const sessionsDataPoints = DataPoints.find({
      sessionId: {$in: sessionsInRange.map(session => session._id)},
    }).fetch();

    return noSessionDataPoints.concat(sessionsDataPoints);
  }

  constructor(sessionsInRange, groupingDelegate, userRates, input) {

    const dataPointsInRange = _getDataPointsInRange(groupingDelegate.lowerMoment.toDate(), groupingDelegate.upperMoment.toDate(), sessionsInRange);

    const deltaTokensDuringSessions = dataPointsInRange.reduce((sum, dataPoint) => sum + (!_.isNull(dataPoint.sessionId) ? dataPoint.deltaTokens : 0), 0);
    const deltaTokens = dataPointsInRange.reduce((sum, dataPoint) => sum + dataPoint.deltaTokens, 0);
    const deltaFollowers = dataPointsInRange.reduce((sum, dataPoint) => sum + (dataPoint.deltaFollowers ? dataPoint.deltaFollowers : 0), 0);
    const endTime = moment(groupingDelegate.upperMoment).subtract(1, 'second');

    _adjustMinMax(deltaTokens, coloration.tokens);

    // pre-fetch userRates so that sumExtraIncomeAndTokens doesn't have to do that over and over
    const userRates = UserRates.find({ userId: Meteor.user()._id }, {
      sort: {activeStartingDate: -1}
    }).fetch();

    // let totalDeltaPrimaryCurrency = Math.round(deltaTokens * conversionMultiplier); // FIXME: replace conversionMultiplier with dynamic function
    let totalDeltaPrimaryCurrency = dataPointsInRange.reduce((sum, dataPoint) => sum + UserRates.dataPointsTokensToCurrency(dataPoint, userRates), 0);
    _adjustMinMax(totalDeltaPrimaryCurrency, coloration.totalDeltaPrimaryCurrency);







    this.startTime(input.lowerMoment);
    this.endTime(endTime);
    this.numBroadcasts(sessionsInRange);
    this.timeOnline(sessionsInRange);




    const sumExtraIncomeAndTokens = UserRates.sumExtraIncomeAndTokens(sessionsInRange, userRates);
    const extraCurrency = sumExtraIncomeAndTokens.sum;
    const extraCurrencyHourlyRated = sumExtraIncomeAndTokens.hourlyRatedSum | 0;

    const avgTokens = Math.round(deltaTokensDuringSessions / this._timeOnlineAsHours);
    _adjustMinMax(avgTokens, coloration.avgTokens);

    const avgPrimaryCurrency = Math.round((deltaTokensDuringSessions * conversionMultiplier + extraCurrencyHourlyRated) / this._timeOnlineAsHours);  // FIXME: replace conversionMultiplier with dynamic function
    _adjustMinMax(avgPrimaryCurrency, coloration.avgPrimaryCurrency);

    if (extraCurrency !== 0) {
      totalDeltaPrimaryCurrency += extraCurrency;
      _adjustMinMax(totalDeltaPrimaryCurrency, coloration.totalDeltaPrimaryCurrency);
    }


  }

  startTime(lowerMoment) {
    this.composition.startTime = lowerMoment;
  }

  endTime(endTime) {
    this.composition.endTime = endTime;
  }

  numBroadcasts(sessionsInRange) {
    this.composition.numBroadcasts = sessionsInRange ? sessionsInRange.length : '–';
  }

  timeOnline(sessionsInRange) {
    const totalMinutesOnline = sessionsInRange.reduce(
      (sum, session) =>
        sum + moment(session.endTime).diff(moment(session.startTime), 'minutes'),
      0);
    const durationInMinutes = moment.duration(totalMinutesOnline, 'minutes');
    this._timeOnlineAsHours = durationInMinutes.as('hours', true);
    this.composition.timeOnline = timeOnlineAsMinutes.format("h [h] m [m]");
  }

  deltaTokens() {
    this.composition.deltaTokens = deltaTokens;
  }

  deltaTokensToPrimaryCurrency() {
    this.composition.deltaTokensToPrimaryCurrency = Math.round(this.composition.deltaTokens * conversionMultiplier); // FIXME: replace conversionMultiplier with dynamic function
  }

  deltaTokensToUSD() {
    this.composition.deltaTokensToUSD = this.composition.deltaTokens * 0.05;
  }

  deltaFollowers() {
    this.composition.deltaFollowers = deltaFollowers;
  }

  avgTokens() {
    this.composition.avgTokens = avgTokens;
  }

  avgTokensToPrimaryCurrency() {
    this.composition.avgTokensToPrimaryCurrency: Math.round(this.composition.avgTokens * conversionMultiplier); // FIXME: replace conversionMultiplier with dynamic function
  }

  avgTokens() {
    this.composition.avgTokensToUSD = avgTokens * 0.05;
  }

  sessions(sessionsInRange) {
    this.composition.sessions = sessionsInRange;
  }

  totalDeltaPrimaryCurrency() {
    this.composition.totalDeltaPrimaryCurrency = totalDeltaPrimaryCurrency;
  }

  avgPrimaryCurrency() {
    this.composition.avgPrimaryCurrency = avgPrimaryCurrency;
  }

  extraCurrency() {
    this.composition.extraCurrency = extraCurrency ? extraCurrency : '–';
  }




// //
// startTime: groupingDelegate.lowerMoment,
// endTime,
// numBroadcasts: sessionsInRange ? sessionsInRange.length : '–',
// timeOnline: timeOnline.format("h [h] m [m]"),
// deltaTokens,
// deltaTokensToPrimaryCurrency: Math.round(deltaTokens * conversionMultiplier), // FIXME: replace conversionMultiplier with dynamic function
// deltaTokensToUSD: deltaTokens * 0.05,
// // deltaTokensDuringSessions, // TODO: add to interface
// deltaFollowers,
// avgTokens,
// avgTokensToPrimaryCurrency: Math.round(avgTokens * conversionMultiplier), // FIXME: replace conversionMultiplier with dynamic function
// avgTokensToUSD: avgTokens * 0.05,
// sessions: sessionsInRange,
// // notes: sessionsInRange.reduce((sum, session) =>
// //   session.note ? sum + session.note + " ❡ " : sum,
// //   ''),
// totalDeltaPrimaryCurrency,
// avgPrimaryCurrency,
// extraCurrency: extraCurrency ? extraCurrency : '–',
// //

}
