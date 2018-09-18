import './sessionInfoView.html';
import '../../components/dateChartView/dateChartView.js';

// import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Meteor } from 'meteor/meteor';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';

Date.prototype.subMinutes = function(m){
  this.setMinutes(this.getMinutes()-m);
  return this;
}

Template.sessionInfoView.onCreated(() => {

  Meteor.subscribe('dataPoints.forSession', Template.currentData().session._id);

});

Template.sessionInfoView.helpers({

  timeframe(session) {
    // const start = session.startTime ? moment(session.startTime).format('lll') + ' - ' : '-∞ to ';
    const start = session.startTime ? moment(session.startTime).calendar() + ' - ' : '-∞ to ';
    let end = '';
    // let format = 'lll';
    end = moment(session.endTime).calendar();
    if (session.endTime) {
      const isTheSameDay = moment(session.endTime).date() === moment(session.startTime).date();
      if (session.startTime && isTheSameDay) {
        // format = 'LT';
        end = moment(session.endTime).format('LT');
      }
      // end = moment(session.endTime).format(format);
    }
    return start + end;
  },

  duration() {
    const session = Template.currentData().session;

    if (!session.endTime) {
      return moment(session.startTime).fromNow(true);
    }
    const endTime = session.endTime || new Date();

    const duration = moment.duration(moment(endTime).diff(session.startTime));
    return duration.format("h [hrs], m [min]");
  },

  sumColumn(name) {
    const session = Template.currentData().session;
    let sum = 0;
    DataPoints.find({sessionId: session._id}).map((point) => {
      sum += point[name]
    });
    return sum;
  },

  viewers() {
    const session = Template.currentData().session;
    let max = 0;
    DataPoints.find({sessionId: session._id}).map((point) => {
      max = Math.max(max, point.numViewers)
    });
    return max;
  },

});

Template.sessionInfoView.events({

});
