import './profiles.html';
import { UserProfiles } from '/imports/api/userprofiles/userprofiles.js';
import { Meteor } from 'meteor/meteor';

Template.Page_profiles.onCreated(function() {
  var instance = this;

  const subscription = instance.subscribe('userProfiles.all');
});

Template.Page_profiles.helpers({
  userProfiles() {
    return UserProfiles.find();
  },
  hasMultipleUserProfiles() {
    return UserProfiles.find().count() > 1;
  }
});

Template.Page_profiles.events({
  'submit form[name="addUserProfile"]'(event) {
    event.preventDefault();
    const target = event.target;
    Meteor.call('userProfiles.insert', target.url.value, (error) => {
      if (error) {
        alert(error.error);
      } else {
        target.url.value = '';
      }
    });
  },

  'click .set-current-userprofile'(event) {
    event.preventDefault();
    Meteor.call('userProfiles.setCurrent', this.username);
  },

  'click .toggle-data-collection'(event) {
    event.preventDefault();
    Meteor.call('userProfiles.toggleDataCollection', this.username, !this.isActive);
  },
});
