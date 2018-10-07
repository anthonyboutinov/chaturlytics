import { DataPoints } from './datapoints.js';
import SimpleSchema from 'simpl-schema';

DataPoints.schema = new SimpleSchema({

  userId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },

  sessionId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    optional: true,
  },

  username: String,

  startTime: {
    type: Date,
    optional: true
  },

  endTime: Date,

  rawFollowers: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  rawTokens: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  deltaFollowers: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  deltaTokens: {
    type: SimpleSchema.Integer,
  },

  numViewers: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  numRegisteredViewers: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  numTokenedViewers: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  satisfactionScore: {
    type: Number,
    optional: true,
  },

  totalVotesUp: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  totalVotesDown: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  deltaVotesUp: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  deltaVotesDown: {
    type: SimpleSchema.Integer,
    optional: true,
  },

  broadcastHasDropped: {
    optional: true,
    type: Boolean,
  },

});

DataPoints.attachSchema(DataPoints.schema);
