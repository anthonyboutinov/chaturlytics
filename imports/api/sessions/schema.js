import { Sessions } from './sessions.js';
import SimpleSchema from 'simpl-schema';

Sessions.schema = new SimpleSchema({

  userId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },

  username: String,

  startTime: Date,

  endTime: {
    type: Date,
    optional: true
  },

  note: {
    type: String,
    optional: true
  },

  deltaFollowers: {
    type: SimpleSchema.Integer,
    optional: true
  },

  deltaTokens: {
    type: SimpleSchema.Integer,
    optional: true
  },

  numViewers: {
    type: SimpleSchema.Integer,
    optional: true
  },

  numRegisteredViewers: {
    type: SimpleSchema.Integer,
    optional: true
  },

  numTokenedViewers: {
    type: SimpleSchema.Integer,
    optional: true
  },

  deltaVotesUp: {
    type: SimpleSchema.Integer,
    optional: true
  },

  deltaVotesDown: {
    type: SimpleSchema.Integer,
    optional: true
  },

  broadcastHasDropped: {
    optional: true,
    type: Boolean,
  },

  isOneOnOne: {
    optional: true,
    type: Boolean,
  },

  isHistorical: {
    optional: true,
    type: Boolean,
  },

});

// Sessions.attachSchema(Sessions.Sessions);
