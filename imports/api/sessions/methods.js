import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Sessions } from './sessions.js';

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
});
