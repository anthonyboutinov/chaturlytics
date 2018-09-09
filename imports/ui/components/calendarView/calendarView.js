import { Meteor } from 'meteor/meteor';
import './calendarView.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import Calendar from 'tui-calendar';

Template.calendarView.onCreated(function() {
  Meteor.subscribe('sessions.all');
  Meteor.subscribe('dataPoints.all');
});

Template.calendarView.onRendered(function() {

  const instance = this;

  this.calendar = new Calendar('#calendar', {
    defaultView: FlowRouter.getParam('calendarViewMode'),
    // scheduleView: false,
    taskView: false,
    isReadOnly: true,
    template: {
      monthGridHeader: function(model) {
        var date = new Date(model.date);
        var template = '<span class="tui-full-calendar-weekday-grid-date">' + date.getDate() + '</span>';
        return template;
      },
      allday: function(schedule) {
        return schedule.title + ' <i class="fa fa-refresh"></i>';
      },
      alldayTitle: function() {
        return '<span class="tui-full-calendar-left-content">Summary</span>';
      },
    }
  });

  this.autorun(function() {
    FlowRouter.watchPathChange();
    instance.calendar.changeView(FlowRouter.getParam('calendarViewMode'));

    instance.calendar.clear();
    instance.calendar.createSchedules(Sessions.find({}).fetch().map(function(session) {

      let sumTokens = 0;
      DataPoints.find({sessionId: session._id}, {
        fields: { deltaTokens: 1}
      }).map(function(doc) {sumTokens += doc.deltaTokens});

      // console.log({sessionsDataPoints, sumTokens});
      return {
        id: session._id,
        calendarId: '1',
        title: moment(session.startTime).format("LT") + (session.endTime ? '-' + moment(session.endTime).format("LT") : '') + ': ' + sumTokens + 'TKN',
        start: session.startTime.toString(),
        end: session.endTime.toString(),
        category: 'time',
      }
    }));

  });

});

Template.calendarView.events({

  'click .pagination-previous'(event, instance) {
    event.preventDefault();
    instance.calendar.prev();
  },
  'click .pagination-next'(event, instance) {
    event.preventDefault();
    instance.calendar.next();
  },
});
