import { Meteor } from 'meteor/meteor';
// import { check } from 'meteor/check';

Meteor.publish('userData', function () {
  if (this.userId) {
    return Meteor.users.find({ _id: this.userId }, {
      fields: {
        currencies: 1,
        primaryCurrency: 1
      }
    });
  } else {
    this.ready();
  }
});
