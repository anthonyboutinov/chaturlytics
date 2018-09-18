import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DataPoints } from '../datapoints.js';
import { RawDataPointSchema } from './rawSchema.js';
import { Sessions } from '../../sessions/sessions.js';
import { UserProfiles } from '../../userprofiles/userprofiles.js';
import { HTTP } from 'meteor/http';

Date.prototype.subMinutes = function(m){
    this.setMinutes(this.getMinutes()-m);
    return this;
}

function _correctTimezone(date) {
  const newDate = new Date(date.getTime());
  newDate.subMinutes(-3*60); // add 3 hours to compensate for time zone
  return newDate;
}

Meteor.methods({
  'dataPoints.remove'(_id) {
    if (!this.userId) {
      return false;
    }
    const result = DataPoints.remove({_id: _id, userId: this.userId});
    console.log({result});
    return result;
  },

  'dataPoints.getDataPointsForAll'() {
    const now = new Date();
    UserProfiles.find({
      isActive: true,
      $or: [
        {nextCheck: {$lte: now}},
        {nextCheck: null}
      ]
    }, {
      fields: {url: 1, username: 1},
      reactive: false,
    }).forEach(function(item) {
      console.log("Calling dataPoints.getDataPointFromChaturbate for " + item.username);
      Meteor.call('dataPoints.getDataPointFromChaturbate', item.url, item.username);
    });
  },

  'dataPoints.getDataPointFromChaturbate'(url, username) {
    check(url, String);
    check(username, String);

    HTTP.get(url, null, (error, result) => {
      if (!error) {
        console.log({resultContent: result.content, username});
        Meteor.call('dataPoints.insertIndepenentlyFromRawData', result.content, username);
      } else {
        console.log('dataPoints.getDataPointFromChaturbate', {error, url, username});
        // if (error.code === 'ECONNRESET') {
        //   throw "ECONNRESET";
        // }
      }
    });
  },

  // 'dataPoints.correctTimezone'() {
  //   const session  = Sessions.findOne({});
  //   DataPoints.update({numViewers:46}, {
  //     $set: {
  //       endTime:session.endTime,
  //       sessionId: session._id
  //     }
  //   });
    // const lastDataPoint = DataPoints.findOne({numViewers: 46});
    // console.log({lastDataPoint});
    // const correctedEndTime = _correctTimezone(lastDataPoint.endTime);
    // console.log({correctedEndTime});
    // const updated = DataPoints.update({numViewers:46}, {
    //   $set: {
    //     endTime: correctedEndTime
    //   }
    // });
    // console.log(DataPoints.findOne({numViewers: 46}));
  // },

  'dataPoints.insertIndepenentlyFromRawData'(rawDataPoint, username) {

    function _checkIfAuthorized(rawDataPoint) {
      if (rawDataPoint === 'Unauthorized') {
        UserProfiles.update({username}, {
          urlTokenHasExpired: new Date(),
          nextCheck: null,
          isActive: false,
        });
        throw "Got 'Unauthorized' error from Chaturbate. Marking "+username+"'s URL token as expired.";
      }
    }

    function _checkIfDataAndUsernameMatch(rawDataPoint, username) {
      if (username !== rawDataPoint.username) {
        throw "DataPoint does not belong to the provided username";
      }
    }

    function _getUserId(username) {
      const user = UserProfiles.findOne({username}, {
        fields: {userId: 1}
      });
      if (user) {
        return user.userId;
      } else {
        throw "No user associated with tis username";
      }
    };

    function _a(rawDataPoint, userId) {
      rawDataPoint.last_broadcast = _correctTimezone(new Date(rawDataPoint.last_broadcast));

      // We need to understand if the session has just started, is ongoing, finished, or we're not checking this thing during or around a session

      const nextCheckOptionSoon = 15;
      const nextCheckOptionLater = 45;
      let nextCheckOption = nextCheckOptionSoon;
      let startTime, sessionId = null, endTime;
      let deltaTokens;
      let updateInsteadOfCreatingANewDataPoint = false;

      // Get info about the Last Data DataPoint
      const lastDataPoint = DataPoints.findOne({ userId: userId }, { sort: { endTime: -1 } });
      console.log({lastDataPoint, rawDataPoint});
      const lastSessionId = lastDataPoint ? lastDataPoint.sessionId : false;
      console.log({time_online: rawDataPoint.time_online, lastSessionId});

      // Options to wait until next check, in minutes
      // Check sooner in and around a session, check less ofter during the off-time


      const isOnline = rawDataPoint.time_online > -1;
      let isOnlineOrJustFinishedStreaming = isOnline;
      // Check if the session has recently started
      if (isOnline && !lastSessionId) {
        // Create a new session
        // With start time of broadcast start time
        endTime = new Date();
        startTime = (new Date()).subMinutes(rawDataPoint.time_online);
        console.log({endTime, startTime, timeOnline: rawDataPoint.time_online});
        sessionId = Sessions.insert({
          userId: userId,
          startTime: startTime,
          endTime: null
        });
        console.log("session started", {startTime, endTime});
      } else
      // else check if session has recently finished
      if (!isOnline && lastSessionId) {
        const lastSession = Sessions.findOne(lastSessionId);
        // if finished we're after last session's data point
        if (lastSession.endTime) {
          startTime = lastDataPoint.endTime;
          console.log("session finished, now off-time", {startTime});
          nextCheckOption = nextCheckOptionLater;
        } else
          // else if session finished and we're entering off-time
        {
          // End the sessions
          Sessions.update(
            lastDataPoint.sessionId,
            {
              $set: {
                endTime: rawDataPoint.last_broadcast
              }
            }
          );
          // Make this data point a part of that sessions
          endTime = rawDataPoint.last_broadcast;
          sessionId = lastDataPoint.sessionId;
          isOnlineOrJustFinishedStreaming = true;
          console.log("session finished, updating session", {endTime});
        }
      } else
      // else if this is during an off-time
      if (!isOnline && !lastSessionId) {
        // Maybe we can simply update the last data point instead of creating a new one?
        console.log("off-time");
        updateInsteadOfCreatingANewDataPoint = lastDataPoint
          && lastDataPoint.rawTokens === rawDataPoint.token_balance
          && lastDataPoint.rawFollowers === rawDataPoint.num_followers
          && lastDataPoint.votesUp === rawDataPoint.votes_up
          && lastDataPoint.votesDown === rawDataPoint.votes_down;
        nextCheckOption = nextCheckOptionLater;
      } else // else if the session is ongoing
      {
        // write data point, assigining it to the session
        sessionId = lastSessionId;
        console.log("session is ongoing", {sessionId});
      }


      if (updateInsteadOfCreatingANewDataPoint) {

        DataPoints.update(
          lastDataPoint._id, {
            $set: { endTime: new Date() }
          }
        );
        console.log("updated last data point instead of creating a new one");

      } else {

        // Calculate some data for the data point
        if (!lastDataPoint) {
          deltaTokens = rawDataPoint.token_balance
        } else
        // if Token Balance grows, we calculate Delta Tokens as This Token Balance minus Last Token Balance
        if (rawDataPoint.token_balance >= lastDataPoint.rawTokens) {
          deltaTokens = rawDataPoint.token_balance - lastDataPoint.rawTokens;
        } else
        // else if Token Balance drops, we calculate Delta Tokens as Tips in Last Hour minus SUM of Delta Tokens in last hour
        {
          // TODO: add a warning output if there were no Data Point entries in the last hour so that the user could be prompted to check if the values are correct
          const lastHourDataPoints = DataPoints.find({
            userId: userId,
            startTime: {$gte: (new Date()).subMinutes(60)},
            endTime: {$lte: new Date()}
          }, {
            fields: {deltaTokens: 1}
          }).fetch();
          const sum = lastHourDataPoints.map(item => item.deltaTokens).reduce((a, b) => a + b, 0);
          deltaTokens = Math.max(0, rawDataPoint.tips_in_last_hour - sum);
        }


        const dataPoint = {
          userId,
          username: rawDataPoint.username,
          sessionId,
          startTime: startTime || lastDataPoint ? lastDataPoint.endTime : null,
          endTime: endTime || new Date(),
          rawFollowers: rawDataPoint.num_followers,
          rawTokens: rawDataPoint.token_balance,
          deltaFollowers: lastDataPoint ? rawDataPoint.num_followers - lastDataPoint.rawFollowers : rawDataPoint.num_followers,
          deltaTokens,
          numViewers: isOnlineOrJustFinishedStreaming ? rawDataPoint.num_viewers : 0,
          numRegisteredViewers: isOnlineOrJustFinishedStreaming ? rawDataPoint.num_registered_viewers : 0,
          numTokenedViewers: isOnlineOrJustFinishedStreaming ? rawDataPoint.num_tokened_viewers : 0,
          satisfactionScore: rawDataPoint.satisfaction_score,
          votesUp: rawDataPoint.votes_up,
          votesDown: rawDataPoint.votes_down
        };

        // console.log({dataPoint});

        // Write Data Point
        DataPoints.insert(dataPoint);

        UserProfiles.update({username: rawDataPoint.username}, {
          nextCheck: (new Date()).subMinutes(-nextCheckOption)
        });
      }
    }

    // ACTUAL METHOD CODE begins here

    // RawDataPointSchema.validate(rawDataPoint);
    check(username, String);

    try {
      _checkIfAuthorized(rawDataPoint);
      rawDataPoint = JSON.parse(rawDataPoint);
      _checkIfDataAndUsernameMatch(rawDataPoint, username);
      const userId = _getUserId(username);
      return _a(rawDataPoint, userId);
    } catch (error) {
      console.log({error, username, rawDataPoint});
      return false;
    }

  },

  'dataPoints.getAvgTokensPerHourDuringOnlineTime'() {
    if (!this.userId) {
      return false;
    }
    let sum = 0;
    let hours = 0;
    DataPoints.find({
      userId: this.userId,
      sessionId: {$ne: null},
      startTime: {$ne: null},
    }, {
      fields: {
        deltaTokens: 1,
        startTime: 1,
        endTime: 1,
      }
    }).map(function(doc) {
      sum += doc.deltaTokens;
      hours += moment(doc.endTime).diff(doc.startTime, 'hours', true); // If you want a floating point number, pass true as the third argument;
    });
    return Math.round(sum / hours);
  }
});
