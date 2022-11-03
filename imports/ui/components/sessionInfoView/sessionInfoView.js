import './sessionInfoView.html';
import './briefIsHistorical.html';
import '/imports/ui/components/dateChartView/dateChartView.js';

import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { UserRates } from '/imports/api/userRates/userRates.js';
import { Currencies } from '/imports/api/currencies/currencies.js';

Date.prototype.subMinutes = function(m){
  this.setMinutes(this.getMinutes()-m);
  return this;
}

const notePlaceholder = 'Add a note';

Template.sessionInfoView.onCreated(function(){

  const currentData = Template.currentData();
  const instance = this;

  instance.subscribe('userData');
  instance.subscribe('dataPoints.forSession', currentData.session._id);
  instance.subscribe("currencies.latest");

  instance.processingNewExtraIncome = new ReactiveVar(false);
  instance.calculatorDropdownIsActive = new ReactiveVar(false);

  instance.noteGotEdited = new ReactiveVar(false);

  currentData.combinedChartConfig = {};
  currentData.combinedChartConfig.session = currentData.session;
  currentData.combinedChartConfig.chartConfig = {
    data: [
      {
        label: "Tokens Overall",
        fill: false,
        borderColor: 'rgba(140, 206, 140, 1)',
        pointBackgroundColor: 'rgba(140, 206, 140, 1)',
        dataAlias: 'rawTokens',
        yAxisID: 'third',
        lineTension: 0,
      },
      {
        label: "Followers Overall",
        fill: false,
        borderColor: '#6b4661',
        pointBackgroundColor: '#6b4661',
        dataAlias: 'rawFollowers',
        yAxisID: 'followers',
        lineTension: 0,
      },
      {
        label: "Viewers Overall",
        fill: false,
        borderColor: '#21668f',
        pointBackgroundColor: '#21668f',
        dataAlias: 'numViewers',
        yAxisID: 'generic',
      },
    ],
  };

  currentData.viewersChartConfig = {};
  currentData.viewersChartConfig.session = currentData.session;
  currentData.viewersChartConfig.chartConfig = {
    data: [
      {
        label: "Viewers Overall",
        fill: false,
        borderColor: '#21668f',
        pointBackgroundColor: '#21668f',
        dataAlias: 'numViewers',
        yAxisID: 'generic',
      },
      {
        label: "Number of Registered Viewers",
        fill: false,
        borderColor: '#4aaa97',
        pointBackgroundColor: '#4aaa97',
        dataAlias: 'numRegisteredViewers',
        yAxisID: 'generic',
      },
      {
        label: "Number of Tokened Viewers",
        fill: false,
        borderColor: '#5ac59a',
        pointBackgroundColor: '#5ac59a',
        dataAlias: 'numTokenedViewers',
        yAxisID: 'generic',
      },
    ],
  };

  currentData.followersChartConfig = {};
  currentData.followersChartConfig.session = currentData.session;
  currentData.followersChartConfig.chartConfig = {
    type: 'bar',
    data: [
      {
        label: "Followers Overall",
        fill: false,
        borderColor: '#6b4661',
        pointBackgroundColor: '#6b4661',
        dataAlias: 'rawFollowers',
        yAxisID: 'followers',
        lineTension: 0,
        type: 'line',
      },
      {
        label: "Delta Followers",
        fill: true,
        borderColor: '#6b4661',
        backgroundColor: 'rgba(108, 55, 94, 0.5)',
        dataAlias: 'deltaFollowers',
        yAxisID: 'generic',
      },
    ]
  };


  currentData.tokensChartConfig = {};
  currentData.tokensChartConfig.session = currentData.session;
  currentData.tokensChartConfig.chartConfig = {
    type: 'bar',
    data: [
      {
        label: "Tokens Overall",
        fill: false,
        borderColor: 'rgba(140, 206, 140, 1)',
        pointBackgroundColor: 'rgba(140, 206, 140, 1)',
        dataAlias: 'rawTokens',
        yAxisID: 'generic',
        lineTension: 0,
        type: 'line',
      },
      {
        label: "Delta Tokens",
        fill: true,
        borderColor: 'rgba(140, 206, 140, 1)',
        backgroundColor: 'rgba(140, 206, 140, 0.5)',
        dataAlias: 'deltaTokens',
        yAxisID: 'generic',
      },
    ]
  };

});

Template.sessionInfoView.onDestroyed(function() {
  if (this.timerHandle) {
    Meteor.clearInterval(this.timerHandle);
  }
});

Template.sessionInfoView.helpers({

  timeframe(session) {
    // // const start = session.startTime ? moment(session.startTime).format('lll') + ' - ' : '-∞ to ';
    // const start = session.startTime ? moment(session.startTime).calendar() + ' - ' : '-∞ to ';
    // let end = '';
    // // let format = 'lll';
    // end = moment(session.endTime).calendar();
    // if (session.endTime) {
    //   const isTheSameDay = moment(session.endTime).date() === moment(session.startTime).date();
    //   if (session.startTime && isTheSameDay) {
    //     // format = 'LT';
    //     end = moment(session.endTime).format('LT');
    //   }
    //   // end = moment(session.endTime).format(format);
    // }

    const start = session.startTime ? moment(session.startTime).format('lll') : '–∞ to ';
    let end = '';
    let middle = '';
    let format = 'lll';
    if (session.endTime) {
      const onTheSameDate = moment(session.endTime).date() === moment(session.startTime).date();
      if (session.startTime && onTheSameDate) {
        format = 'LT';
        middle = ' – ';
      } else {
        middle = ' –<br>';
      }
      end = moment(session.endTime).format(format);
    }

    return  start + middle + end;
  },

  duration() {
    const session = Template.currentData().session;

    if (!session.endTime) {
      return moment(session.startTime).fromNow(true);
    }
    const endTime = session.endTime || new Date();

    const duration = moment.duration(moment(endTime).diff(session.startTime));
    return duration.format("h [h] m [m]");
  },

  // sumColumn(name) {
  //   const session = Template.currentData().session;
  //   const fields = {}
  //    fields[name] = 1;
  //
  //   let sum = 0;
  //   DataPoints.find({sessionId: session._id}, {
  //     fields
  //   }).map((point) => {
  //     sum += point[name]
  //   });
  //   return sum;
  // },

  // viewers() {
  //   function _median(values) {
  //     values.sort((a, b) => a - b);
  //     let lowMiddle = Math.floor((values.length - 1) / 2);
  //     let highMiddle = Math.ceil((values.length - 1) / 2);
  //     let median = (values[lowMiddle] + values[highMiddle]) / 2;
  //     return median;
  //   }
  //
  //   const session = Template.currentData().session;
  //   const dataPoints = DataPoints.find({sessionId: session._id}, {
  //     fields: {numViewers: 1}
  //   }).fetch();
  //   if (!dataPoints.length) {
  //     return 0;
  //   }
  //   const mappedDataPoints = _.map(dataPoints, (item) => {
  //     return item.numViewers;
  //   });
  //   return Math.floor(_median( mappedDataPoints ));
  // },

  noteOrPlaceholder() {
    return this.session.note
      ? this.session.note.replace(/\\r\\n/g, "<br>") : notePlaceholder;
  },

  isPlaceholderClass() {
    return this.session.note || Template.instance().noteGotEdited.get()
      ? null : "has-text-grey-light";
  },

  plusMinus(number) {
    return (number > 0 ? '+' : '') + number.toLocaleString('en');
  },

  greenRed(number, isNegative = false) {
    return ((number > 0 && isNegative) || (number < 0 && !isNegative) ? 'has-text-success'
          : (number < 0 && isNegative) || (number > 0 && !isNegative) ? 'has-text-danger' : '');
  },

  userCurrencyLabel() {
    const userRate = UserRates.findOne({});
    return userRate ? userRate.currency : null;
  },

  dynamicSession() {
    return Sessions.findOne(this.session._id);
  },

  processingNewExtraIncome: () => Template.instance().processingNewExtraIncome.get(),

  extraIncomeValueAddDisabled: () => Template.instance().processingNewExtraIncome.get() ? "disabled" : null,

  processingNewExtraIncomeWaitLonger: () => Template.instance().processingNewExtraIncome.get() === 2,

  calculatorDropdownIsActive: () => Template.instance().calculatorDropdownIsActive.get() ? "is-active" : null,

  userCurrencies() {
    const user = Meteor.user();
    return user ? user.currencies : false;
  },

  currencyKeys() {
    const currencies = Currencies.findOne();
    if (!currencies) {
      return;
    }
    console.log({currencies});
    return _.keys(currencies.rates).sort()
  },

  disabledAttr() {
    return Currencies.findOne() ? null : "disabled";
  },

});

const _debouncedNoteSubmit = _.debounce((sessionId, currentTarget) => {

  let noteContent = currentTarget.innerText
    .replace(/Notice: /g, '') // remove Notice: prefixes
    .replace(/(?:\r\n|\r|\n)/g, '<br>' // replace new lines with BR tags
  );
  if (noteContent === "<br>") {
    noteContent = null;
  }

  console.log({noteContent});

  Meteor.call('sessions.setNote', sessionId, noteContent);
  $(currentTarget).find("[style]").removeAttr("style").each(function() {
    $(this).html($(this).html().replace(/Notice: /g, '') + "<br>");
  });

}, 900);

Template.sessionInfoView.events({

  'blur form[name="noteForm"] .contenteditable'(event) {
    if (event.currentTarget.innerText.replace(/(?:\r\n|\r|\n)/g, '') === "") {
      event.currentTarget.innerText = notePlaceholder;
      Template.instance().noteGotEdited.set(false);
    }
  },

  'blur form[name="noteForm"] .contenteditable, keyup form[name="noteForm"] .contenteditable'(event) {
    _debouncedNoteSubmit(this.session._id, event.currentTarget);
  },

  'focus form[name="noteForm"] .contenteditable'(event) {
    if (event.currentTarget.innerText === notePlaceholder) {
      event.currentTarget.innerText = "";
      Template.instance().noteGotEdited.set(true);
    }
  },

  'click .delete-session'(event) {
    event.preventDefault();
    if (confirm("Delete entry? This cannot be undone.")) {
      Meteor.call('sessions.remove', this.session._id, (error) => {
        if (error) {
          alert(error.message);
        }
      });
    }
  },

  'submit form[name="extraIncomeForm"]'(event, template) {
    event.preventDefault();
    const userRate = UserRates.findOne({});
    if (!userRate) {
      alert("Error: Currency not set");
    }

    template.calculatorDropdownIsActive.set(false);

    const valueField = template.find('#extraIncomeValueAdd');
    const value = parseFloat(valueField.value);
    const currency = userRate.currency;
    const isHourlyRated = template.find("#extraIncomeIsHourlyRated").checked;
    valueField.value = "";

    template.timerHandle = Meteor.setInterval((function() {
      template.processingNewExtraIncome.set(2); // 2 for state "Please wait a bit longer..."
    }), 1000 * 2); // 2 sec
    template.processingNewExtraIncome.set(true);

    Meteor.call('sessions.insertExtraIncome', this.session._id, currency, value, isHourlyRated, function(error, result) {
      Meteor.clearInterval(template.timerHandle);
      template.processingNewExtraIncome.set(false);
    });
  },

  'click .delete-extraIncome'(event, template) {
    event.preventDefault();
    if (confirm("Delete entry?")) {
      const sessionId = Template.currentData().session._id;
      const value = parseFloat(this.value);
      const currency = this.currency;
      const isHourlyRated = this.isHourlyRated;
      Meteor.call('sessions.deleteExtraIncome', sessionId, currency, value, isHourlyRated);
    }
  },

  'click [aria-controls="dropdown-menu-calculator"]'(event, template) {
    event.preventDefault();
    template.calculatorDropdownIsActive.set(!template.calculatorDropdownIsActive.get());
  },

  'change #calculator-select-currency, change #calculator-number, keyup #calculator-number'(event, template) {
    const currency = template.find("#calculator-select-currency").value;
    const foreignValue = parseFloat(template.find("#calculator-number").value);
    const rates = Currencies.findOne().rates;
    const userRate = UserRates.findOne({});
    if (!userRate) {
      alert("Display Currency not set");
      return;
    }
    const expectedFees = 0.96;
    const value = Math.round(foreignValue / rates[currency] * rates[userRate.currency] * expectedFees * 10) / 10;
    template.find("#extraIncomeValueAdd").value = value;
  },

});
