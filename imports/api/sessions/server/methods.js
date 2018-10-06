import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Sessions } from '../sessions.js';
import { DataPoints } from '../../datapoints/datapoints.js';

Meteor.methods({
  'sessions.insert'(startTime, endTime) {
    check(startTime, Date);
    check(endTime, Date);
    if (!this.userId) {
      return false;
    }

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

  'sessions.summarize'(_id) {

    function _median(values) {
      values.sort((a, b) => a - b);
      let lowMiddle = Math.floor((values.length - 1) / 2);
      let highMiddle = Math.ceil((values.length - 1) / 2);
      let median = (values[lowMiddle] + values[highMiddle]) / 2;
      return median;
    }

    function _medianFromDataPointArrtibute(dataPoints, attr) {
      return Math.floor(
        _median(
          _.map(dataPoints, (item) => { return item[attr]; })
        )
      )
    }

    const dataPoints = DataPoints.find({sessionId: _id}).fetch();
    let properties = {
      deltaTokens: 0,
      deltaVotesUp: 0,
      deltaVotesDown: 0,
      deltaFollowers: 0,
      numViewers:           _medianFromDataPointArrtibute(dataPoints, 'numViewers'),
      numRegisteredViewers: _medianFromDataPointArrtibute(dataPoints, 'numRegisteredViewers'),
      numTokenedViewers:    _medianFromDataPointArrtibute(dataPoints, 'numTokenedViewers'),
    };
    let isOneOnOne = true;

    _.each(dataPoints, (dataPoint) => {
      properties.deltaTokens += dataPoint.deltaTokens;
      properties.deltaFollowers += dataPoint.deltaFollowers;
      properties.deltaVotesUp     += dataPoint.deltaVotesUp;
      properties.deltaVotesDown   += dataPoint.deltaVotesDown;
      if (dataPoint.broadcastHasDropped) {
        properties.broadcastHasDropped = true;
      }
      if (isOneOnOne && dataPoint.numViewers > 1) {
        isOneOnOne = false;
      }
    });

    if (isOneOnOne) {
      properties.isOneOnOne = true;
    }

    console.log("Session "+_id+" summarized with properties:", properties);
    return Sessions.update(_id, {
      $set: properties
    });
  },

  'sessions.setNote'(sessionId, note) {
    if (!this.userId) {
      return false;
    }
    check(sessionId, String);
    check(note, String);

    return Sessions.update(sessionId, {
      $set: {note}
    });
  }
});
