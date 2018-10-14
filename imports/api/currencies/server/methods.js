import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Currencies } from '../currencies.js';
import { HTTP } from 'meteor/http';

_APIDateFormat = "YYYY-MM-DD";

Meteor.methods({

  'currencies.updateExchangeRate'(dateAPIFormatted = 'latest') {
    check(dateAPIFormatted, String);

    const date = dateAPIFormatted === 'latest' ?
      moment(moment().format(_APIDateFormat)).toDate() :
      moment(dateAPIFormatted).format(_APIDateFormat).toDate();

    if (Currencies.findOne({date}, {fields: {_id:1}})) {
      console.log("Currencies Exchange Rates are already present for the date " + content.date);
      return;
    }

    HTTP.get('https://api.exchangeratesapi.io/' + dateAPIFormatted + '?base=USD', null, (error, result) => {
      if (!error) {
        const content = JSON.parse(result.content);
        const date = moment(content.date).toDate();

        console.log({rates: content.rates});

        return Currencies.insert({
          date: moment(content.date).toDate(),
          rates: content.rates
        });

      } else {
        console.log('dataPoints.updateExchaangeRate', error);
      }
    });

  },

  'dataPoints.getPastExchangeRate'() {

    function _arrayOfDates(from, to) {
      let days = [];
      let day = from;

      while (day <= endOfWeek) {
          days.push(day.toDate());
          day = day.clone().add(1, 'd');
      }
      return days;
    }

    const start = moment().startOf('week');
    const end = moment();

    _arrayOfDates(start, end)
      .map(date => {
        Meteor.call('currencies.updateExchangeRate', date.format(_APIDateFormat));
      });
  },

});
