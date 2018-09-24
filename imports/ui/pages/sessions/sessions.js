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
    return Sessions.find({}, {
      sort: {endTime: -1}
    });
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
    // FlowRouter.watchPathChange();
    // const session = Sessions.findOne({_id: FlowRouter.getParam('_id')});
    // console.log({session});
    // return session;
  },

  isActive() {
    const session = Template.instance().currentlyViewedSession.get();
    return session && this._id === session._id ? "is-selected" : null;
  }

});

Template.Page_sessions.onDestroyed(function() {
  Meteor.clearInterval(this.handle);
});

Template.Page_sessions.events({

  'click .do-open'(event, instance) {
    event.preventDefault();
    const self = this;
    Meteor.setTimeout(()=>{
      instance.currentlyViewedSession.set(self);
      // console.log({currentlyViewedSessionSetTo: self});
    }, 200);
    instance.currentlyViewedSession.set(null);
    // console.log({currentlyViewedSessionSetTo: null});

  }
});
