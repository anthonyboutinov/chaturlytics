import { Meteor } from 'meteor/meteor';
// import { check } from 'meteor/check';
import { DataPoints } from './datapoints.js';
import { RawDataPointSchema } from './rawSchema.js';
import { Sessions } from '../sessions/sessions.js';
import { HTTP } from 'meteor/http';

Date.prototype.subMinutes = function(m){
    this.setMinutes(this.getMinutes()-m);
    return this;
}

Meteor.methods({
  'dataPoints.remove'(_id) {
    return DataPoints.remove(_id);
  },

  'dataPoints.getDataPointFromChaturbate'(url) {
    HTTP.get(url, null, (error, result) => {
      if (!error) {
        console.log({resultContent: result.content});
        Meteor.call('dataPoints.insertIndepenentlyFromRawData', result.content);
      }
    });
  },

  'dataPoints.insertIndepenentlyFromRawData'(rawDataPoint) {
    // RawDataPointSchema.validate(rawDataPoint);

    rawDataPoint = JSON.parse(rawDataPoint);

    const user = Meteor.users.findOne({
      usernames:  rawDataPoint.username
    }, {
      fields: {userId: 1}
    });
    if (!user) {
      console.log("Username not found");
      return false;
    }
    const userId = user._id;

    rawDataPoint.last_broadcast = new Date(rawDataPoint.last_broadcast);

    // We need to understand if the session has just started, is ongoing, finished, or we're not checking this thing during or around a session

    let startTime, sessionId = null, endTime;
    let deltaTokens;

    // Get info about the Last Data DataPoint
    const lastDataPoint = DataPoints.findOne({ userId: userId }, { sort: { endTime: -1 } });

    console.log({lastDataPoint, rawDataPoint});

    const lastSessionId = lastDataPoint ? lastDataPoint.sessionId : false;
    console.log({time_online: rawDataPoint.time_online, lastSessionId});

    let updateInsteadOfCreatingANewDataPoint = false;

    // Check if the session has recently started
    if (rawDataPoint.time_online > -1 && !lastSessionId) {
      // Create a new session
      // With start time of broadcast start time
      const now = new Date();
      endTime = now;
      startTime = now.subMinutes(rawDataPoint.time_online);
      sessionId = Sessions.insert({
        userId: userId,
        startTime: startTime,
        endTime: endTime
      });
      console.log("session started", {startTime, endTime});
    } else
    // else check if session has recently finished
    if (rawDataPoint.time_online === -1 && lastSessionId) {
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
      console.log("session finished, updating session", {endTime});
    } else
    // else if this is during an off-time
    if (rawDataPoint.time_online === -1 && !lastSessionId) {
      // Maybe we can simply update the last data point instead of creating a new one?
      console.log("off-time");
      updateInsteadOfCreatingANewDataPoint = lastDataPoint
        && lastDataPoint.rawTokens === rawDataPoint.token_balance
        && lastDataPoint.rawFollowers === rawDataPoint.num_followers
        && lastDataPoint.votesUp === rawDataPoint.votes_up
        && lastDataPoint.votesDown === rawDataPoint.votes_down
        && lastDataPoint.numViewers === rawDataPoint.num_viewers
        && lastDataPoint.numRegisteredViewers === rawDataPoint.num_registered_viewers
        && lastDataPoint.numTokenedViewers === rawDataPoint.num_tokened_viewers;
    } else // else if the session is ongoing
    {
      // write data point, assigining it to the session
      sessionId = lastSessionId;
      console.log("session is ongoing", {sessionId});
    }


    if (updateInsteadOfCreatingANewDataPoint) {

      DataPoints.update(
        lastDataPoint._id,
        {
          $set: {
            endTime: new Date()
          }
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
        deltaTokens = Math.max(0, rawDataPoint.tips_in_last_hour - DataPoints.find({
          userId: userId,
          startTime: {$gte: (new Date()).subMinutes(60)},
          endTime: {$lte: new Date()}
        }, {
          fields: {deltaTokens: 1}
        }).fetch().map(item => item.deltaTokens).reduce((a, b) => a + b));
      }


      const dataPoint = {
        userId,
        sessionId,
        startTime: startTime || lastDataPoint ? lastDataPoint.endTime : null,
        endTime: endTime || new Date(),
        rawFollowers: rawDataPoint.num_followers,
        rawTokens: rawDataPoint.token_balance,
        deltaFollowers: lastDataPoint ? rawDataPoint.num_followers - lastDataPoint.rawFollowers : rawDataPoint.num_followers,
        deltaTokens,
        numViewers: rawDataPoint.num_viewers,
        numRegisteredViewers: rawDataPoint.num_registered_viewers,
        numTokenedViewers: rawDataPoint.num_tokened_viewers,
        satisfactionScore: rawDataPoint.satisfaction_score,
        votesUp: rawDataPoint.votes_up,
        votesDown: rawDataPoint.votes_down
      };

      // console.log({dataPoint});

      // Write Data Point
      DataPoints.insert(dataPoint);
    }

  },
});
