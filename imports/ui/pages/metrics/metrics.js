import './metrics.html';
// import '/imports/ui/components/dateChartView/dateChartView.js';
import '/imports/ui/components/chartView/chartView.js';

import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Currencies } from '/imports/api/currencies/currencies.js';
import { UserRates } from '/imports/api/userRates/userRates.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { GroupingDelegate } from '/imports/ui/pages/metrics/groupingDelegate.js';
import { ChartSetup } from '/imports/ui/pages/metrics/chartSetup.js';


function _clearSelection(template) {
  template.rowsSelected.get().map(element => $(element).removeClass("cell-is-highlighted"));
  template.rowsSelected.set([]);
}

let isMouseDown = false, isHighlighted;

function _selectCell(event, template, doToggleIsHighlihted = false, checkIfIsHighlighted = false) {
  let rowsSelected = template.rowsSelected.get();
  const highlightClass = "cell-is-highlighted";
  if (checkIfIsHighlighted) {
    $(event.target).toggleClass(highlightClass, isHighlighted);
  } else {
    $(event.target).toggleClass(highlightClass);
  }
  if ($(event.target).hasClass(highlightClass)) {
    if (rowsSelected.indexOf(event.target) === -1) {
      rowsSelected.push(event.target);
      template.rowsSelected.set(rowsSelected);
    }
    if (doToggleIsHighlihted) {
      isHighlighted = true;
    }
  } else {
    rowsSelected.splice( rowsSelected.indexOf(event.target), 1 );
    template.rowsSelected.set(rowsSelected);//_.pull(rowsSelected, event.target));
    if (doToggleIsHighlihted) {
      isHighlighted = false;
    }
  }
}

Template.Page_metrics.onCreated(function() {
  const instance = this;
  instance.subscribe('sessions.all');
  instance.subscribe('dataPoints.all');
  instance.subscribe('userData');
  instance.subscribe('currencies.latest'); // FIXME: subscribe to all! Or think of something else...
  instance.subscribe('userRates.all');

  instance.userDataReady = new ReactiveVar(false);

  instance.autorun(function() {
    if (instance.userDataReady.get()) {
      return;
    }
    const user = Meteor.user();
    if (!user || !user.currencies) {
       return;
    }

    instance.grouping = new ReactiveVar(user.displayOption_metricsGrouping || 'weeks');
    instance.daterange = new ReactiveVar(user.displayOption_metricsDaterange || 90);
    instance.skipOffDays = new ReactiveVar(false);
    instance.coloration = new ReactiveVar();
    instance.rowsSelected = new ReactiveVar([]);
    instance.showTheRest = new ReactiveVar(false);
    instance.dataIsPartiallyHidden = new ReactiveVar(false);

    instance.userDataReady.set(true);

    // instance.timeOnlineChartSetup = null;
    // instance.totalIncomeChartSetup = null;
    instance.triggerChartsRedraw = new ReactiveVar(false);
  });

});

Template.Page_metrics.helpers({

  userDataReady: () => Template.instance().userDataReady.get(),

  metrics() {
    const __timer = new Date();

    function _adjustMinMax(value, minMaxContainer) {
      if (value > minMaxContainer.max) {
        minMaxContainer.max = value;
      }
      if (value < minMaxContainer.min) {
        minMaxContainer.min = value;
      }
    }

    function _defineStyle(value, minMax, numBroadcasts) {
      const percentage = (value - minMax.min) / minMax.delta;
      const hueAngle = Math.round(percentage * 300); // use colors only from 0º to 300º
      const colorLightness = numBroadcasts > 0 ? 30 : 60; // just some on-the-top-of-my-head color lighness values of 30 & 60
      const backgroundLightness = numBroadcasts > 0 ? 93 : 99; // just some on-the-top-of-my-head color lighness values of 30 & 60
      return [
        'background-color:hsl('+hueAngle+', 100%, '+backgroundLightness+'%)',
        'color:hsl('+hueAngle+', 20%, '+colorLightness+'%)',
      ].join(';') + ';';
    }

    function _getConversionMultiplier() {
      const userRate = UserRates.findOne({}, {
        sort: {activeStartingDate: -1}
      });
      return userRate ? userRate.rate : 1;
    }

    function _getDataPointsInRange(fromRounded, upperMoment, sessionsInRange) {
      // Note: This function is the most computationally expensive piece of code here

      const noSessionDataPoints = DataPoints.find({
        sessionId: null,
        startTime: {$exists: true},
        endTime: {
          $gte: fromRounded,
          $lte: upperMoment,
        },
      }).fetch();

      const sessionsDataPoints = DataPoints.find({
        sessionId: {$in: sessionsInRange.map(session => session._id)},
      }).fetch();

      return noSessionDataPoints.concat(sessionsDataPoints);
    }

    const conversionMultiplier = _getConversionMultiplier();
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
      totalDeltaPrimaryCurrency : {
        min: 1000 * conversionMultiplier,
        max: 1000 * conversionMultiplier,
      },
      avgPrimaryCurrency: {
        min: 100 * conversionMultiplier,
        max: 300 * conversionMultiplier,
      },
    };

    const skipOffDays = instance.skipOffDays.get();

    let metrics = [];
    instance.timeOnlineChartSetup = new ChartSetup({colorScheme: 'time'});
    instance.totalIncomeChartSetup = new ChartSetup({colorScheme: ['money', 'tokens']});
    instance.incomeInTKNChartSetup = new ChartSetup({colorScheme: 'tokens'});

    const groupingDelegate = new GroupingDelegate(instance.grouping.get(), instance.daterange.get());

    const showTheRest = instance.showTheRest.get();
    instance.dataIsPartiallyHidden.set(false);

    while (groupingDelegate.shouldContinue()) {

      const sessionsInRange = Sessions.find({
        startTime: {$exists: true},
        endTime: {
          $gte: groupingDelegate.lowerMoment.toDate(),
          $lt: groupingDelegate.upperMoment.toDate(),
        },
      }, {
        sort: {endTime: 1}
      }).fetch();

      const dataPointsInRange = _getDataPointsInRange(groupingDelegate.lowerMoment.toDate(), groupingDelegate.upperMoment.toDate(), sessionsInRange);

      const deltaTokensDuringSessions = dataPointsInRange.reduce((sum, dataPoint) => sum + (!_.isNull(dataPoint.sessionId) ? dataPoint.deltaTokens : 0), 0);
      const deltaTokens = dataPointsInRange.reduce((sum, dataPoint) => sum + dataPoint.deltaTokens, 0);
      const deltaFollowers = dataPointsInRange.reduce((sum, dataPoint) => sum + (dataPoint.deltaFollowers ? dataPoint.deltaFollowers : 0), 0);
      const endTime = moment(groupingDelegate.upperMoment).subtract(1, 'second');

      _adjustMinMax(deltaTokens, coloration.tokens);

      // pre-fetch userRates so that sumExtraIncomeAndTokens doesn't have to do that over and over
      const userRates = UserRates.find({ userId: Meteor.user()._id }, {
        sort: {activeStartingDate: -1}
      }).fetch();

      // let totalDeltaPrimaryCurrency = Math.round(deltaTokens * conversionMultiplier); // FIXME: replace conversionMultiplier with dynamic function
      let totalDeltaPrimaryCurrency = dataPointsInRange.reduce((sum, dataPoint) => sum + UserRates.dataPointsTokensToCurrency(dataPoint, userRates), 0);
      _adjustMinMax(totalDeltaPrimaryCurrency, coloration.totalDeltaPrimaryCurrency);

      if (sessionsInRange.length) {
        const totalMinutesOnline = sessionsInRange.reduce(
          (sum, session) =>
            sum + moment(session.endTime).diff(moment(session.startTime), 'minutes'),
          0);
        const timeOnline = moment.duration(totalMinutesOnline, 'minutes');
        const timeOnlineAsHours = timeOnline.as('hours', true);

        const sumExtraIncomeAndTokens = UserRates.sumExtraIncomeAndTokens(sessionsInRange, userRates);
        const extraCurrency = sumExtraIncomeAndTokens.sum;
        const extraCurrencyHourlyRated = sumExtraIncomeAndTokens.hourlyRatedSum | 0;

        const avgTokens = Math.round(deltaTokensDuringSessions / timeOnlineAsHours);
        _adjustMinMax(avgTokens, coloration.avgTokens);

        const avgPrimaryCurrency = Math.round((deltaTokensDuringSessions * conversionMultiplier + extraCurrencyHourlyRated) / timeOnlineAsHours);  // FIXME: replace conversionMultiplier with dynamic function
        _adjustMinMax(avgPrimaryCurrency, coloration.avgPrimaryCurrency);

        if (extraCurrency !== 0) {
          totalDeltaPrimaryCurrency += extraCurrency;
          _adjustMinMax(totalDeltaPrimaryCurrency, coloration.totalDeltaPrimaryCurrency);
        }

        instance.timeOnlineChartSetup.push({
          x: endTime,
          y: Math.round(timeOnlineAsHours),
        });

        instance.totalIncomeChartSetup.push({
          x: endTime,
          y: Math.round(totalDeltaPrimaryCurrency),
        }, 'money');

        instance.totalIncomeChartSetup.push({
          x: endTime,
          y: deltaTokens,
        }, 'tokens');

        instance.incomeInTKNChartSetup.push({
          x: endTime,
          y: deltaTokens,
        });

        metrics.unshift({
          startTime: groupingDelegate.lowerMoment,
          endTime,
          numBroadcasts: sessionsInRange ? sessionsInRange.length : '–',
          timeOnline: timeOnline.format("h [h] m [m]"),
          deltaTokens,
          deltaTokensToPrimaryCurrency: Math.round(deltaTokens * conversionMultiplier), // FIXME: replace conversionMultiplier with dynamic function
          deltaTokensToUSD: deltaTokens * 0.05,
          // deltaTokensDuringSessions, // TODO: add to interface
          deltaFollowers,
          avgTokens,
          avgTokensToPrimaryCurrency: Math.round(avgTokens * conversionMultiplier), // FIXME: replace conversionMultiplier with dynamic function
          avgTokensToUSD: avgTokens * 0.05,
          sessions: sessionsInRange,
          // notes: sessionsInRange.reduce((sum, session) =>
          //   session.note ? sum + session.note + " ❡ " : sum,
          //   ''),
          totalDeltaPrimaryCurrency,
          avgPrimaryCurrency,
          extraCurrency: extraCurrency ? extraCurrency : '–',
        });
      } else if (!skipOffDays) {
        metrics.unshift({
          startTime: groupingDelegate.lowerMoment,
          endTime,
          numBroadcasts: '–',
          timeOnline: '–',
          deltaTokens,
          // deltaTokensDuringSessions: '–',
          deltaFollowers,
          deltaTokens,
          avgTokens: '–',
          totalDeltaPrimaryCurrency,
          avgPrimaryCurrency: '–',
          extraCurrency: '–',
        });
      }

    } // eof while

    instance.triggerChartsRedraw.set(true);

    function _setColorationDelta(colorationIntance) {
      colorationIntance.delta = colorationIntance.max - colorationIntance.min;
    }

    _setColorationDelta(coloration.tokens);
    _setColorationDelta(coloration.avgTokens)
    _setColorationDelta(coloration.totalDeltaPrimaryCurrency);
    _setColorationDelta(coloration.avgPrimaryCurrency);

    instance.coloration.set(coloration);

    if (coloration.tokens.delta) {
      metrics.forEach((metric) => {
        metric.deltaTokensStyle = _defineStyle(metric.deltaTokens, coloration.tokens, metric.numBroadcasts);
        metric.avgTokensStyle   = _defineStyle(metric.avgTokens,   coloration.avgTokens, metric.numBroadcasts);
        metric.totalDeltaPrimaryCurrencyStyle = _defineStyle(metric.totalDeltaPrimaryCurrency, coloration.totalDeltaPrimaryCurrency, metric.numBroadcasts);
        metric.avgPrimaryCurrencyStyle = _defineStyle(metric.avgPrimaryCurrency, coloration.avgPrimaryCurrency, metric.numBroadcasts);
      });
    }

    const maxFastRenderTableSize = 60;
    if (!showTheRest && metrics.length >= maxFastRenderTableSize) {
      instance.dataIsPartiallyHidden.set(true);
      metrics = _.take(metrics, maxFastRenderTableSize);
    }

    console.log('Execution time for metrics helper: ', new Date() - __timer);

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

  daterangeLabel(switchOn) {
    console.log({switchOn});
    switch (switchOn) {
      case 'allTime':
        return "All time";
        break;
      case '1month':
        return "Last month";
        break;
      case '3months':
        return "Last 3 months";
        break;
      case '6months':
        return "Last 6 months";
        break;
      case '12months':
        return "Last year";
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

  daterangeOptions: () => [
    '1month',
    '3months',
    '6months',
    '12months',
    'allTime'
  ],

  daterange: () => Template.instance().daterange.get(),

  skipOffDays: () => Template.instance().skipOffDays.get(),

  coloration: () => Template.instance().coloration.get(),

  skipOffDaysToggleApplicable: () => Template.instance().grouping.get() === 'days',

  timeframe() {
    const isTheSameDay = moment(this.endTime).date() === moment(this.startTime).date();
    const isTheSameMonth = moment(this.endTime).month() === moment(this.startTime).month();
    const isTheSameYear = moment(this.endTime).year() === moment(this.startTime).year();
    const start = this.startTime ? moment(this.startTime).format(isTheSameYear ? 'MMM D' : 'll') : '-∞ to ';
    let end = '';
    if (isTheSameDay) {
      return moment(this.startTime).format('ddd, MMM D, YYYY');
    }
    end = moment(this.endTime).format(isTheSameMonth ? 'D, YYYY' : 'll');
    return start + ' - ' + end;
  },

  rowClasses() {
    return this.numBroadcasts === '–' || this.numBroadcasts === 0 ? "has-text-grey-light" : null;
  },

  sessionIndex(index) {
    return index + 1;
  },

////////

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
    return this.sessions ? this.sessions.length > 1 : null;
  },

  userCurrencyLabel() {
    const userRate = UserRates.findOne({}, {
      sort: {activeStartingDate: -1}
    });
    return userRate ? userRate.currency : "–";
  },

  totalExtraIncome() {
    if (this.extraIncome && this.extraIncome.length) {
      return this.extraIncome.reduce((sum, item) => sum + item.value, 0).toLocaleString('en')
        + ' ' + this.extraIncome[0].currency;
    }
  },


////////


  selectedCellsSum() {
    rowsSelected = Template.instance().rowsSelected.get();
    return rowsSelected.reduce((sum, element) => (parseFloat($(element).attr("data-value")) || 0) + sum, 0);
  },

  selectedCellsAvg() {
    rowsSelected = Template.instance().rowsSelected.get();
    const _sum = rowsSelected.reduce((sum, element) => (parseFloat($(element).attr("data-value")) || 0) + sum, 0);
    return Math.round(_sum / rowsSelected.length * 10) / 10;
  },

  selectedCellsMax() {
    rowsSelected = Template.instance().rowsSelected.get();
    return rowsSelected.reduce(function(max, element) {
      const value = (parseFloat($(element).attr("data-value")) || 0);
      return value > max ? value : max;
    } , 0);
  },

  rowsSelected: () => Template.instance().rowsSelected.get(),

////////

  dataIsPartiallyHidden: () => Template.instance().dataIsPartiallyHidden.get(),

  triggerChartsRedraw : () => Template.instance().triggerChartsRedraw.get(),

  timeOnlineChartSetup() {
    if (Template.instance().triggerChartsRedraw.get()) {
      return Template.instance().timeOnlineChartSetup;
    }
  },

  totalIncomeChartSetup() {
    if (Template.instance().triggerChartsRedraw.get()) {
      return Template.instance().totalIncomeChartSetup;
    }
  },

  incomeInTKNChartSetup() {
    if (Template.instance().triggerChartsRedraw.get()) {
      return Template.instance().incomeInTKNChartSetup;
    }
  },

////////

});

Template.Page_metrics.events({

  'click .set-grouping'(event, template) {
    event.preventDefault();
    const self = this;
    _clearSelection(template);
    template.triggerChartsRedraw.set(false);
    template.grouping.set(self.toString());
    Meteor.call('users.setDisplayOption', 'metricsGrouping', self.toString());
  },

  'click .set-daterange'(event, template) {
    event.preventDefault();
    const self = this;
    _clearSelection(template);
    template.triggerChartsRedraw.set(false);
    template.daterange.set(self.toString());
    Meteor.call('users.setDisplayOption', 'metricsDaterange', self.toString());
  },

  'click .toggle-skip-offdays'(event, template) {
    event.preventDefault();
    const skipOffDays = template.skipOffDays;
    skipOffDays.set(!skipOffDays.get());
    _clearSelection(template);
  },

  'click .show-the-rest'(event, template) {
    template.showTheRest.set(true);
  },

////////

  'mousedown [data-value]'(event, template) {
    event.preventDefault();
    isMouseDown = true;
    _selectCell(event, template, true);
  },

  'mouseover [data-value]'(event, template) {
    if (isMouseDown) {
      _selectCell(event, template, false, true);
    }
  },

  'mouseup'() {
    if (isMouseDown) {
      isMouseDown = false;
    }
  },

  'click #clear-selection'(event, template) {
    _clearSelection(template);
  },

////////

});
