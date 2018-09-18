import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Sessions } from '../sessions.js';

Meteor.methods({
  'sessions.insert'(startTime, endTime) {
    check(startTime, Date);
    check(endTime, Date);

    return Sessions.insert({
      userId: this.userId,
      startTime: startTime,
      endTime: endTime,
    });
  },

  'sessions.remove'(_id) {
    if (!this.userId) {
      return false;
    }
    return Sessions.remove({_id, userId: this.userId});
  },

  'sessions.countInDateRange'() {
    if (!this.userId) {
      return false;
    }
    const userDashboardSessionsCountDateRange = 30; //days
    return Sessions.find({
      userId: this.userId,
      startTime: {$gte: moment().subtract(userDashboardSessionsCountDateRange, 'days').toDate()}
    }).count();
  },
});
