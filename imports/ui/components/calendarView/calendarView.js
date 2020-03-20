import { Meteor } from 'meteor/meteor';
import './calendarView.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import Calendar from 'tui-calendar';

Template.calendarView.onCreated(function() {
  this.subscribe('sessions.all');
  this.subscribe('dataPoints.all');
});

Template.calendarView.onRendered(function() {

  const instance = this;

  this.calendar = new Calendar('#calendar', {
    defaultView: FlowRouter.getParam('calendarViewMode'),
    // scheduleView: false,
    taskView: true,
    isReadOnly: true,
    useDetailPopup: true,
    template: {
      monthGridHeader: function(model) {
        var date = new Date(model.date);
        var template = '<span class="tui-full-calendar-weekday-grid-date">' + date.getDate() + '</span>';
        return template;
      },
      allday: function(schedule) {
        return schedule.title;// + ' <i class="far fa-refresh"></i>';
      },
      alldayTitle: function() {
        return '<span class="tui-full-calendar-left-content">Summary</span>';
      },
    }
  });

  this.calendar.setTheme({
    'week.timegridSchedule.borderRadius': '0',
  });

  this.calendar.on('clickSchedule', function(event) {
    var schedule = event.schedule;
    console.log({event, schedule});
    //
    // if (lastClickSchedule) {
    //     calendar.updateSchedule(lastClickSchedule.id, lastClickSchedule.calendarId, {
    //         isFocused: false
    //     });
    // }
    // calendar.updateSchedule(schedule.id, schedule.calendarId, {
    //     isFocused: true
    // });
    //
    // lastClickSchedule = schedule;
    // // open detail view
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
        color: '#2576af',
        borderColor: '#2576af',
        bgColor: 'rgba(59, 173, 248, 0.15)',
      }
    }));

  });

});

Template.calendarView.events({

  'click .act-previous'(event, instance) {
    event.preventDefault();
    instance.calendar.prev();
  },
  'click .act-next'(event, instance) {
    event.preventDefault();
    instance.calendar.next();
  },

  'click .act-today'(event, instance) {
    event.preventDefault();
    instance.calendar.today();
  },
});
