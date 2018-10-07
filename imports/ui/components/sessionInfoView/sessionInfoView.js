import './sessionInfoView.html';
import './briefIsHistorical.html';
import '../../components/dateChartView/dateChartView.js';

// import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Meteor } from 'meteor/meteor';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';

Date.prototype.subMinutes = function(m){
  this.setMinutes(this.getMinutes()-m);
  return this;
}

const notePlaceholder = 'Add a note';

Template.sessionInfoView.onCreated(() => {

  const currentData = Template.currentData();

  Meteor.subscribe('dataPoints.forSession', currentData.session._id);

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

    const start = session.startTime ? moment(session.startTime).format('lll') + ' - ' : '-∞ to ';
    let end = '';
    let format = 'lll';
    if (session.endTime) {
      const isLessThanHourLong = moment(session.endTime).date() === moment(session.startTime).date();
      if (session.startTime && isLessThanHourLong) {
        format = 'LT';
      }
      end = moment(session.endTime).format(format);
    }

    return  start + end;
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
    return this.session.note ? this.session.note.replace(/\\r\\n/g, "<br />") : notePlaceholder;
  },

  isPlaceholderClass() {
    //FIXME: ошибка здесь в коде, что-то не так
    // const textIsNotAPlaceholderText = Template.instance().find('form[name="noteForm"] .contenteditable').innerText !== notePlaceholder;
    return this.session.note ? null : "has-text-grey-light";
  },

  plusMinus(number) {
    return (number > 0 ? '+' : '') + number;
  },

  greenRed(number, isNegative = false) {
    return ((number > 0 && isNegative) || (number < 0 && !isNegative) ? 'has-text-success'
          : (number < 0 && isNegative) || (number > 0 && !isNegative) ? 'has-text-danger' : '');
  },

});

const _debouncedNoteSubmit = _.debounce((sessionId, noteContent) => {
  Meteor.call('sessions.setNote', sessionId, noteContent);
}, 500, {
  maxWait: 2000,
});

Template.sessionInfoView.events({
  'blur form[name="noteForm"] .contenteditable'(event) {
    event.preventDefault();
    _debouncedNoteSubmit(this.session._id, event.currentTarget.innerText);
  },
  'focus form[name="noteForm"] .contenteditable'(event) {
    if (event.currentTarget.innerText === notePlaceholder) {
      event.currentTarget.innerText = "";
    }
  }
});
