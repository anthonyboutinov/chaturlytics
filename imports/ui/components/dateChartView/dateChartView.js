import { Meteor } from 'meteor/meteor';
import { Chart } from 'chart.js';
import './dateChartView.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { ReactiveVar } from 'meteor/reactive-var';

Template.dateChartView.onCreated(function () {
  this.dataReady = new ReactiveVar(false);
});

Template.dateChartView.onRendered(function () {

  const instance = this;

  this.autorun(() => {

    instance.dataReady.set(false);
    if (instance.chart) {
      instance.chart.destroy();
    }

    Meteor.subscribe('dataPoints.forSession', Template.currentData().session._id, () => {
      console.log("subscriptionReady");

      const drawingContext = document.getElementById('myChart').getContext('2d');

      function _mapToTime(dataPoints, fieldName) {
        return dataPoints.map(function(dataPoint) {
          return {
            x: dataPoint.endTime,
            y: dataPoint[fieldName]
          }
        });
      }

      Meteor.setTimeout(() => {

        const dataContext = instance.data;
        let dataPoints = DataPoints.find({sessionId: dataContext.session._id}).fetch();
        dataPoints.unshift(DataPoints.findOne({endTime: dataPoints[0].startTime}));

        const dataPointProjections = {
          rawFollowers: _mapToTime(dataPoints, 'rawFollowers'),
          numViewers: _mapToTime(dataPoints, 'numViewers'),
          numRegisteredViewers: _mapToTime(dataPoints, 'numRegisteredViewers'),
          numTokenedViewers: _mapToTime(dataPoints, 'numTokenedViewers'),
        };

        instance.dataReady.set(true);
        instance.chart = new Chart(drawingContext, {
            // The type of chart we want to create
            type: 'line',

            // The data for our dataset
            data: {
              datasets: [
                {
                  label: "Followers Overall",
                  fill: false,
                  borderColor: '#6b4661',
                  pointBackgroundColor: '#6b4661',
                  data: dataPointProjections.rawFollowers,
                  yAxisID: 'B',
                  lineTension: 0,
                },
                {
                  label: "Viewers Overall",
                  fill: false,
                  borderColor: '#21668f',
                  pointBackgroundColor: '#21668f',
                  data: dataPointProjections.numViewers,
                  yAxisID: 'A',
                  // lineTension: 0,
                  // steppedLine: true,
                },
                {
                  label: "Number of Registered Viewers",
                  fill: false,
                  borderColor: '#4aaa97',
                  pointBackgroundColor: '#4aaa97',
                  data: dataPointProjections.numRegisteredViewers,
                  yAxisID: 'A',
                  // lineTension: 0,
                  // steppedLine: true,
                },
                {
                  label: "Number of Tokened Viewers",
                  fill: false,
                  borderColor: '#5ac59a',
                  pointBackgroundColor: '#5ac59a',
                  data: dataPointProjections.numTokenedViewers,
                  yAxisID: 'A',
                  // lineTension: 0,
                  // steppedLine: true,
                },
              ]
            },

            // Configuration options go here
            options: {
              scales: {
                yAxes: [{
                  id: 'B',
                  type: 'linear',
                  position: 'right',
                  ticks: {
                    min: dataPointProjections.rawFollowers[0].y,
                  },
                }, {
                  id: 'A',
                  type: 'linear',
                  position: 'left',
                }],
                xAxes: [{
                    type: 'time',
                    time: {
                        displayFormats: {
                            quarter: 'MMM D'
                        }
                    }
                }]
              }
            }
        });


      }, 2000);
    });

  }); // eof autorun

});

Template.dateChartView.helpers({
  dataReady() {
    return Template.instance().dataReady.get();
  },
});
