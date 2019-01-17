import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Currencies } from '../currencies.js';

// Meteor.publish('currencies.forDates', function (start, end) {
//   if (!this.userId) {
//     return this.ready();
//   }
//   check(start, Date);
//   check(end, Date);
//   Meteor._sleepForMs(500);
//   return Currencies.find({
//     date: { $gte: start, $lte: end },
//   });
// });

Meteor.publish('currencies.latest', function () {
  // Meteor._sleepForMs(500);
  return Currencies.find({}, {
    sort: { date: -1 },
    limit: 1
  });
});
