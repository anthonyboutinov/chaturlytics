import './logs.html';

import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Meteor } from 'meteor/meteor';

Date.prototype.subMinutes = function(m){
  this.setMinutes(this.getMinutes()-m);
  return this;
}

Template.Page_logs.onCreated(function () {
  // Meteor.subscribe('dataPoints.forDates', (new Date()).subMinutes(60*24), new Date());
  Meteor.subscribe('dataPoints.all');

  // const d = new Date();
  // d.setMonth(d.getMonth() - 1);
  // Meteor.subscribe('sessions.forDates', d, new Date());
  Meteor.subscribe('sessions.all');


  var instance = this;
  instance.seconds = new ReactiveVar(0);
  instance.handle = Meteor.setInterval((function() {
    instance.seconds.set(instance.seconds.get() + 30);
  }), 30000);
});

Template.Page_logs.helpers({
  dataPoints() {
    return DataPoints.find({});
  },
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
      const isLessThanHourLong = moment(this.endTime).date() === moment(this.startTime).date(); //moment(this.endTime).diff(this.startTime, 'minutes') < 59;
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
});

Template.Page_logs.onDestroyed(function() {
  Meteor.clearInterval(this.handle);
});

Template.Page_logs.events({
  // 'submit .add'(event) {
  //   event.preventDefault();
  //   const target = event.target;
  //   Meteor.call('dataPoints.insertIndepenentlyFromRawData', target.raw.value, (error) => {
  //     if (error) {
  //       alert(error.error);
  //     } else {
  //       target.raw.value = '';
  //     }
  //   });
  // },

  'click .delete-dataPoint'(event) {
    event.preventDefault();
    Meteor.call('dataPoints.remove', this._id, (error) => {
      if (error) {
        alert(error.error);
      }
    });
  },

  'click .delete-session'(event) {
    event.preventDefault();
    Meteor.call('sessions.remove', this._id, (error) => {
      if (error) {
        alert(error.error);
      }
    });
  },

  // 'submit .get'(event) {
  //   event.preventDefault();
  //   const target = event.target;
  //   Meteor.call('dataPoints.getDataPointFromChaturbate', target.url.value, (error) => {
  //     if (error) { alert(error.error); }
  //   });
  // }
});
