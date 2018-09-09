import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { UserProfiles } from '../userprofiles.js';

Meteor.publish('userProfiles.all', function () {
  if (!this.userId) {
    return this.ready();
  }

  Meteor._sleepForMs(2000);
  return UserProfiles.find( { userId: this.userId } );
});
