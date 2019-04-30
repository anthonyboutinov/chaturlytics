import './sessions.html';

import '../../components/sessionInfoView/sessionInfoView.js';

// import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Meteor } from 'meteor/meteor';

Date.prototype.subMinutes = function(m){
  this.setMinutes(this.getMinutes()-m);
  return this;
}

let flag = false;

Template.Page_sessions.onCreated(function () {
  const instance = this;
  instance.subscribe('sessions.all');
  instance.subscribe('userRates.latest');

  instance.seconds = new ReactiveVar(0);
  instance.handle = Meteor.setInterval((function() {
    instance.seconds.set(instance.seconds.get() + 30);
  }), 30000);

  instance.currentlyViewedSession = new ReactiveVar(false);
});

Template.Page_sessions.helpers({

  sessions() {
    return Sessions.find({
      endTime: {$ne: null}
    }, {
      sort: {endTime: -1}
    });
  },

  ongoingSession() {
    return Sessions.findOne({
      endTime: null,
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
      const isTheSameDay = moment(this.endTime).date() === moment(this.startTime).date();
      if (this.startTime && isTheSameDay) {
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
    const instance = Template.instance();
    const reactiveVar = instance.currentlyViewedSession.get();
    if (reactiveVar) {
      return reactiveVar;
    }

    if (!flag) {
      const sessionId = FlowRouter.getParam('_id');
      const session = Sessions.findOne(sessionId);
      if (session) {
        // instance.currentlyViewedSession.set(session);
        flag = true;
        console.log("FLAG to true", session);
        return session;
      }
    }
    return null;

    // FlowRouter.watchPathChange();
    // return Sessions.findOne({_id: FlowRouter.getParam('_id')});
  },

  isSelected() {
    const session = Template.instance().currentlyViewedSession.get();
    const result =
      (session && this._id === session._id)
      // || !session && FlowRouter.getParam('_id') === this._id
      ? "is-selected" : null;
    return result;
  },

  totalExtraIncome() {
    if (this.extraIncome && this.extraIncome.length) {
      return this.extraIncome.reduce((sum, item) => sum + item.value, 0).toLocaleString('en')
        + ' ' + this.extraIncome[0].currency;
    }
  },

  notePreview() { // FIXME: set it as part of specification and rm all instances of this method from such places
    if (!this.note) {
      return;
    }
    const limit = 128;
    const substring = this.note.replace(/<br> *<br>/g, '<br>').substring(0, limit);
    return substring + (this.note.length > limit ? '…' : '');
  },

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
  },

});
