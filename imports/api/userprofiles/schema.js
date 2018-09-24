import { UserProfiles } from './userprofiles.js';
import SimpleSchema from 'simpl-schema';

UserProfiles.schema = new SimpleSchema({

  userId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },

  username: {
    type: String
  },

  isActive: {
    type: Boolean,
    defaultValue: true,
  },

  url: {
    type: String,
    regEx: SimpleSchema.RegEx.Url
  },

  nextSync: {
    type: Date,
    optional: true,
    defaultValue: null
  },

  urlTokenHasExpired: {
    type: Date,
    optional: true,
  },

  isCurrent: {
    type: Boolean,
    optional: true,
    defaultValue: true,
  }

});

UserProfiles.attachSchema(UserProfiles.schema);
