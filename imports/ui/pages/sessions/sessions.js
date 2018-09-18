import './sessions.html';

import '../../components/sessionInfoView/sessionInfoView.js';

// import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Meteor } from 'meteor/meteor';

Date.prototype.subMinutes = function(m){
  this.setMinutes(this.getMinutes()-m);
  return this;
}

Template.Page_sessions.onCreated(function () {
  Meteor.subscribe('sessions.all');

  var instance = this;
  instance.seconds = new ReactiveVar(0);
  instance.handle = Meteor.setInterval((function() {
    instance.seconds.set(instance.seconds.get() + 30);
  }), 30000);

  instance.currentlyViewedSession = new ReactiveVar();
});

Template.Page_sessions.helpers({

  sessions() {
    return Sessions.find({});
  },
  timelll(date) {
    return date ? moment(date).format("lll") : "";
  },
  timeframe() {
    const start = this.startTime ? moment(this.startTime).format('lll') + ' - ' : '-∞ to ';
    let end = '';
    let format = 'lll';
    if (this.endTime) {
      const isLessThanHourLong = moment(this.endTime).date() === moment(this.startTime).date();
      if (this.startTime && isLessThanHourLong) {
        format = 'LT';
      }
      end = moment(this.endTime).format(format);
    }
    return start + end;
  },

  duration() {
    Template.instance().seconds.get();

    if (!this.startTime) {
      return null;
    }

    if (!this.endTime) {
      return moment(this.startTime).fromNow(true);
    }
    const endTime = this.endTime || new Date();
    const duration = moment.duration(moment(endTime).diff(this.startTime));
    return duration.format("h [hrs] m [min]");
  },

  currentlyViewedSession() {
    return Template.instance().currentlyViewedSession.get();
  }

});

Template.Page_sessions.onDestroyed(function() {
  Meteor.clearInterval(this.handle);
});

Template.Page_sessions.events({

  'click tr[act-select-session]'(event, instance) {
    event.preventDefault();
    instance.currentlyViewedSession.set(this);
    console.log({currentlyViewedSessionSetTo: this});
  }
});
