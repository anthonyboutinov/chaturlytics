import { DataPoints } from '/imports/api/datapoints/datapoints.js';
import { Meteor } from 'meteor/meteor';
import './logView.html';

Date.prototype.subMinutes = function(m){
  this.setMinutes(this.getMinutes()-m);
  return this;
}

Template.logView.onCreated(function () {
  // Meteor.subscribe('dataPoints.forDates', (new Date()).subMinutes(60*24), new Date());
  Meteor.subscribe('dataPoints.all');
});

Template.logView.helpers({
  dataPoints() {
    return DataPoints.find({});
  },
});

Template.logView.events({
  'submit .add'(event) {
    event.preventDefault();
    const target = event.target;
    Meteor.call('dataPoints.insertIndepenentlyFromRawData', target.raw.value, (error) => {
      if (error) {
        alert(error.error);
      } else {
        target.raw.value = '';
      }
    });
  },

  'click .delete'() {
    Meteor.call('dataPoints.remove', this._id, (error) => {
      if (error) {
        alert(error.error);
      }
    });
  },

  'submit .get'(event) {
    event.preventDefault();
    const target = event.target;
    Meteor.call('dataPoints.getDataPointFromChaturbate', target.url.value, (error) => {
      if (error) { alert(error.error); }
    });
  }
});
