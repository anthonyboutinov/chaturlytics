import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Payouts } from '../payouts.js';
import { DataPoints } from '../../datapoints/datapoints.js';
import { UserProfiles } from '../../userprofiles/userprofiles.js';

Meteor.methods({
  'payouts.insert'(username, date, tokens) {
    check(username, String);
    check(date, Date);
    check(tokens, Date);
    if (!this.userId) {
      return false;
    }

    return Payouts.insert({
      userId: this.userId,
      username,
      date,
      tokens,
    });
  },

  'payouts.remove'(_id) {
    if (!this.userId) {
      return false;
    }
    return Payouts.remove({_id, userId: this.userId});
  },

});
