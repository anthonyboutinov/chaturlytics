import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

Meteor.methods({

  'users.setCurrencyDisplayToggle'(currency, value) {
    check(currency, String);
    check(value, Boolean);
    if (!this.userId) {
      return false;
    }

    let updateOptions;

    if (value) {
      updateOptions = {
        $push: {currencies: currency}
      };
    } else {
      updateOptions = {
        $pull: {currencies: currency}
      };
    }

    // if (value) {
    //   let set = { currencies: {} };
    //   set.currencies[currency] = true;
    //   updateOptions = { $set: set};
    // } else {
    //   updateOptions = { $unset: ['currencies.' + currency]};
    // }
    console.log({updateOptions});

    return Meteor.users.update(this.userId, updateOptions);
  },

});
