import './settings.html';

import '../../components/updateConversionRateSettingView/updateConversionRateSettingView.js';

import { Currencies } from '/imports/api/currencies/currencies.js';
import { UserRates } from '/imports/api/userRates/userRates.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';

Template.Page_settings.onCreated(function() {
  const instance = this;
  instance.subscribe('userRates.all');

  instance.updateConversionRateVariable = new ReactiveVar(false);
});

Template.Page_settings.helpers({

  userRates() {
    return UserRates.find({}, {
      sort: {activeStartingDate: -1}
    });
  },

  hasMultipleUserRates: () => UserRates.find().count() > 1,

  updateConversionRateVariable: () => Template.instance().updateConversionRateVariable.get(),

  fromStart() {
    return moment(this.activeStartingDate).year() <= 2000;
  },

});

Template.Page_settings.events({

  "click .edit-userRate"(event, instance) {
    event.preventDefault();
    instance.updateConversionRateVariable.set(this);
  },

  "click #add-userRate"(event, instance) {
    event.preventDefault();
    instance.updateConversionRateVariable.set(true);
    console.log("add userRate");
  },

  "click .delete-userRate"(event, instance) {
    event.preventDefault();
    if (confirm("Delete this entry? This cannot be undone.")) {
      Meteor.call('userRates.remove', this._id, (error) => {
        if (error) {
          console.log({error});
          alert(error.message);
        }
      });
    }
  },

  "click .close-component"(event, instance) {
    instance.updateConversionRateVariable.set(false);
  },

});
