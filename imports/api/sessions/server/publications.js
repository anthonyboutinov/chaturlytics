import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Sessions } from '../sessions.js';

Meteor.publish('sessions.forDates', function (startTime, endTime) {
  if (!this.userId) {
    return this.ready();
  }

  check(startTime, Date);
  check(endTime, Date);

  return Sessions.find(
    {
      userId: this.userId,
      startTime: { $gte: startTime },
      endTime : { $lte: endTime }
    }
  );
});
