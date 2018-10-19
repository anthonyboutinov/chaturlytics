import './metrics.html';
// import '/imports/ui/components/dateChartView/dateChartView.js';

import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Currencies } from '/imports/api/currencies/currencies.js';
import { UserRates } from '/imports/api/userRates/userRates.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';

// const _chartConfigs = {
//   deltaTokens: {
//     data: [
//       {
//         label: "Delta Tokens",
//         fill: true,
//         borderColor: 'rgba(140, 206, 140, 1)',
//         backgroundColor: 'rgba(140, 206, 140, 1)',
//         dataAlias: 'deltaTokens',
//         yAxisID: 'generic',
//       },
//     ],
//   },
// };

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
  instance.subscribe('currencies.latest');

  this.grouping = new ReactiveVar('weeks');
  this.skipOffDays = new ReactiveVar(false);
  this.displayNotes = new ReactiveVar(false);
  this.coloration = new ReactiveVar();
  this.rowsSelected = new ReactiveVar([]);

});

Template.Page_metrics.helpers({

  metrics() {
    const __timer = new Date();

    // function _getConversionMultiplier(usersTokenToUSDRate) {
    //   const user = Meteor.user();
    //   if (!user) {
    //     return "ND";
    //   }
    //   const primaryCurrency = user.primaryCurrency;
    //   const currencies = Currencies.findOne();
    //   if (!currencies) {
    //     return "ND";
    //   }
    //   const rates = currencies.rates;
    //   const rate = rates['USD']; // TODO: get what primary currency is from user collection
    //   return usersTokenToUSDRate * rate;
    // }

    function _adjustMinMax(value, minMaxContainer) {
      if (value > minMaxContainer.max) {
        minMaxContainer.max = value;
      }
      if (value < minMaxContainer.min) {
        minMaxContainer.min = value;
      }
    }

    function _getFromToRounded(descriptiveGroupingInterval) {
      const edgeDataPointQuery = { startTime: {$exists: true} };
      const firstOne = DataPoints.findOne(edgeDataPointQuery, {
        sort: {endTime: 1},
        limit: 1,
        fields: {endTime: 1}
      });
      if (!firstOne) {
        return;
      }
      const lastOne = DataPoints.findOne(edgeDataPointQuery, {
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

      if (descriptiveGroupingInterval === 'months' || descriptiveGroupingInterval === 'halvesOfMonth') {
        fromRounded = fromRounded.startOf('month');
      } else if (descriptiveGroupingInterval === 'years') {
        fromRounded = fromRounded.startOf('year');
      } else if (descriptiveGroupingInterval === 'weeks') {
        fromRounded = fromRounded.startOf('week');
      }
      return {fromRounded, lastDatetimeRounded};
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

    const userRate = UserRates.findOne({});
    const conversionMultiplier = userRate ? userRate.rate : 1;
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

    let groupingInterval = instance.grouping.get();
    const descriptiveGroupingInterval = groupingInterval;
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

    const fromToRounded = _getFromToRounded(descriptiveGroupingInterval);

    let metrics = [];

    let doSwap = descriptiveGroupingInterval === 'halvesOfMonth';
    let swapHandle = fromToRounded.fromRounded.date() >= 15;

    // while fromToRounded.fromRounded is before fromToRounded.lastDatetimeRounded
    while (moment.max(fromToRounded.fromRounded, fromToRounded.lastDatetimeRounded) === fromToRounded.lastDatetimeRounded) {
      let toRounded;
      if (doSwap) {
        if (swapHandle) {
          toRounded = moment(fromToRounded.fromRounded).date(1).add(1, 'month');
        } else {
          // mimic default behaviour
          toRounded = moment(fromToRounded.fromRounded).add(groupingStep, groupingInterval);
          if (toRounded.date() >= 28) {
            toRounded = moment(fromToRounded.fromRounded).date(1).add(1, 'month');
          }
        }
        swapHandle != swapHandle;
      } else {
        // defalut behaviour
        toRounded = moment(fromToRounded.fromRounded).add(groupingStep, groupingInterval);
      }
      const query = {
        startTime: {$exists: true},
        endTime: {
          $gte: fromToRounded.fromRounded.toDate(),
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
      const deltaFollowers = dataPointsInRange.reduce((sum, dataPoint) => sum + (dataPoint.deltaFollowers ? dataPoint.deltaFollowers : 0), 0);
      const endTime = moment(toRounded).subtract(1, 'second');

      _adjustMinMax(deltaTokens, coloration.tokens);

      let totalDeltaPrimaryCurrency = Math.round(deltaTokens * conversionMultiplier);
      _adjustMinMax(totalDeltaPrimaryCurrency, coloration.totalDeltaPrimaryCurrency);

      if (sessionsInRange.length) {
        const totalMinutesOnline = sessionsInRange.reduce(
          (sum, session) =>
            sum + moment(session.endTime).diff(moment(session.startTime), 'minutes'),
          0);
        const timeOnline = moment.duration(totalMinutesOnline, 'minutes');

        const timeOnlineAsHours = timeOnline.as('hours', true);

        const extraCurrencyInTokens = Math.round(sessionsInRange.reduce((sum, session) => {
          if (session.extraIncome) {
            return sum +
              session.extraIncome.reduce((subsum, item) => subsum + item.value / userRate.rate, 0); // FIXME: currency and conversion rate!!!
          }
          return sum;
        }, 0));

        const extraCurrency = sessionsInRange.reduce((sum, session) => {
          if (session.extraIncome) {
            return sum +
              session.extraIncome.reduce((subsum, item) => subsum + item.value, 0);
          }
          return sum;
        }, 0);

        const avgExtraCurrencyInTokens = Math.round(extraCurrencyInTokens / timeOnlineAsHours);

        const avgTokens = Math.round(deltaTokensDuringSessions / timeOnlineAsHours);
        _adjustMinMax(avgTokens, coloration.avgTokens);

        const avgPrimaryCurrency = Math.round((avgTokens + avgExtraCurrencyInTokens) * conversionMultiplier);
        _adjustMinMax(avgPrimaryCurrency, coloration.avgPrimaryCurrency);

        // console.log({extraCurrencyInTokens, avgExtraCurrencyInTokens, extraCurrency});
        if (extraCurrencyInTokens) {
          totalDeltaPrimaryCurrency += extraCurrencyInTokens * conversionMultiplier;
          _adjustMinMax(totalDeltaPrimaryCurrency, coloration.totalDeltaPrimaryCurrency);
        }



        metrics.unshift({
          startTime: fromToRounded.fromRounded,
          endTime,
          numBroadcasts: sessionsInRange ? sessionsInRange.length : '–',
          timeOnline: timeOnline.format("h [h] m [m]"),
          deltaTokens,
          // deltaTokensDuringSessions, // TODO: add to interface
          deltaFollowers,
          avgTokens,
          sessions: sessionsInRange,
          notes: sessionsInRange.reduce((sum, session) =>
            session.note ? sum + session.note + " ❡ " : sum,
            ''),
          totalDeltaPrimaryCurrency,
          avgPrimaryCurrency,
          extraCurrency: extraCurrency ? extraCurrency : '–',
        });
      } else if (!skipOffDays) {
        metrics.unshift({
          startTime: fromToRounded.fromRounded,
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

      fromToRounded.fromRounded = toRounded;
    } // eof while

    function _setColorationDelta(colorationIntance) {
      colorationIntance.delta = colorationIntance.max - colorationIntance.min;
    }

    _setColorationDelta(coloration.tokens);
    _setColorationDelta(coloration.avgTokens)
    _setColorationDelta(coloration.totalDeltaPrimaryCurrency);
    _setColorationDelta(coloration.avgPrimaryCurrency);

    instance.coloration.set(coloration);

    console.log({coloration, metrics});

    if (coloration.tokens.delta) {
      _.each(metrics, (metric) => {
        metric.deltaTokensStyle = _defineStyle(metric.deltaTokens, coloration.tokens, metric.numBroadcasts);
        metric.avgTokensStyle   = _defineStyle(metric.avgTokens,   coloration.avgTokens, metric.numBroadcasts);
        metric.totalDeltaPrimaryCurrencyStyle = _defineStyle(metric.totalDeltaPrimaryCurrency, coloration.totalDeltaPrimaryCurrency, metric.numBroadcasts);
        metric.avgPrimaryCurrencyStyle = _defineStyle(metric.avgPrimaryCurrency, coloration.avgPrimaryCurrency, metric.numBroadcasts);
      });
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
    return this.sessions ? this.sessions.length > 1 : null;
  },

  userCurrencyLabel() {
    const userRate = UserRates.findOne({});
    return userRate ? userRate.currency : null;
  },

  totalExtraIncome() {
    if (this.extraIncome && this.extraIncome.length) {
      return this.extraIncome.reduce((sum, item) => sum + item.value, 0).toLocaleString('en')
        + ' ' + this.extraIncome[0].currency;
    }
  },


///////


  selectedCellsSum() {
    rowsSelected = Template.instance().rowsSelected.get();
    return rowsSelected.reduce((sum, element) => (parseFloat($(element).attr("data-value")) || 0) + sum, 0);
  },

  selectedCellsAvg() {
    rowsSelected = Template.instance().rowsSelected.get();
    const _sum = rowsSelected.reduce((sum, element) => (parseFloat($(element).attr("data-value")) || 0) + sum, 0);
    return Math.round(_sum / rowsSelected.length * 10) / 10;
  },

  rowsSelected: () => Template.instance().rowsSelected.get(),


////////



});

Template.Page_metrics.events({

  'click .set-grouping'(event, template) {
    event.preventDefault();
    template.grouping.set(this.toString());
    _clearSelection(template);
  },

  'click .toggle-skip-offdays'(event, template) {
    event.preventDefault();
    const skipOffDays = template.skipOffDays;
    skipOffDays.set(!skipOffDays.get());
    _clearSelection(template);
  },

  'click .toggle-display-notes'(event, template) {
    event.preventDefault();
    const displayNotes = template.displayNotes;
    displayNotes.set(!displayNotes.get());
    _clearSelection(template);
  },

  // 'click [data-value]'(event, template) {
  //   _selectCell(_.pull, event, template);
  // },

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
    isMouseDown = false;
  },

  'click #clear-selection'(event, template) {
    _clearSelection(template);
  },

});
