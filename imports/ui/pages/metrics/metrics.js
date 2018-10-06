import './metrics.html';

import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';

Template.Page_metrics.onCreated(function() {
  Meteor.subscribe('sessions.all');
  Meteor.subscribe('dataPoints.all');

  this.grouping = new ReactiveVar('weeks');
  this.skipOffDays = new ReactiveVar(false);
  this.displayNotes = new ReactiveVar(false);
  this.coloration = new ReactiveVar();
});

Template.Page_metrics.helpers({

  metrics() {
    const __timer = new Date();

    const instance = Template.instance();

    let coloration = {
      tokens: {
        min: 1000,
        max: 1000,
      },
      avgTokens: {
        min: 100,
        max: 300,
      },
    };

    let groupingInterval = instance.grouping.get();
    const skipOffDays = instance.skipOffDays.get();

    const isPrimitiveGrouping = groupingInterval === 'days' || groupingInterval === 'weeks' || groupingInterval === 'months' || groupingInterval === 'years';
    const groupingStep = isPrimitiveGrouping ? 1 :
      groupingInterval === 'halvesOfMonth' ? 15 : null;
    if (!isPrimitiveGrouping) {
      groupingInterval = groupingInterval === 'halvesOfMonth' ? 'days' : null;
    }
    if (!groupingStep || !groupingInterval) {
      throw 'This Grouping is not covered';
    }

    const firstOne = DataPoints.findOne({
      startTime: {$exists: true}
    }, {
      sort: {endTime: 1},
      limit: 1,
      fields: {endTime: 1}
    });
    if (!firstOne) {
      return;
    }
    const lastOne = DataPoints.findOne({
      startTime: {$exists: true}
    }, {
      sort: {endTime: -1},
      limit: 1,
      fields: {endTime: 1}
    });

    let fromRounded = moment(firstOne.endTime)
      .set('hour', 0)
      .set('minute', 0)
      .set('second', 0)
      .set('millisecond', 0);
    const lastDatetimeRounded = moment(lastOne.endTime)
      .set('hour', 0)
      .set('minute', 0)
      .set('second', 0)
      .set('millisecond', 0)
      .add(1, 'days');

    let metrics = [];

    // while fromRounded is before lastDatetimeRounded
    while (moment.max(fromRounded, lastDatetimeRounded) === lastDatetimeRounded) {
      const toRounded = moment(fromRounded).add(groupingStep, groupingInterval);
      const query = {
        startTime: {$exists: true},
        endTime: {
          $gte: fromRounded.toDate(),
          $lt: toRounded.toDate(),
        },
      };
      // const queryDuringSessions = _.cloneDeep(query);
      // queryDuringSessions.sessionId = {$exists: true};

      const sessionsInRange = Sessions.find(query, {
        sort: {endTime: 1}
      }).fetch();
      const dataPointsInRange = DataPoints.find(query).fetch();
      // const dataPointsInRangeDuringSessions = DataPoints.find(queryDuringSessions).fetch();
      // const dataPointsInRangeDuringSessions = _.filter(dataPointsInRange, (dataPoint) => dataPoint.sessionId);

      const deltaTokensDuringSessions = dataPointsInRange.reduce((sum, dataPoint) => sum + (!_.isNull(dataPoint.sessionId) ? dataPoint.deltaTokens : 0), 0);
      const deltaTokens = dataPointsInRange.reduce((sum, dataPoint) => sum + dataPoint.deltaTokens, 0);
      const deltaFollowers = dataPointsInRange.reduce((sum, dataPoint) => sum + dataPoint.deltaFollowers, 0);
      const endTime = moment(toRounded).subtract(1, 'second');

      if (deltaTokens > coloration.tokens.max) {
        coloration.tokens.max = deltaTokens;
      }
      if (deltaTokens < coloration.tokens.min) {
        coloration.tokens.min = deltaTokens;
      }

      if (sessionsInRange.length) {
        const totalMinutesOnline = sessionsInRange.reduce(
          (sum, session) =>
            sum + moment(session.endTime).diff(moment(session.startTime), 'minutes'),
          0);
        const timeOnline = moment.duration(totalMinutesOnline, 'minutes');

        const timeOnlineAsHours = timeOnline.as('hours', true);
        const avgTokens = Math.round(deltaTokensDuringSessions / timeOnlineAsHours, -1);
        if (avgTokens > coloration.avgTokens.max) {
          coloration.avgTokens.max = avgTokens;
        }
        if (avgTokens < coloration.avgTokens.min) {
          coloration.avgTokens.min = avgTokens;
        }

        metrics.unshift({
          startTime: fromRounded,
          endTime,
          numBroadcasts: sessionsInRange ? sessionsInRange.length : '–',
          timeOnline: timeOnline.format("h [hrs] m [min]"),
          deltaTokens,
          deltaTokensDuringSessions, // TODO: add to interface
          deltaFollowers,
          avgTokens,
          sessions: sessionsInRange,
          notes: sessionsInRange.reduce((sum, session) =>
            session.note ? sum + session.note + " ❡ " : sum,
            ''),
        });
      } else if (!skipOffDays) {
        metrics.unshift({
          startTime: fromRounded,
          endTime,
          numBroadcasts: '–',
          timeOnline: '–',
          deltaTokens,
          deltaTokensDuringSessions: '–',
          deltaFollowers,
          deltaTokens,
        });
      }

      fromRounded = toRounded;
    } // eof while

    coloration.tokens.delta = coloration.tokens.max - coloration.tokens.min;
    coloration.avgTokens.delta = coloration.avgTokens.max - coloration.avgTokens.min;
    instance.coloration.set(coloration);

    console.log({coloration, metrics});

    if (coloration.tokens.delta) {
      function _defineStyle(value, minMax, numBroadcasts) {
        const percentage = (value - minMax.min) / minMax.delta;
        const hueAngle = Math.round(percentage * 300, 0); // use colors only from 0º to 300º
        const colorLightness = numBroadcasts > 0 ? 30 : 60; // just some on-the-top-of-my-head color lighness values of 30 & 60
        const backgroundLightness = numBroadcasts > 0 ? 93 : 99; // just some on-the-top-of-my-head color lighness values of 30 & 60
        return [
          'background-color:hsl('+hueAngle+', 100%, '+backgroundLightness+'%)',
          'color:hsl('+hueAngle+', 20%, '+colorLightness+'%)',
        ].join(';');
      }
      _.each(metrics, (metric) => {
        metric.deltaTokensStyle = _defineStyle(metric.deltaTokens, coloration.tokens, metric.numBroadcasts);
        metric.avgTokensStyle   = _defineStyle(metric.avgTokens,   coloration.avgTokens, metric.numBroadcasts);
      });
    }

    console.log('Execution time: ', new Date() - __timer);

    return metrics;
  },

  groupingLabel(switchOn) {
    switch (switchOn) {
      case 'days':
        return 'By days';
        break;
      case 'weeks':
        return 'By weeks';
        break;
      case 'halvesOfMonth':
        return 'By halves of month';
        break;
      case 'months':
        return 'By months';
        break;
      case 'years':
        return 'By years';
        break;
      default:
        console.warn('Invalid case');
        return 'Invalid value';
    }
  },

  isActiveByEquals: (a, b) => a === b ? "is-active" : null,

  groupingOptions: () => [
    'days',
    'weeks',
    'halvesOfMonth',
    'months',
    'years',
  ],

  grouping: () => Template.instance().grouping.get(),

  skipOffDays: () => Template.instance().skipOffDays.get(),

  displayNotes: () => Template.instance().displayNotes.get(),

  coloration: () => Template.instance().coloration.get(),

  skipOffDaysToggleApplicable: () => Template.instance().grouping.get() === 'days',

  timeframe() {
    const start = this.startTime ? moment(this.startTime).format('ll') : '-∞ to ';
    let end = '';
    let format = 'll';
    if (this.endTime) {
      const isTheSameDay = moment(this.endTime).date() === moment(this.startTime).date(); //moment(this.endTime).diff(this.startTime, 'minutes') < 59;
      if (isTheSameDay) {
        return moment(this.startTime).format('dddd, MMM D, YYYY');
      }
      end = moment(this.endTime).format(format);
    }
    return start + ' - ' + end;
  },

  rowClasses() {
    return this.numBroadcasts === '–' || this.numBroadcasts === 0 ? "has-text-grey-light" : null;
  },

  sessionIndex(index) {
    return index + 1;
  },

  ////

  timeframeForSession() {
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

  ////

  moreThanOneSession() {
    return this.sessions.length > 1;
  },

});

Template.Page_metrics.events({

  'click .set-grouping'(event) {
    event.preventDefault();
    Template.instance().grouping.set(this.toString());
  },

  'click .toggle-skip-offdays'(event) {
    event.preventDefault();
    const skipOffDays = Template.instance().skipOffDays;
    skipOffDays.set(!skipOffDays.get());
  },

  'click .toggle-display-notes'(event) {
    event.preventDefault();
    const displayNotes = Template.instance().displayNotes;
    displayNotes.set(!displayNotes.get());
  },

});
