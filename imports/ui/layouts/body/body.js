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

  instance.subscribe('dataPoints.last');

  instance.seconds = new ReactiveVar(0);
  instance.handle = Meteor.setInterval((function() {
    instance.seconds.set(instance.seconds.get() + 1);

    Meteor.call('dataPoints.getAvgTokensPerHourDuringOnlineTime', function(error, result) {
      instance.tokensPerHour.set(result);
    });
  }), 1000 * 60 * 10);
});

Template.Layout_body.onDestroyed(function() {
  Meteor.clearInterval(this.handle);
});

Template.Layout_body.helpers({

  isActiveAsCurrentRouteNamed(name) {
    FlowRouter.watchPathChange();
    return isActive(name ? FlowRouter.current().route.name === name : false);
  },

  lastDataPoint() {
    return DataPoints.findOne({}, {
      sort: {endTime: -1},
      limit: 1,
    });
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
    if (!lastSession || lastSession.endTime && lastSession.endTime < new Date()) {
      return false;
    } else {
      return true;
    }
  },

  timeOnline() {
    Template.instance().seconds.get();
    const liveSession = Sessions.findOne({
      endTime: null
    });
    if (liveSession) {
      // return moment(liveSession.startTime).fromNow(true);
      return moment.duration(moment(new Date()).diff(moment(liveSession.startTime), 'minutes'), 'minutes').format("h [hrs] m [min]");
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
    Meteor.call('dataPoints.getDataPointsForAll', (error, result) => {
      console.log({error, result});
    });
    console.log("called dataPoints.getDataPointsForAll from client");
  },

  'click .update-db'(event) {
    event.preventDefault();
    Meteor.call('dataPoints.updateSchema');
    console.log("called dataPoints.updateSchema from client");
  },


});
