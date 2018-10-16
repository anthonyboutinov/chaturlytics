import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { UserProfiles } from '../userprofiles.js';

Meteor.methods({
  'userProfiles.insert'(url, isActive = true) {
    check(url, String);
    check(isActive, Boolean);
    if (!this.userId) {
      return false;
    }

    const username = url.match(/username=(.*)&/)[1];
    const profile = UserProfiles.insert({
      userId: this.userId,
      username,
      url,
      isActive
    });

    Meteor.call('usersProfiles.setCurrent', username);
    return profile;
  },

  'userProfiles.setCurrent'(username) {
    check(username, String);
    if (!this.userId) {
      return false;
    }

    UserProfiles.update({ userId: this.userId }, {
      $unset: { isCurrent: "" }
    });

    return UserProfiles.update({
      userId: this.userId,
      username
    }, {
      $set: { isCurrent: true }
    });
  },

  'userProfiles.toggleDataCollection'(username, toggleToValue) {
    check(username, String);
    check(toggleToValue, Boolean);
    if (!this.userId) {
      return false;
    }

    return UserProfiles.update({
      userId: this.userId,
      username
    }, {
      $set: { isActive: toggleToValue }
    });
  },

  'userProfiles.clearNextSyncField'() {
    if (!this.userId) {
      return false;
    }
    const username = UserProfiles.getCurrentUsername(this.userId);
    if (!username) {
      return false;
    }
    return UserProfiles.update({
      userId: this.userId,
      username
    }, {
      $set: { nextSync: null }
    });
  },

});
