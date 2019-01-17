import { Mongo } from 'meteor/mongo';

export const Currencies = new Mongo.Collection('currencies');

Currencies.conversionRate = function(fromCurrency, toCurrency, date) {
  // FIXME: find at THAT DATE, now the latest one
  const currenciesAtThatTime = Currencies.find({}, {
    sort: { date: -1 },
    limit: 1
  });

  if (currenciesAtThatTime.length < 1) throw "Currencies collection is empty";

  return currenciesAtThatTime.rates[fromCurrency] * currenciesAtThatTime.rates[toCurrency];
}
