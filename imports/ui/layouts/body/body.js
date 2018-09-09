import './body.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Meteor } from 'meteor/meteor';

function isActive(value) {
  return value === true ? "is-active" : null;
}

Template.Layout_body.onCreated(function() {
  var instance = this;

  const subscription = instance.subscribe('sessions.last');
});

Template.Layout_body.helpers({

  isActiveAsCurrentRouteNamed(name) {
    FlowRouter.watchPathChange();
    return isActive(name ? FlowRouter.current().route.name === name : false);
  },

  isBroadcasting() {
    const lastSession = Sessions.findOne({}, {
      orderBy: {endTime: -1}
    });
    if (!lastSession || lastSession.endTime && lastSession.endTime < new Date()) {
      return false;
    } else {
      return true;
    }
  },

  timeOnline() {
    const lastSession = Sessions.findOne({}, {
      orderBy: {endTime: -1}
    });
    if (!lastSession || lastSession.endTime && lastSession.endTime < new Date()) {
      return null;
    } else {
      return moment(lastSession.startTime).fromNow(true);
    }
  },

});

Template.Layout_body.events({

  'click .force-sync'(event) {
    event.preventDefault();
    Meteor.call('dataPoints.getDataPointsForAll');
    console.log("called dataPoints.getDataPointsForAll from client");
  },


});
