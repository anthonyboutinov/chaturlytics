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
