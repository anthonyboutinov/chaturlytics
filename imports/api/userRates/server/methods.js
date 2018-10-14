import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { UserRates } from '../userRates.js';

Meteor.methods({
  'userRates.update'(currency = 'USD', activeStartingDate, rate = 0.05) {
    if (!this.userId) {
      return false;
    }
    if (!activeStartingDate) {
      activeStartingDate = moment("2000-01-01").toDate();
    }
    check(currency, String);
    check(activeStartingDate, Date);
    check(rate, Number);

    const query = {userId: this.userId};
    const currentOne = UserRates.findOne(query, {sort: {activeStartingDate : -1}, limit: 1});
    if (currentOne) {
      return UserRates.update(currentOne._id, {
        $set: {
          currency,
          activeStartingDate: currentOne.activeStartingDate,
          rate,
        }
      });
    } else {
      return UserRates.insert({
        userId: this.userId,
        currency,
        activeStartingDate,
        rate,
      });
    }
    // console.log({userRates: UserRates.find(query).fetch()});
  },

});
