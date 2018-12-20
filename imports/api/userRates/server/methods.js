import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { UserRates } from '../userRates.js';

Meteor.methods({
  'userRates.update'(currency = 'USD', activeStartingDate, rate = 0.05, _id = null) {
    if (!this.userId) {
      return false;
    }
    if (!activeStartingDate) {
      activeStartingDate = moment("2000-01-01").toDate();
    }
    check(currency, String);
    check(activeStartingDate, Date);
    check(rate, Number);
    if (_id) {
      check(_id, String);
    }

    const rateToUpdate = UserRates.findOne({userId: this.userId, _id});
    if (rateToUpdate) {
      if (currency != rateToUpdate.currency) {
        throw "userRates.update: Specified Currency value is not the same as the one of the UserRate that is being updated";
      }
      return UserRates.update(_id, {
        $set: {
          activeStartingDate: rateToUpdate.activeStartingDate,
          rate,
        }
      });
    } else {
      console.log({activeStartingDate});
      return UserRates.insert({
        userId: this.userId,
        currency,
        activeStartingDate,
        rate,
      });
    }
    // console.log({userRates: UserRates.find(query).fetch()});
  },

  'userRates.remove'(_id) {
    if (!this.userId) {
      return false;
    }
    check(_id, String);
    //// TODO: Check if this action should be permitted based on extraIncome
    return UserRates.remove({_id, userId: this.userId});
  },

});
