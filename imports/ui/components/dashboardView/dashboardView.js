import { Meteor } from 'meteor/meteor';
import './dashboardView.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
// import { Calendar } from 'tui-calendar';
import { ReactiveVar } from 'meteor/reactive-var';

import { UserRates } from '/imports/api/userRates/userRates.js';
import { UserProfiles } from '/imports/api/userprofiles/userprofiles.js';
import { StatsComposer } from './statsComposer.js';
import { DateRange } from './dateRange.js';

Template.dashboardView.onCreated(function() {

  const instance = this;

  instance.sessionsCount = new ReactiveVar();

  instance.subscribe('dataPoints.last');

  instance.dateRange = {
    startTime: moment().startOf('month').toDate(),
    endTime: moment().toDate(),
    getFindFilter: function() {
      return {
        startTime: {$gte: this.startTime},
        endTime: {$lte: this.endTime}
      }
    },
    // previousDateRange: function() {
    //   const startTime = moment(this.startTime).add(-1, 'month').toDate();
    //   const endTime = moment(startTime).endOf('month').toDate();
    //   return {
    //     startTime,
    //     endTime,
    //     getFindFilter: function() {
    //       startTime: {$gte: startTime},
    //       endTime: {$lte: endTime}
    //     }
    //   }
    // }
  };

  instance.subscribe('dataPoints.forDates', instance.dateRange.startTime, instance.dateRange.endTime);
  instance.subscribe('sessions.forDates', instance.dateRange.startTime, instance.dateRange.endTime);

  instance.subscribe('userProfiles.all');

  instance.subscribe('userRates.all');

  Meteor.call('sessions.countInDateRange', function(error, result) {
    if (!error) {
      instance.sessionsCount.set(result);
    } else {
      console.log(error);
      instance.sessionsCount.set("N/A");
    }
  });

  instance.payoutDateRangeFindFilter = new DateRange('halfAMonth').getFindFilter();

});

Template.dashboardView.helpers({

  currentUserProfile() {
    return UserProfiles.findOne({isCurrent: true});
  },

  sessionsCount() {
    return Template.instance().sessionsCount.get();
  },

  // lastDataPoint() {
  //   return DataPoints.findOne({}, {
  //     sort: {endTime: -1},
  //     limit: 1,
  //   });
  // },

  stats() {
    const dateRange = Template.instance().dateRange;
    return new StatsComposer(
      DataPoints.find(dateRange.getFindFilter()).fetch(),
      Sessions.find(dateRange.getFindFilter()).fetch()
    );
  },

  userCurrencyLabel() {
    const userRate = UserRates.findOne({}, {
      sort: {activeStartingDate: -1}
    });
    return userRate ? userRate.currency : "–";
  },

  lastUpdated() {
    const lastDataPoint = DataPoints.findOne({}, {
      sort: {endTime: -1},
      limit: 1,
    });
    if (!lastDataPoint) return;
    return moment(lastDataPoint.endTime).format('LT');
  },

  payout() {
    return DataPoints.find(Template.instance().payoutDateRangeFindFilter).fetch().reduce((sum, dataPoint) => sum + dataPoint.deltaTokens, 0) * 0.05;
  }

});
