import './chartView.html';

import { Meteor } from 'meteor/meteor';
import { Chart } from 'chart.js';
import { ReactiveVar } from 'meteor/reactive-var';

const defaultOptions = {
  scales: {
    yAxes: [
      {
        type: 'linear',
        position: 'left',
        precision: 0,
      },
    ],
    xAxes: [
      {
        type: 'time',
        time: {
            unit: 'month'
        }
      }
    ]
  },
  legend: false,
};

Template.chartView.onCreated(function () {
  this.dataReady = new ReactiveVar(false);
});

Template.chartView.onRendered(function () {

  //
  // this.dataContext: {type: String, datasets: Array, options: Dictionary}
  //
  //

  const instance = this;

  this.autorun(() => {
    console.log("Autorun called, located in chartView.onRendered");

    instance.dataReady.set(false);
    if (instance.chart) {
      instance.chart.destroy();
    }

    const drawingContext = instance.find('canvas').getContext('2d');

    const dataContext = instance.data.dataContext;

    if (!dataContext.type) {
      dataContext.type = 'line';
    }
    if (!dataContext.options) {
      dataContext.options = defaultOptions;
    }

    console.log(dataContext);
    console.log(instance);

    function randomScalingFactor() {
            return Math.round(Math.random() * 100 * (Math.random() > 0.5 ? -1 : 1));
        }

        function newDate(days) {
            return moment().add(days, 'd').toDate();
        }

    instance.chart = new Chart(drawingContext, {
      type: dataContext.type,
      options: dataContext.options,
      data: dataContext.data,
    });

    instance.dataReady.set(true);

  }); // eof autorun

});

Template.chartView.helpers({
  dataReady() {
    return Template.instance().dataReady.get();
  },
});
