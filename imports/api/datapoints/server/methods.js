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
        {nextSync: {$lte: now}},
        {nextSync: null}
      ]
    }, {
      fields: {url: 1, username: 1},
      reactive: false,
    }).forEach(function(item) {
      console.log("Calling dataPoints.getDataPointFromChaturbate for " + item.username);
      Meteor.call('dataPoints.getDataPointFromChaturbate', item.url, item.username);
    });
    return true;
  },

  'dataPoints.getDataPointFromChaturbate'(url, username) {
    check(url, String);
    check(username, String);

    HTTP.get(url, null, (error, result) => {
      if (!error) {
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

    const __timer = new Date();

    //TODO: create one now date and use it throughout the method:  const now = new Date();

    function _checkIfAuthorized(rawDataPoint, username) {
      if (rawDataPoint === 'Unauthorized') {
        UserProfiles.update({username}, {
          urlTokenHasExpired: new Date(),
          nextSync: null,
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
      rawDataPoint.last_broadcast = _correctTimezone(new Date(rawDataPoint.last_broadcast)); // FIXME: use moment with timezone constructor to automatically adjust this instead

      // We need to understand if the session has just started, is ongoing, finished, or we're not checking this thing during or around a session

      const nextSyncOptionSoon = 14;
      const nextSyncOptionLater = 29;
      let nextSyncOption = nextSyncOptionSoon;
      let startTime, sessionId = null, endTime;
      let deltaTokens;
      let updateEndTimeInsteadOfCreatingANewDataPoint = false;
      let overrideLastPointInsteadOfCreatingANewOne = false;
      let broadcastHasDropped;
      let callSessionSummarize = false;

      // Get info about the Last Data DataPoint
      const lastDataPoint = DataPoints.findOne({ userId, username: rawDataPoint.username }, { sort: { endTime: -1 } });
      const lastSessionId = lastDataPoint ? lastDataPoint.sessionId : false;

      // Options to wait until next check, in minutes
      // Check sooner in and around a session, check less ofter during the off-time

      const isOnline = rawDataPoint.time_online > -1;
      let isOnlineOrJustFinishedStreaming = isOnline;
      console.log({rawDataPoint, isOnline, lastSessionId});
      // Check if the session has recently started
      // --- CASE 1 ---
      if (isOnline && !lastSessionId) {
        console.log("CASE 1");
        // Create a new session
        // With start time of broadcast start time
        endTime = new Date();
        startTime = (new Date()).subMinutes(rawDataPoint.time_online);
        console.log({endTime, startTime, timeOnline: rawDataPoint.time_online});
        sessionId = Sessions.insert({
          userId: userId,
          username: rawDataPoint.username,
          startTime: startTime,
          endTime: null
        });
        // Update endTime of the previous dataPoint
        if (lastDataPoint) {
          DataPoints.update(
            lastDataPoint._id, {
              $set: { endTime: startTime }
            }
          );
        }
        console.log("session started", {startTime, endTime});
      } else
      // else check if session has recently finished
      // CASE 2.1 & 2.2 wrapper
      if (!isOnline && lastSessionId) {
        const lastSession = Sessions.findOne(lastSessionId);
        console.log("CASE 2.1 & 2.2 wrapper", {lastSession});
        // if finished and we're right after the last session's data point
        // --- CASE 2.1 ---
        if (lastSession.endTime) {
          startTime = lastDataPoint.endTime;
          console.log("CASE 2.1: session finished, now off-time", {startTime});
          nextSyncOption = nextSyncOptionLater;
          // overrideLastPointInsteadOfCreatingANewOne = true; // CREATED A PROBLEM of overriding lastSession's last dataPoint!
        } else
          // else if session has finished and we're entering off-time
          // --- CASE 2.2 ---
        {
          // End the sessions
          Sessions.update(lastDataPoint.sessionId, {
            $set: { endTime: rawDataPoint.last_broadcast }
          });
          // Make this data point a part of that sessions
          endTime = rawDataPoint.last_broadcast;
          sessionId = lastDataPoint.sessionId;
          isOnlineOrJustFinishedStreaming = true;
          callSessionSummarize = true;
          console.log("CASE 2.2: session finished, updating session", {endTime});
        }
      } else
      // else if this is during an off-time
      // --- CASE 3 ---
      if (!isOnline && !lastSessionId) {
        // Maybe we can simply update the last data point instead of creating a new one?
        console.log("CASE 3: off-time");
        updateEndTimeInsteadOfCreatingANewDataPoint = lastDataPoint
          && lastDataPoint.rawTokens === rawDataPoint.token_balance
          && lastDataPoint.rawFollowers === rawDataPoint.num_followers
          && lastDataPoint.totalVotesUp === rawDataPoint.votes_up
          && lastDataPoint.totalVotesDown === rawDataPoint.votes_down;
        nextSyncOption = nextSyncOptionLater;
      } else // else if the session is ongoing
      // --- CASE 4 ---
      {
        // write data point, assigining it to the session
        sessionId = lastSessionId;
        try {
          const currentTimeframeDurationInMins = moment(lastDataPoint.endTime).diff(new Date(), 'minutes', true);
          if (rawDataPoint.ime_online < currentTimeframeDurationInMins) {
            broadcastHasDropped = true;
          }
        } catch(error) {
          // TODO: Check if try catch is needed / resolved already
          console.log({
            error,
            lastDataPointEndTime: lastDataPoint.endTime
          });
        }
        console.log("CASE 4: session is ongoing", {sessionId});
      }


      if (updateEndTimeInsteadOfCreatingANewDataPoint) {
        DataPoints.update( lastDataPoint._id, {
          $set: { endTime: new Date() }
        });

        UserProfiles.update({username: rawDataPoint.username}, { $set: {
          nextSync: (new Date()).subMinutes(-nextSyncOption)
        } });

        console.log("updateEndTimeInsteadOfCreatingANewDataPoint: updated last data point instead of creating a new one, userProfile's nextSync set");
      } else {
        console.log("Not updateEndTimeInsteadOfCreatingANewDataPoint");

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
            userId,
            username: rawDataPoint.username,
            startTime: {$gte: (new Date()).subMinutes(60)},
            endTime: {$lte: new Date()}
          }, {
            fields: {deltaTokens: 1}
          }).fetch();
          const sum = lastHourDataPoints.map(item => item.deltaTokens).reduce((a, b) => a + b, 0);
          deltaTokens = Math.max(0, rawDataPoint.tips_in_last_hour - sum);
        }


        const dataPointContent = {
          userId,
          username: rawDataPoint.username,
          sessionId,
          startTime: startTime ? startTime : (lastDataPoint ? lastDataPoint.endTime : null),
          endTime: endTime || new Date(),
          rawFollowers: rawDataPoint.num_followers,
          rawTokens: rawDataPoint.token_balance,
          deltaFollowers: lastDataPoint ? rawDataPoint.num_followers - lastDataPoint.rawFollowers : rawDataPoint.num_followers,
          deltaTokens,
          numViewers: isOnlineOrJustFinishedStreaming ? rawDataPoint.num_viewers : 0,
          numRegisteredViewers: isOnlineOrJustFinishedStreaming ? rawDataPoint.num_registered_viewers : 0,
          numTokenedViewers: isOnlineOrJustFinishedStreaming ? rawDataPoint.num_tokened_viewers : 0,
          satisfactionScore: rawDataPoint.satisfaction_score,
          totalVotesUp: rawDataPoint.votes_up,
          totalVotesDown: rawDataPoint.votes_down,
          deltaVotesUp:   lastDataPoint ? rawDataPoint.votes_up   - lastDataPoint.totalVotesUp   : rawDataPoint.votes_up,
          deltaVotesDown: lastDataPoint ? rawDataPoint.votes_down - lastDataPoint.totalVotesDown : rawDataPoint.votes_down,
          broadcastHasDropped,
        };

        // Write Data Point
        if (!overrideLastPointInsteadOfCreatingANewOne) {
          console.log("Not overrideLastPointInsteadOfCreatingANewOne, inserting new dataPoint");
          DataPoints.insert(dataPointContent);
        } else {
          console.log("overrideLastPointInsteadOfCreatingANewOne, updating last dataPoint");
          dataPointContent.startTime = lastDataPoint.startTime;
          DataPoints.update(lastDataPoint._id, {
            $set: dataPointContent
          });
        }

        UserProfiles.update({username: rawDataPoint.username}, {
          $set: {
            nextSync: (new Date()).subMinutes(-nextSyncOption)
          }
        });

        if (callSessionSummarize) {
          Meteor.call("sessions.summarize", lastDataPoint.sessionId);
        }
      }
    }

    // ACTUAL METHOD CODE begins here

    // RawDataPointSchema.validate(rawDataPoint);
    check(username, String);

    try {
      _checkIfAuthorized(rawDataPoint, username);
      rawDataPoint = JSON.parse(rawDataPoint);
      _checkIfDataAndUsernameMatch(rawDataPoint, username);
      const userId = _getUserId(username);
      const result = _a(rawDataPoint, userId);
      console.log('dataPoints.getDataPointFromChaturbate execution time is ', new Date() - __timer);
    } catch (error) {
      console.log({error, username, rawDataPoint});
      return false;
    }

  },

  'dataPoints.getAvgTokensPerHourDuringOnlineTime'(oldestDataPoint = moment("2000-01-01").toDate()) {
    if (!this.userId) {
      return false;
    }

    const username = UserProfiles.getCurrentUsername(this.userId);

    let sum = 0;
    let hours = 0;
    DataPoints.find({
      userId: this.userId,
      username,
      sessionId: {$ne: null},
      startTime: {$ne: null},
      endTime: { $gte: oldestDataPoint },
    }, {
      fields: {
        deltaTokens: 1,
        startTime: 1,
        endTime: 1,
      }
    }).map(function(doc) {
      sum += doc.deltaTokens;
      // Explanation for the next line: If you want a floating point number, pass true as the third argument;
      hours += moment(doc.endTime).diff(doc.startTime, 'hours', true);
    });
    return Math.round(sum / hours);
  },

  'dataPoints.update'(_id, setOptions) {
    if (!this.userId) {
      return false;
    }
    check(_id, String);
    return DataPoints.update({
      _id,
      userId: this.userId,
    }, {
      $set: setOptions
    });
  },

  'dataPoints.updateSchema'() {
    if (!this.userId) {
      return false;
    }

    console.log("Nothing to force-update");

    //
    // const dataPoints = DataPoints.find({userId: this.userId}, {fields: {_id: 1}}).fetch();
    //
    // dataPoints.map(dataPoint => DataPoints.update({_id: dataPoint._id}, {
    //   $set: {
    //     username: UserProfiles.getCurrentUsername(this.userId)
    //   },
    // }) );
    //
    // const sessions = Sessions.find({userId: this.userId}, {fields: {_id: 1}}).fetch();
    //
    // sessions.map(session => Sessions.update({_id: session._id}, {
    //   $set: {
    //     username: UserProfiles.getCurrentUsername(this.userId)
    //   },
    // }) );



    // const allDataPoints = DataPoints.find({}, {
    //   sort: {endTime: 1}
    // }).fetch();
    // for (let i = 0; i < allDataPoints.length; i++) {
    //   const thisDataPoint = allDataPoints[i];
    //   const prevDataPoint = i > 0 ? allDataPoints[i-1] : null;
    //   DataPoints.update(thisDataPoint._id, {
    //     $set: {
    //       totalVotesUp:   thisDataPoint.votesUp,
    //       totalVotesDown: thisDataPoint.votesDown,
    //       deltaVotesUp:   prevDataPoint ? thisDataPoint.votesUp   - prevDataPoint.votesUp   : thisDataPoint.votesUp,
    //       deltaVotesDown: prevDataPoint ? thisDataPoint.votesDown - prevDataPoint.votesDown : thisDataPoint.votesDown,
    //     },
    //     // $unset: ['votesUp', 'votesDown'],
    //   });
    // }
  },

});
