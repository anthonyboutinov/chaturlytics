import { Meteor } from 'meteor/meteor';
import './dashboardView.html';
import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Sessions } from '/imports/api/sessions/sessions.js';
import { Calendar } from 'tui-calendar';
import { ReactiveVar } from 'meteor/reactive-var';

Template.dashboardView.onCreated(function() {

  const instance = this;

  instance.sessionsCount = new ReactiveVar('…');

  Meteor.call('sessions.countInDateRange', function(error, result) {
    if (!error) {
      instance.sessionsCount.set(result);
    } else {
      console.log(error);
      instance.sessionsCount.set("N/A");
    }
  });

});

Template.dashboardView.helpers({

  sessionsCount() {
    return Template.instance().sessionsCount.get();
  },

});
