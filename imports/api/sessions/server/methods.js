import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Sessions } from '../sessions.js';
import { DataPoints } from '../../datapoints/datapoints.js';
import { UserProfiles } from '../../userprofiles/userprofiles.js';

Meteor.methods({
  'sessions.insert'(username, startTime, endTime) {
    check(username, String);
    check(startTime, Date);
    check(endTime, Date);
    if (!this.userId) {
      return false;
    }

    return Sessions.insert({
      userId: this.userId,
      username,
      startTime,
      endTime,
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
      username: UserProfiles.getCurrentUsername(this.userId),
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
      return Math.floor( _median( _.map(dataPoints, (item) => item[attr] ) ) )
    }

    const session = Sessions.findOne(_id, {fields: {isHistorical: 1}});
    if (session.isHistorical) {
      console.log("Trying to summarize a historical record. Aborting.");
      return null;
    };

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
      properties.deltaTokens      += dataPoint.deltaTokens;
      properties.deltaFollowers   += dataPoint.deltaFollowers;
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
  },

  'sessions.insertExtraIncome'(sessionId, currency, value) {
    if (!this.userId) {
      return false;
    }
    check(sessionId, String);
    check(currency, String);
    check(value, Number);

    const session = Sessions.findOne(sessionId, {
      fields: { extraIncome: 1 },
    });
    if (!session) {
      throw "No such session";
    }

    const extraIncomeInstance = {
      currency,
      value
    };

    if (!session.extraIncome) {
      return Sessions.update(sessionId, {
        $set: {
          extraIncome: [ extraIncomeInstance ]
        }
      });
    } else {
      return Sessions.update(sessionId, {
        $push: {
          extraIncome: extraIncomeInstance
        }
      });
    }
  },

  'sessions.deleteExtraIncome'(sessionId, currency, value) {
    if (!this.userId) {
      return false;
    }
    check(sessionId, String);
    check(currency, String);
    check(value, Number);

    return Sessions.update(sessionId, {
      $pull: {
        extraIncome: {
          currency,
          value
        }
      }
    });
  },

  'sessions.insertHistorical'(startTime, endTime, deltaTokens, note) {
    check(startTime, Date);
    check(endTime, Date);
    check(deltaTokens, Number);
    check(note, String);
    if (!this.userId) {
      return false;
    }

    // TODO: how to insert while tracking is already on?

    const username = UserProfiles.getCurrentUsername(this.userId);

    const sessionId = Sessions.insert({
      isHistorical: true,
      userId: this.userId,
      username,
      startTime,
      endTime,
      deltaTokens,
      note,
    });

    DataPoints.insert({
      userId: this.userId,
      sessionId,
      username,
      startTime,
      endTime,
      deltaTokens,
    });

    return sessionId;

  },
});
