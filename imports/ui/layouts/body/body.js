import './body.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { UserProfiles } from '/imports/api/userprofiles/userprofiles.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';


function isActive(value) {
  return value === true ? "is-active" : null;
}

function _getTokensPerHour(instance) {
  const oldestDate = moment().subtract(30, 'days').toDate();
  Meteor.call('dataPoints.getAvgTokensPerHourDuringOnlineTime', oldestDate, function(error, result) {
    if (!error) {
      instance.tokensPerHour.set(result);
    } else {
      console.warn("Server error in dataPoints.getAvgTokensPerHourDuringOnlineTime Meteor call");
    }
  });
}

Template.Layout_body.onCreated(function() {
  const instance = this;

  // GLOBAL SUBSCRIPTIONS
  instance.subscribe('userRates.all'); // not used in this template, but in other ones
  instance.subscribe('userProfiles.all');
  instance.subscribe('sessions.last');
  instance.subscribe('dataPoints.last');

  instance.tokensPerHour = new ReactiveVar('…');
  instance.recomputationTrigger = new ReactiveVar(0);

  instance.handle = Meteor.setInterval((function() {
    instance.recomputationTrigger.set(instance.recomputationTrigger.get() + 1);
    _getTokensPerHour(instance);
  }), 1000 * 60 * 10);
  _getTokensPerHour(instance);
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
    const lastSession = Sessions.findOne({}, {
      sort: {startTime: -1}
    });
    console.log({lastSession});
    if (lastSession && !lastSession.endTime) {
      return true;
    }
    if (!lastSession || lastSession.endTime && lastSession.endTime < new Date()) {
      return false;
    } else {
      return true;
    }
  },

  timeOnline() {
    Template.instance().recomputationTrigger.get();
    const liveSession = Sessions.findOne({
      endTime: null
    });
    if (liveSession) {
      return moment
        .duration(moment(new Date())
        .diff(moment(liveSession.startTime), 'minutes'), 'minutes')
        .format("h [hrs] m [min]");
    }
    return "…";
  },

  timeOffline() {
    const lastSession = Sessions.findOne({}, {
      sort: {endTime: -1}
    });
    const offlineLabel = 'Offline';
    if (!lastSession) {
      return offlineLabel;
    } else if (lastSession.endTime > moment().subtract(1, 'days')) {
      return offlineLabel;
    } else {
      return offlineLabel + ' ' + moment(lastSession.endTime).fromNow(true);
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
  },

  'click .update-db'(event) {
    event.preventDefault();
    Meteor.call('dataPoints.updateSchema');
  },

  'click .update-exchange-rates'(event) {
    event.preventDefault();
    Meteor.call('currencies.updateExchangeRate');
  },

  'click .clear-next-sync-field'(event) {
    event.preventDefault();
    Meteor.call('userProfiles.clearNextSyncField');
  },


});
