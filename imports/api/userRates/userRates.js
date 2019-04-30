import { Mongo } from 'meteor/mongo';
import { Currencies } from '/imports/api/currencies/currencies.js';

export const UserRates = new Mongo.Collection('userRates');

const nullObject = {
  sum: null,
  currency: null
};

const zeroObject = {
  sum: 0,
  currency: null
};

function _latestUserRate(userRates) {
  return userRates[0];
}

UserRates.sumExtraIncomeAndTokens = function(sessions, userRates = null) {
  if (!sessions.length) return nullObject;

  // [{currency, value, date, isHourlyRated}]
  let extraIncome = [];
  sessions.map((session) => {
    if (session.extraIncome && session.extraIncome.length) {
      extraIncome = extraIncome.concat(session.extraIncome.map(
        (xiInstance) => {
          return {
            date: session.endTime,
            currency: xiInstance.currency,
            value: xiInstance.value,
            isHourlyRated: xiInstance.isHourlyRated,
          }
        }
      ));
    }
  });

  if (!extraIncome.length) return zeroObject;

  // userRates must be sorted in reverse order
  function _getCurrencyRate(extraIncomeInstance, userRates) {
    const date = extraIncomeInstance.date;
    const _userRate = _.find(userRates, (userRate) =>
      userRate.currency === extraIncomeInstance.currency && userRate.activeStartingDate <= date);
    return _userRate.rate;
  }

  userRates = userRates || UserRates.find({ userId: sessions[0].userId }, {
    sort: {activeStartingDate: -1}
  }).fetch();

  // console.log({userRates, extraIncome});

  if (userRates.length < 1) return nullObject;

  const extraIncomeSameCurrency    = _.filter(extraIncome, (item) => item.currency === _latestUserRate(userRates).currency);
  const extraIncomeOtherCurrencies = _.filter(extraIncome, (item) => item.currency !== _latestUserRate(userRates).currency);

  // RETURN (t + sum (vx / rx)) * rl,
  // where t is tokens,
  // vx is extraIncome.value[x],
  // rx is rateForThatInstance,
  // and rl is the latest currency rate for the user
  const sumOtherCurrencies = extraIncomeOtherCurrencies.reduce((sum, item) =>                      sum + item.value / _getCurrencyRate(item, userRates),       0) * _latestUserRate(userRates).rate;
  let       hourlyRatedSum = extraIncomeOtherCurrencies.reduce((sum, item) => item.isHourlyRated ? sum + item.value / _getCurrencyRate(item, userRates) : sum, 0) * _latestUserRate(userRates).rate;

  const sumSameCurrency = extraIncomeSameCurrency.reduce((sum, item) =>                      sum + item.value,       0);
  hourlyRatedSum        = extraIncomeSameCurrency.reduce((sum, item) => item.isHourlyRated ? sum + item.value : sum, hourlyRatedSum);

  // console.log({extraIncomeSameCurrency, extraIncomeOtherCurrencies, firstUserRate: _latestUserRate(userRates), sumOtherCurrencies, sumSameCurrency});

  return {
    sum: sumSameCurrency + sumOtherCurrencies,
    hourlyRatedSum,
    currency: _latestUserRate(userRates).currency,
  };
};

UserRates.dataPointsTokensToCurrency = function(dataPoint, userRates = null) {
  userRates = userRates || UserRates.find({ userId: dataPoint.userId }, {
    sort: {activeStartingDate: -1}
  }).fetch();

  if (userRates.length < 1) return null;

  // find time-specific userRate for the dataPoint in any currency.
  // if it's the same currency as the current one, use the old currency rate
  // otherwise convert that currency to the current one and use that instead.

  // FIXME: should not be the only last one, but last of each different currency value
  const userRateDuringDataPointsTime = _.find(userRates, (userRate) => dataPoint.endTime >= userRate.activeStartingDate);

  let result;

  if (userRateDuringDataPointsTime.currency === _latestUserRate(userRates).currency) {
    result = dataPoint.deltaTokens * userRateDuringDataPointsTime.rate;
    // console.log({result, rate: userRateDuringDataPointsTime.rate, dpDate: dataPoint.endTime, rateDate: userRateDuringDataPointsTime.activeStartingDate});
  } else {
    // e.g., it was GPB 0.3, now it's RUB 4.
    // 1 TKN was worth GPB 0.3. Need to find out how much RUB that was.
    const fromCurrency = userRateDuringDataPointsTime.currency;
    const toCurrency = _latestUserRate(userRates).currency;
    result = dataPoint.deltaTokens * Currencies.conversionRate(fromCurrency, toCurrency, dataPoint.startTime);
  }
  return Math.round(result);
};
