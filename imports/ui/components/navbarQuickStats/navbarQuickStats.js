import './navbarQuickStats.html';

import { Meteor } from 'meteor/meteor';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { ReactiveVar } from 'meteor/reactive-var';

const _tokensPerHourOptions = {
  30: {
    abbr: '30D',
    label: 'Last 30 days',
    value: 30,
  },
  60: {
    abbr: '60D',
    label: 'Last 60 days',
    value: 60,
  },
  90: {
    abbr: '90D',
    label: 'Last 90 days',
    value: 90,
  },
  365: {
    abbr: '1Y',
    label: 'Last year',
    value: 365,
  },
  "A": {
    abbr: 'A',
    label: 'All time',
    value: 'A',
  },
};

Template.navbarQuickStats.onCreated(function() {
  const instance = this;

  instance.subscribe('sessions.last');
  instance.subscribe('dataPoints.last');
  instance.subscribe('userData');

  instance.tokensPerHour = new ReactiveVar();

  instance.intervalHandlers = [];
  instance.intervalHandlers.push(Meteor.setInterval((function() {

    instance.recomputationTrigger = new ReactiveVar(0);
    instance.recomputationTrigger.set(instance.recomputationTrigger.get() + 1);
    _getTokensPerHour(instance);
  }), 1000 * 30)); // update every 30 mins
  _getTokensPerHour(instance);

  instance.recomputationTriggerOneMinute = new ReactiveVar(0);
  instance.intervalHandlers.push(Meteor.setInterval((function() {
    instance.recomputationTriggerOneMinute.set(instance.recomputationTriggerOneMinute.get() + 30);
  }), 1000)); // update every min

});

Template.navbarQuickStats.onDestroyed(function() {
  this.intervalHandlers.forEach((interval) => Meteor.clearInterval(interval));
});

function _getTokensPerHour(instance) {
  const defaultValue = 30;
  let currentTokensPerHourOption = Meteor.user() ? Meteor.user().displayOption_tokensPerHour || defaultValue : defaultValue;
  let oldestDate;
  if (currentTokensPerHourOption === 'A') {
    oldestDate = moment("2000-01-01").toDate();
  } else {
    oldestDate = moment().subtract(currentTokensPerHourOption, 'days').toDate();
  }
  const defaultDoIncludeExtraIncome = false;
  const doIncludeExtraIncome = Meteor.user() ? Meteor.user().displayOption_tokensPerHourExtraIncome : defaultDoIncludeExtraIncome;
  Meteor.call('dataPoints.getAvgTokensPerHourDuringOnlineTime', oldestDate, doIncludeExtraIncome, function(error, result) {
    if (!error) {
      instance.tokensPerHour.set(result);
    } else {
      console.warn("Server error in dataPoints.getAvgTokensPerHourDuringOnlineTime Meteor call");
    }
  });
}

Template.navbarQuickStats.helpers({

  lastDataPoint() {
    return DataPoints.findOne({}, {
      sort: {endTime: -1},
      limit: 1,
    });
  },

  timeOnline() {
    Template.instance().recomputationTriggerOneMinute.get();
    const liveSession = Sessions.findOne({
      endTime: null
    });
    if (liveSession) {
      return moment
        .duration(moment().diff(moment(liveSession.startTime), 'minutes'), 'minutes')
        .format("h [hrs] m [min]");
    }
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

  timeOfflineClass() {
    const lastSession = Sessions.findOne({}, {
      sort: {endTime: -1}
    });
    if (!lastSession) return;
    const daysFromNow = moment({hours:0}).diff(lastSession.endTime, 'days');
    if (daysFromNow > 2 && daysFromNow < 5) {
      return "is-warning";
    } else if (daysFromNow >= 5 && daysFromNow < 15) {
      return "is-danger";
    }
  },

  tokensPerHour: () => Template.instance().tokensPerHour.get(),

  currentTokensPerHourOption: () => Meteor.user().displayOption_tokensPerHour,

  abbrCurrentTokensPerHourOption() {
    const value = Meteor.user().displayOption_tokensPerHour || 30;
    return _tokensPerHourOptions[value] ? _tokensPerHourOptions[value].abbr : null;
  },

  tokensPerHourOptions: () => _.values(_tokensPerHourOptions),

  __triggerGetTokensPerHour() {
    Meteor.user();
    _getTokensPerHour(Template.instance());
  },

  tokensPerHourIncludeExtraIncome: () => Meteor.user().displayOption_tokensPerHourExtraIncome,

});

Template.navbarQuickStats.events({

  'click [data-select-tokensPerHour]'(event, template) {
    event.preventDefault();
    let value = $(event.target).attr('data-select-tokensPerHour');
    value = parseInt(value) || value;
    Meteor.call('users.setDisplayOption', 'tokensPerHour', value);
  },

  'click #tokensPerHour-toggle-extraIncome'(event, template) {
    const inverseValue = !Meteor.user().displayOption_tokensPerHourExtraIncome;
    Meteor.call('users.setDisplayOption', 'tokensPerHourExtraIncome', inverseValue);
  },

});
