import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { UserRates } from '../userRates.js';

Meteor.publish('userRates.all', function () {
  if (!this.userId) {
    return this.ready();
  }
  Meteor._sleepForMs(1000);
  return UserRates.find( { userId: this.userId } );
});

Meteor.publish('userRates.latest', function () {
  if (!this.userId) {
    return this.ready();
  }
  Meteor._sleepForMs(1000);
  return UserRates.find( { userId: this.userId }, {
    sort: {activeStartingDate: -1},
    limit: 1
  } );
});
