import { Meteor } from 'meteor/meteor';
// import { check } from 'meteor/check';

Meteor.publish('userData', function () {
  if (this.userId) {
    return Meteor.users.find({ _id: this.userId }, {
      fields: {
        currencies: 1,
        primaryCurrency: 1,
        displayOption_tokensPerHour: 1,
        displayOption_tokensPerHourExtraIncome: 1,
      }
    });
  } else {
    this.ready();
  }
});
