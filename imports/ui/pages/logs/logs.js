import './logs.html';

import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Meteor } from 'meteor/meteor';

Date.prototype.subMinutes = function(m){
  this.setMinutes(this.getMinutes()-m);
  return this;
}

const pageSize = 30;

Template.Page_logs.onCreated(function () {
  const instance = this;
  instance.loadingMoreDataPostFactum = new ReactiveVar(false);

  instance.lastDataPointsLimit = new ReactiveVar(pageSize);
  instance.subscribe('dataPoints.lastOnes', instance.lastDataPointsLimit.get());

  instance.lastSessionsLimit = new ReactiveVar(pageSize);
  instance.subscribe('sessions.recent', instance.lastSessionsLimit.get());


  instance.seconds = new ReactiveVar(0);
  instance.handle = Meteor.setInterval((function() {
    instance.seconds.set(instance.seconds.get() + 30);
  }), 30000);
});

Template.Page_logs.helpers({
  dataPoints() {
    return DataPoints.find({}, {
      sort: {endTime: -1}
    });
  },

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
      const isTheSameDay = moment(this.endTime).date() === moment(this.startTime).date(); //moment(this.endTime).diff(this.startTime, 'minutes') < 59;
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
    return duration.format("h [h] m [min]");
  },

  loadingMoreDataPostFactum: () => Template.instance().loadingMoreDataPostFactum.get(),

  dataPointIcon(dataPoint) {
    if (dataPoint.broadcastHasDropped) return "has-text-warning";
    return "has-text-success";
  },

  sessionIcon(session) {
    if (session.broadcastHasDropped) return "has-text-warning";
    if (session.errorCode) return "has-text-danger";
    return "has-text-success";
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
  //       alert(error.message);
  //     } else {
  //       target.raw.value = '';
  //     }
  //   });
  // },

  'click .delete-dataPoint'(event) {
    event.preventDefault();
    if (confirm("Delete entry? This cannot be undone.")) {
      Meteor.call('dataPoints.remove', this._id, (error) => {
        if (error) {
          alert(error.message);
        }
      });
    }
  },

  'click .delete-session'(event) {
    event.preventDefault();
    if (confirm("Delete entry? This cannot be undone.")) {
      Meteor.call('sessions.remove', this._id, (error) => {
        if (error) {
          alert(error.message);
        }
      });
    }
  },
  'click .summarize-session'(event) {
    event.preventDefault();
    Meteor.call('sessions.summarize', this._id, (error, result) => {
      if (error) {
        alert(error.message);
      }
    });
  },

  'click .update-dataPoint'(event, template) {
    try {
      const deltaTokens = parseInt(prompt("Update token amount:"), 10);
      const prevDataPoint = DataPoints.findOne({ endTime: {$lt: this.endTime} }, {
        sort: { endTime: -1 }
      });
      const rawTokens = prevDataPoint.rawTokens + deltaTokens;
      Meteor.call('dataPoints.update', this._id, {
        deltaTokens,
        rawTokens,
      }, (error) => {
        if (error) {
          alert(error.message);
        }
      });
    } catch(e) {
      console.log(e);
    }
  },

  'click .update-dataPoint-fixtime'(event, template) {
    event.preventDefault();
    try {

      const endTime = moment(prompt("Enter End DateTime", moment(this.endTime).format(moment.HTML5_FMT.DATETIME_LOCAL)), [moment.HTML5_FMT.DATETIME_LOCAL, moment.ISO_8601]);
      console.log({endTime});
      if (!endTime || !endTime.isValid() || (endTime).year() < 2000 ) {
        alert("Action aborted");
        return;
      }

      const prevDataPoint = DataPoints.findOne({
        endTime: {$lt: endTime.toDate()}
      }, {
        sort: {endTime: -1},
        limit: 1,
      });

      Meteor.call('dataPoints.update', this._id, {
        startTime: prevDataPoint.endTime,
        endTime: endTime.toDate(),
      }, (error) => {
        if (error) {
          alert(error.message);
        }
      });
    } catch (error) {
      console.log({error});
    }
  },

  'click .loadMore-dataPoints'(event, template) {
    template.loadingMoreDataPostFactum.set(true);
    template.lastDataPointsLimit.set(template.lastDataPointsLimit.get() + pageSize);
    template.subscribe('dataPoints.lastOnes', template.lastDataPointsLimit.get());
  },

  'click .loadMore-sessions'(event, template) {
    template.loadingMoreDataPostFactum.set(true);
    template.lastSessionsLimit.set(template.lastSessionsLimit.get() + pageSize);
    template.subscribe('sessions.recent', template.lastSessionsLimit.get());
  },

  // 'submit .get'(event) {
  //   event.preventDefault();
  //   const target = event.target;
  //   Meteor.call('dataPoints.getDataPointFromChaturbate', target.url.value, (error) => {
  //     if (error) { alert(error.message); }
  //   });
  // }
});
