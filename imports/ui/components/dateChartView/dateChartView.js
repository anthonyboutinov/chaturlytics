import { Meteor } from 'meteor/meteor';
import { Chart } from 'chart.js';
import './dateChartView.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';


Template.dateChartView.onCreated(function () {
  // Meteor.subscribe('dataPoints.forDates', (new Date()).subMinutes(60*24), new Date());
  // FIXME: subscribe to sessions's datapoints
  Meteor.subscribe('dataPoints.all');

  Meteor.setTimeout(function () {
    var ctx = document.getElementById('myChart').getContext('2d');

    function _mapToTime(dataPoints, fieldName) {
      return dataPoints.map(function(dataPoint) {
        return {
          x: dataPoint.endTime,
          y: dataPoint[fieldName]
        }
      });
    }

    let dataPoints = DataPoints.find({sessionId: {$ne: null}}).fetch();
    dataPoints.unshift(DataPoints.findOne({endTime: dataPoints[0].startTime}));
    const dataPointProjections = {
      rawFollowers: _mapToTime(dataPoints, 'rawFollowers'),
      numViewers: _mapToTime(dataPoints, 'numViewers'),
      numRegisteredViewers: _mapToTime(dataPoints, 'numRegisteredViewers'),
      numTokenedViewers: _mapToTime(dataPoints, 'numTokenedViewers'),
    };
    console.log({proj: dataPointProjections.rawFollowers});

    var chart = new Chart(ctx, {
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
  }, 5000);


});
