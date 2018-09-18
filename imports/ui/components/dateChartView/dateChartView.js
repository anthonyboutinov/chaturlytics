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
    console.log("Autorun called, located in dateChartView.onRendered");

    instance.dataReady.set(false);
    if (instance.chart) {
      instance.chart.destroy();
    }

    Meteor.subscribe('dataPoints.forSession', Template.currentData().session._id, () => {
      console.log("subscriptionReady");

      const drawingContext = instance.find('.thisChart').getContext('2d');

      function _mapToTime(dataPoints, fieldName, fillerValue = null) {
        return dataPoints.map(function(dataPoint) {
          return {
            x: dataPoint.endTime,
            y: dataPoint[fieldName]
          }
        });
      }

      // Meteor.setTimeout(() => {

        console.log({instance});

        const dataContext = instance.data;
        const dataPoints = DataPoints.find({sessionId: dataContext.session._id}, {
          sort: {endTime: 1}
        }).fetch();

        const extraDataPointOnTheLeft = DataPoints.findOne({endTime: dataPoints[0].startTime});
        if (extraDataPointOnTheLeft.startTime) {
          // only add extra data point if it's not the initial one
          dataPoints.unshift(extraDataPointOnTheLeft);
        } else {
          // else add a hollow data point
          dataPoints.unshift({
            startTime: extraDataPointOnTheLeft.endTime,
            endTime: extraDataPointOnTheLeft.endTime
          });
        }

        const chartConfig = dataContext.chartConfig;
        const chartConfigKeys = _.map(chartConfig.data, (item) => {
          return item.dataAlias
        });
        const dataPointProjections = _.reduce(chartConfigKeys, function(obj, name) {
          obj[name] = _mapToTime(dataPoints, name);
          return obj;
        }, {});
        const datasets = _.map(chartConfig.data, (item) => {
          let editedItem = _.clone(item);
          editedItem.data = dataPointProjections[item.dataAlias];
          return editedItem;
        });


        let options = {
          scales: {
            yAxes: [
              {
                id: 'generic',
                type: 'linear',
                position: 'left',
              },
            ],
            xAxes: [{
                type: 'time',
                time: {
                  displayFormats: {
                    quarter: 'MMM D'
                  }
                }
            }]
          },
        };

        if (dataPointProjections.rawFollowers) {
          options.scales.yAxes.push({
            id: 'followers',
            type: 'linear',
            position: 'right',
            ticks: {
              min: dataPointProjections.rawFollowers[0].y,
            },
          });
        }

        let hasThird = false;
        _.forEach(chartConfig.data, (elem) => {
          if (elem.yAxisID === 'third') {
            hasThird = true;
          }
        });
        if (hasThird) {
          options.scales.yAxes.push({
            id: 'third',
            type: 'linear',
            position: 'right',
          });
        }

        instance.dataReady.set(true);
        instance.chart = new Chart(drawingContext, {
          // The type of chart we want to create
          type: dataContext.chartConfig.type || 'line',
          // The data for our dataset
          data: {
            datasets
          },
          // Configuration options go here
          options: options
        });

      // }, 0);
    }); // eof Meteor.subscribe

  }); // eof autorun

});

Template.dateChartView.helpers({
  dataReady() {
    return Template.instance().dataReady.get();
  },
});
