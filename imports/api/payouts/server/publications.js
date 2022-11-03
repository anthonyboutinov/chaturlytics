import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
// import { DataPoints } from '../../dataonts/datapoints.js';
import { UserProfiles } from '../../userprofiles/userprofiles.js';
import { Payouts } from '../payouts.js';

Meteor.publish('payouts.recent', function (limit = 24) {
  if (!this.userId) {
    return this.ready();
  }

  // Meteor._sleepForMs(1000);
  return Payouts.find({
    userId: this.userId,
    username: UserProfiles.getCurrentUsername(this.userId),
  }, {
    sort: {date: -1},
    limit
  });
});
