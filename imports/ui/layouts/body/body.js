import './body.html';
import '/imports/ui/components/navbarQuickStats/navbarQuickStats.js';

import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { UserProfiles } from '/imports/api/userprofiles/userprofiles.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';


function isActive(value) {
  return value === true ? "is-active" : null;
}

Template.Layout_body.onCreated(function() {
  const instance = this;

  // GLOBAL SUBSCRIPTIONS
  // instance.subscribe('userRates.all'); // not used in this template, but in other ones
  instance.subscribe('userProfiles.all');

});

Template.Layout_body.helpers({

  isActiveAsCurrentRouteNamed(name) {
    FlowRouter.watchPathChange();
    return isActive(name ? FlowRouter.current().route.name === name : false);
  },

  currentUserProfile() {
    return UserProfiles.findOne({isCurrent: true});
  },

});

Template.Layout_body.events({

  'click .force-sync'(event) {
    event.preventDefault();
    Meteor.call('dataPoints.getDataPointsForAll');
  },

  'click .update-db'(event) {
    event.preventDefault();
    Meteor.call('dataPoints.updateSchema');
  },

  'click .update-exchange-rates'(event) {
    event.preventDefault();
    Meteor.call('currencies.updateExchangeRate');
  },

  'click .clear-next-sync-field'(event) {
    event.preventDefault();
    Meteor.call('userProfiles.clearNextSyncField');
  },


});
