import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Sessions } from '../sessions.js';


Meteor.publish('sessions.all', function () {
  if (!this.userId) {
    return this.ready();
  }

  // return this.ready();

  // Meteor._sleepForMs(2000);
  return Sessions.find( { userId: this.userId } );
});

Meteor.publish('sessions.forDates', function (startTime, endTime) {
  if (!this.userId) {
    return this.ready();
  }

  check(startTime, Date);
  check(endTime, Date);

  console.log({startTime, endTime});

  Meteor._sleepForMs(2000);
  return Sessions.find(
    {
      userId: this.userId,
      startTime: { $gte: startTime },
      $or: [
        endTime : null,
        endTime : { $lte: endTime },
      ]
    }
  );
});


Meteor.publish('sessions.last', function() {
  if (!this.userId) {
    return this.ready();
  }

  Meteor._sleepForMs(2000);
  return Sessions.find({userId: this.userId}, {
    orderBy: {endTime: -1},
    limit: 1
  });
});
