import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

// function _updateOptions(name, value) {
//   let updateOptions;
//   if (value || value === 0) {
//     updateOptions = { $push: {} };
//     updateOptions.$push[name] = value;
//   } else {
//     updateOptions = { $pull: {} };
//     updateOptions.$pull[name] = value;
//   }
//   return updateOptions;
// }

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

  'users.setDisplayOption'(displayOptionName, value) {
    check(displayOptionName, String);
    if (!this.userId) {
      return false;
    }
    const set = { $set: {} };
    set.$set['displayOption_' + displayOptionName] = value;
    return Meteor.users.update(this.userId, set);
  },

});
