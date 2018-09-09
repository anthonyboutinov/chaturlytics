import './settings.html';
import { UserProfiles } from '/imports/api/userprofiles/userprofiles.js';
import { Meteor } from 'meteor/meteor';

Template.Page_settings.onCreated(function() {
  var instance = this;

  const subscription = instance.subscribe('userProfiles.all');
});

Template.Page_settings.helpers({
  userProfiles() {
    return UserProfiles.find();
  },
});

Template.Page_settings.events({
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
  }
});
