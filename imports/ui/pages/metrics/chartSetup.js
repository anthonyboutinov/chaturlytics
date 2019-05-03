// import { ReactiveVar } from 'meteor/reactive-var';

class ChartSetup {

  static colorSchemes = {
    tokens: {
      backgroundColor: 'rgba(95, 215, 96, 0.66)',
      borderColor: '#5fd760',
    },
    money: {
      backgroundColor: 'rgba(36, 218, 100, 0.66)',
      borderColor: 'rgba(36, 218, 100, 1.000)',
    },
    time: {
      backgroundColor: 'rgba(66, 133, 244, 0.66)',
      borderColor: 'rgba(66, 133, 244, 1.000)',
    },
    default: {
      backgroundColor: 'rgba(40, 44, 53, 0.66)',
      borderColor: 'rgba(40, 44, 53, 1.000)',
    }
  }

  constructor(config = {}) {
    /*

    config: {
      colorScheme: 'tokens' || 'money' || 'time'
    }

    */

    if (!config.colorScheme) {
      config.colorScheme = 'default';
    }

    this.type = 'line';
    this.data = {
      datasets: [{
        data: [],
        fill: true,
        pointRadius: 0,
        backgroundColor: ChartSetup.colorSchemes[config.colorScheme].backgroundColor,
        borderColor: ChartSetup.colorSchemes[config.colorScheme].borderColor,
        tension: 0,
      }]
    };
  }

  get _data() {
    return this.data.datasets[0].data;
  }

  push(point) {
    this._data.push(point);
  }

  // hash() {
  //   const point = _.last(this._data());
  //   return this._data().length+'-'+point.x+'-'+point.y;
  // }

};

export { ChartSetup };
