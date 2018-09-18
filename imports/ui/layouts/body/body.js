import './body.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { UserProfiles } from '/imports/api/userprofiles/userprofiles.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';


function isActive(value) {
  return value === true ? "is-active" : null;
}

Template.Layout_body.onCreated(function() {
  var instance = this;

  instance.subscribe('userProfiles.all');

  instance.subscribe('sessions.last');
  instance.tokensPerHour = new ReactiveVar('…');

  Meteor.call('dataPoints.getAvgTokensPerHourDuringOnlineTime', function(error, result) {
    instance.tokensPerHour.set(result);
  });
});

Template.Layout_body.helpers({

  isActiveAsCurrentRouteNamed(name) {
    FlowRouter.watchPathChange();
    return isActive(name ? FlowRouter.current().route.name === name : false);
  },

  isBroadcasting() {
    const liveSession = Sessions.findOne({
      endTime: null
    });
    if (liveSession) {
      return true;
    }
    const lastSession = Sessions.findOne({}, {
      sort: {endTime: -1}
    });
    console.log({lastSession});
    if (!lastSession || lastSession.endTime && lastSession.endTime < new Date()) {
      return false;
    } else {
      return true;
    }
  },

  timeOnline() {
    const liveSession = Sessions.findOne({
      endTime: null
    });
    if (liveSession) {
      return moment(liveSession.startTime).fromNow(true);
    }
  },

  timeOffline() {
    const lastSession = Sessions.findOne({}, {
      sort: {endTime: -1}
    });
    if (!lastSession) {
      return "Offline";
    } else if (lastSession.endTime > moment().subtract(1, 'days')) {
      return "Offline";
    } else {
      return "Offline " + moment(lastSession.endTime).fromNow(true);
    }
  },

  tokensPerHour() {
    return Template.instance().tokensPerHour.get();
  },

  currentUserProfile() {
    return UserProfiles.findOne({isCurrent: true});
  }

});

Template.Layout_body.events({

  'click .force-sync'(event) {
    event.preventDefault();
    Meteor.call('dataPoints.getDataPointsForAll');
    console.log("called dataPoints.getDataPointsForAll from client");
  },


});
