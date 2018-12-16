import { Mongo } from 'meteor/mongo';

export const UserRates = new Mongo.Collection('userRates');

UserRates.sumExtraIncomeAndTokens = function(userId, sessions, tokens = 0) {

  // [{currency, value, date}]
  let extraIncome = [];
  sessions.map((session) => {
    if (session.extraIncome) {
      extraIncome = extraIncome.concat(session.extraIncome.map(
        (xiInstance) => {
          return {
            date: session.endTime,
            currency: xiInstance.currency,
            value: xiInstance.value,
          }
        }
      ));
    }
  });

  // userRates must be sorted in reverse order
  function _getCurrencyRate(extraIncomeInstance, userRates) {
    const date = extraIncomeInstance.date;
    const _userRate = _.find(userRates, (userRate) =>
      userRate.currency === extraIncomeInstance.currency && userRate.activeStartingDate <= date);
    return _userRate.rate;
  }

  function _latestRate(userRates) {
    return userRates[0].rate;
  }

  const userRates = UserRates.find({ userId }, {
    sort: {activeStartingDate: -1}
  }).fetch();

  // RETURN (t + sum (vx / rx)) * rl,
  // where t is tokens,
  // vx is extraIncome.value[x],
  // rx is rateForThatInstance,
  // and rl is the latest currency rate for the user
  const sum = extraIncome.reduce((sum, item) => sum + item.value / _getCurrencyRate(item, userRates), tokens ) * _latestRate(userRates);
  return {
    sum,
    currency: userRates[0].currency,
  };
};
