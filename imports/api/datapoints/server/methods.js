import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { DataPoints } from '../datapoints.js';
import { RawDataPointSchema } from './rawSchema.js';
import { Sessions } from '../../sessions/sessions.js';
import { UserProfiles } from '../../userprofiles/userprofiles.js';
import { UserRates } from '../../userRates/userRates.js';
import { HTTP } from 'meteor/http';
import { moment as momentTZ } from 'moment-timezone';

Date.prototype.subMinutes = function(m){
    this.setMinutes(this.getMinutes()-m);
    return this;
}

let trySlowingDownALittleTimer = null;

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
    function _handleErrorsForGetDataPointFromChaturbate(error, url, username) {
      if (error.code === 'ECONNRESET') {
        console.log({error: 'Cannot reach server.',url, username});
      } else if (error.code === 'ENOTFOUND') {
        console.log({error: 'No Internet connection.',url, username});
      } else {
        console.log('dataPoints.getDataPointFromChaturbate', {error, url, username});
        if (error.response && error.response.statusCode === 403) {
          trySlowingDownALittleTimer = moment().add(6, 'hours').toDate();
          if (error.response.content === 'Try slowing down a little.') {
            console.log("Warning: 'Try slowing down a little.' error");
          } else {
            console.log("Warning: Probably CAPTCHA is served by Cloudflare");
          }
        } else {
          console.log("Not 403 error");
        }
      }
    }

    function _getErrorCode(error) {
      if (error.code) {
        return error.code;
      } else if (error.response && error.response.statusCode === 403) {
        if (error.response.content === 'Try slowing down a little.') {
          return "SLOWDOWN";
        } else {
          return "CAPTCHA|UNKNOWN";
        }
      } else {
        return "UNKNOWN"
      }
    };


    if (!trySlowingDownALittleTimer || trySlowingDownALittleTimer <= new Date()) {
      check(url, String);
      check(username, String);

      HTTP.get(url, null, (error, result) => {
        if (!error) {
          Meteor.call('dataPoints.insertIndepenentlyFromRawData', result.content, username);
        } else {
          Meteor.call('dataPoints.emergencyEndSessionForUsername', username, _getErrorCode(error));
          _handleErrorsForGetDataPointFromChaturbate(error, url, username);
        }
      });
    } else {
      console.log("trySlowingDownALittleTimer prevents checking ", username);
    }
  },

  'dataPoints.emergencyEndSessionForUsername'(username, errorCode) {
    function _emergencyEndSessionForUserId(userId, username) {
      const lastDataPoint = DataPoints.findOne({userId, username}, {
        sort: {endTime: -1}
      });
      const lastSessionId = lastDataPoint ? lastDataPoint.sessionId : false;
      if (lastSessionId) {
        const lastSession = Sessions.findOne(lastSessionId, {
          fields: {endTime: 1}
        });
        if (!lastSession.endTime) {
          // End the session
          Sessions.update(lastSessionId, {
            $set: {
              endTime: lastDataPoint.endTime,
              errorCode
             }
          });
          console.log("dataPoints.emergencyEndSessionForUsername", username, errorCode);
          Meteor.call("sessions.summarize", lastSessionId);
        }
      }
    }

    const userIds = UserProfiles.getUserIds(username);
    return userIds.map(userId => _emergencyEndSessionForUserId(userId, username));

  },

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

    function _updateNextSync(rawDataPoint, nextSyncOption) {
      UserProfiles.update({username: rawDataPoint.username}, { $set: {
        nextSync: (new Date()).subMinutes(-nextSyncOption)
      } });
    }

    function _a(rawDataPoint, userId) {
      // We need to understand if the session has just started, is ongoing, finished, or we're not checking this thing during or around a session

      const nextSyncOptions = {
        sooner: 14,
        later: 29,
      };
      let nextSyncOption = nextSyncOptions.sooner;
      let startTime, sessionId = null, endTime;
      let deltaTokens;
      let updateEndTimeInsteadOfCreatingANewDataPoint = false;
      let overrideLastPointInsteadOfCreatingANewOne = false;
      let broadcastHasDropped;
      let callSessionSummarize = false;

      // Get info about the Last Data DataPoint
      const lastDataPoint = DataPoints.findOne({ userId, username: rawDataPoint.username }, { sort: { endTime: -1 } });
      const lastSessionId = lastDataPoint ? lastDataPoint.sessionId : false;

      try {
        const _toLocalTime = moment.utc(rawDataPoint.last_broadcast.substring(0, 16) + ' -04:00', "YYYY-MM-DDTHH:mm ZZ").local().toDate();
        console.log({initialLastBroadcast: rawDataPoint.last_broadcast, _toLocalTime});
      } catch (e) {
        console.log(e);
      }

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
          console.log("CASE 2.1: session finished, now off-time");
          nextSyncOption = nextSyncOptions.later;
          isOnlineOrJustFinishedStreaming = true;
          // overrideLastPointInsteadOfCreatingANewOne = true; // CREATED A PROBLEM of overriding lastSession's last dataPoint!
        } else
          // else if session has finished and we're entering off-time
          // --- CASE 2.2 ---
        {
          console.log("CASE 2.2: session finished, updating session");
          try {
            const dateFormat = "YYYY-MM-DDTHH:mm ZZ";
            // substring 16 chars because we don't need milliseconds, then add timezone of -5h, then parse as utc in the specified format, then to local and to date
            const toLocalTime = moment.utc(rawDataPoint.last_broadcast.substring(0, 16) + ' -07:00', dateFormat).local().toDate();
            // console.log({
            //   toLocalTime,
            //   minusFive: moment.utc(rawDataPoint.last_broadcast.substring(0, 16) + ' -05:00', dateFormat).local().toDate(),
            //   minusEight: moment.utc(rawDataPoint.last_broadcast.substring(0, 16) + ' -08:00', dateFormat).local().toDate()
            // });
            console.log({initialLastBroadcast: rawDataPoint.last_broadcast, toLocalTime});
            rawDataPoint.last_broadcast = toLocalTime; //moment.utc(rawDataPoint.last_broadcast).toDate();
            // rawDataPoint.last_broadcast = momentTZ().tz(rawDataPoint.last_broadcast, "America/Denver").toDate();
          } catch(error) {
            console.log({errorManualLastBroadcastTimeFix: error});
          }
          // End the sessions
          Sessions.update(lastDataPoint.sessionId, {
            $set: { endTime: rawDataPoint.last_broadcast }
          });
          // Make this data point a part of that sessions
          endTime = rawDataPoint.last_broadcast;
          sessionId = lastDataPoint.sessionId;
          isOnlineOrJustFinishedStreaming = true;
          callSessionSummarize = true;

          const thisDataPointDuration = moment(endTime).diff(lastDataPoint.endTime, 'minutes');
          // if it's less $lte 8 mim
          if (thisDataPointDuration <= Math.ceil(nextSyncOption.sooner / 2)) {
            console.log("CASE 2.2.a: dataPoint is too short, gluing it with the last one (overriding the last one)");
            overrideLastPointInsteadOfCreatingANewOne = true;
          }
        }
      } else
      // else if this is during an off-time
      // --- CASE 3 ---
      if (!isOnline && !lastSessionId) {
        // Maybe we can simply update the last data point instead of creating a new one?
        console.log("CASE 3: off-time");
        updateEndTimeInsteadOfCreatingANewDataPoint = lastDataPoint
          && lastDataPoint.rawTokens === rawDataPoint.token_balance
          && lastDataPoint.rawFollowers === rawDataPoint.num_followers;
          // && lastDataPoint.totalVotesUp === rawDataPoint.votes_up
          // && lastDataPoint.totalVotesDown === rawDataPoint.votes_down;
        nextSyncOption = nextSyncOptions.later;
      } else // else if the session is ongoing
      // --- CASE 4 ---
      {
        // write data point, assigining it to the session
        sessionId = lastSessionId;
        const currentTimeframeDurationInMins = moment().diff(lastDataPoint.endTime, 'minutes');
        console.log({timeOnline: rawDataPoint.time_online, currentTimeframeDurationInMins, broadcastHasDropped: rawDataPoint.time_online < currentTimeframeDurationInMins});
        if (rawDataPoint.time_online < currentTimeframeDurationInMins) {
          broadcastHasDropped = true;
        }
        console.log("CASE 4: session is ongoing", {sessionId});
      }

      try {
        if (updateEndTimeInsteadOfCreatingANewDataPoint) {
          _updateNextSync(rawDataPoint, nextSyncOption);

          DataPoints.update( lastDataPoint._id, {
            $set: { endTime: new Date() }
          });
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
            // FIXME: there's an logical error in here somwhere
            const sum = lastHourDataPoints.map(item => item.deltaTokens).reduce((a, b) => a + b, 0);
            deltaTokens = Math.max(0, rawDataPoint.tips_in_last_hour - sum - lastDataPoint.deltaTokens);
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

          _updateNextSync(rawDataPoint, nextSyncOption);

          if (callSessionSummarize) {
            Meteor.call("sessions.summarize", lastDataPoint.sessionId);
          }
        }
      } catch (error) {
        console.log(error, "setting next sync to nextSyncOption: ", nextSyncOption);
        _updateNextSync(rawDataPoint, nextSyncOption);
      }
    }

    // ACTUAL METHOD CODE begins here

    // RawDataPointSchema.validate(rawDataPoint);
    check(username, String);

    let results;
    try {
      _checkIfAuthorized(rawDataPoint, username);
      rawDataPoint = JSON.parse(rawDataPoint);
      _checkIfDataAndUsernameMatch(rawDataPoint, username);
      const userIds = UserProfiles.getUserIds(username);
      results = userIds.map(userId => _a(rawDataPoint, userId));
      console.log('dataPoints.getDataPointFromChaturbate execution time is ', new Date() - __timer);
    } catch (error) {
      console.log({error, username, rawDataPoint});
    }
    return results;
  },

  'dataPoints.getAvgTokensPerHourDuringOnlineTime'(oldestDataPoint = moment("2000-01-01").toDate(), doIncludeExtraIncome = false) {
    if (!this.userId) {
      return false;
    }

    function _hours(doc) {
      // Explanation for the next line: If you want a floating point number, pass true as the third argument;
      return moment(doc.endTime).diff(doc.startTime, 'hours', true);
    }

    const username = UserProfiles.getCurrentUsername(this.userId);

    const userRates = UserRates.find({ userId: this.userId }, {
      sort: {activeStartingDate: -1}
    }).fetch();

    let summary = {
      sum: 0,
      hours: 0,
      currency: 'TKN',
    };

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
    }).map(function(dataPoint) {
      summary.sum += doIncludeExtraIncome ? UserRates.dataPointsTokensToCurrency(dataPoint, userRates) : dataPoint.deltaTokens;
      summary.hours += _hours(dataPoint);
    });

    if (doIncludeExtraIncome) {
      const sessions = Sessions.find({
        userId: this.userId,
        username,
        endTime: { $gte: oldestDataPoint },
      }, {
        fields: {
          extraIncome: 1,
          startTime: 1,
          endTime: 1,
        }
      }).fetch();
      const _summary = UserRates.sumExtraIncomeAndTokens(sessions, userRates); // That would return value in latest Currency
      summary.sum += _summary.sum;
      summary.currency = _summary.currency;
      // summary.hours += sessions.reduce(doc => _hours(doc));
    }

    summary.avg = Math.round(summary.sum / summary.hours);

    // console.log("getAvgTokensPerHourDuringOnlineTime:", {
    //   oldestDataPoint,
    //   doIncludeExtraIncome,
    //   sum: summary.sum,
    //   hours: summary.hours,
    //   avg: summary.avg,
    // });

    return summary;
  },

  'dataPoints.update'(_id, setOptions) {
    if (!this.userId) {
      return false;
    }
    check(_id, String);
    const result = DataPoints.update({
      _id,
      userId: this.userId,
    }, {
      $set: setOptions
    });
    if (result) {
      if (_.has(setOptions, 'endTime')) {
        const thisDataPoint = DataPoints.findOne({_id}, {fields: {sessionId: 1}});
        if (thisDataPoint) {
          const sessionId = thisDataPoint.sessionId;
          if (sessionId) {
            Meteor.call('sessions.recomputeTimeframe', sessionId);
          }
        }
      }
    }
    return result;
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
