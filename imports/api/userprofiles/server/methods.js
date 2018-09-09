import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { UserProfiles } from '../userprofiles.js';

Meteor.methods({
  'userProfiles.insert'(url, isActive = true) {
    check(url, String);
    check(isActive, Boolean);

    const username = url.match(/username=(.*)&/)[1];
    console.log({username});

    return UserProfiles.insert({
      userId: this.userId,
      username,
      url,
      isActive
    });
  },
});
