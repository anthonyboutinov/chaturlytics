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
      colorScheme: 'tokens' || 'money' || 'time' OR and array of such strings
    }

    */

    if (typeof config.colorScheme === 'undefined') {
      config.colorScheme = 'default';
    }

    this.type = 'line';
    this.data = {
      datasets: []
    };

    this.idRefs = _.flatten([config.colorScheme]);
  }

  _data(id) {
    function _datasetTemplate(colorSchemeId) {
      const colorScheme = ChartSetup.colorSchemes[colorSchemeId] || ChartSetup.colorSchemes.default;
      return {
        data: [],
        fill: true,
        pointRadius: 0,
        backgroundColor: colorScheme.backgroundColor,
        borderColor: colorScheme.borderColor,
        tension: 0,
      };
    }
    const index = id ? _.indexOf(this.idRefs, id) : 0;
    let dataset = this.data.datasets[index];
    if (typeof dataset === 'undefined') {
      if (id) {
        this.idRefs.push(id);
      }
      const newDataset = _datasetTemplate(id || _.first(this.idRefs));
      this.data.datasets.push(newDataset);
      dataset = newDataset;
    }
    return dataset.data;
  }

  push(point, id) {
    this._data(id).push(point);
  }

  // hash() {
  //   const point = _.last(this._data());
  //   return this._data().length+'-'+point.x+'-'+point.y;
  // }

};

export { ChartSetup };
