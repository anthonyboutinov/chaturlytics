import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DataPoints } from '../datapoints.js';

Meteor.publish('dataPoints.all', function () {
  if (!this.userId) {
    return this.ready();
  }

  Meteor._sleepForMs(2000);
  return DataPoints.find({userId: this.userId});
});


Meteor.publish('dataPoints.forDates', function (startTime, endTime) {
  if (!this.userId) {
    return this.ready();
  }

  check(startTime, Date);
  check(endTime, Date);

  Meteor._sleepForMs(2000);
  return DataPoints.find({
    userId: this.userId,
    startTime: { $gte: startTime },
    endTime : { $lte: endTime }
  });
});

Meteor.publish('dataPoints.forSession', function (sessionId) {
  if (!this.userId) {
    return this.ready();
  }
  check(sessionId, String);

  Meteor._sleepForMs(2000);
  const firstDataPointForTheSession = DataPoints.findOne({
    userId: this.userId,
    sessionId
  }, {
    orderBy: {endTime: -1}
  });
  console.log({firstDataPointForTheSession});
  return DataPoints.find({
    userId: this.userId,
    $or: [
      {sessionId},
      {endTime: firstDataPointForTheSession.startTime}
    ]
  });
});
