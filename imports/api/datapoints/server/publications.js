import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DataPoints } from '../datapoints.js';

Meteor.publish('dataPoints.all', function () {

  return DataPoints.find();
});


Meteor.publish('dataPoints.forDates', function (startTime, endTime) {
  if (!this.userId) {
    return this.ready();
  }

  check(startTime, Date);
  check(endTime, Date);

  return DataPoints.find(
    {
      userId: this.userId,
      startTime: { $gte: startTime },
      endTime : { $lte: endTime }
    }
  );
});
