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

  startTime: {
    type: Date,
    optional: true
  },

  endTime: {
    type: Date,
  },

  rawFollowers: SimpleSchema.Integer,

  rawTokens: SimpleSchema.Integer,

  deltaFollowers: SimpleSchema.Integer,

  deltaTokens: SimpleSchema.Integer,

  numViewers: SimpleSchema.Integer,

  numRegisteredViewers: SimpleSchema.Integer,

  numTokenedViewers: SimpleSchema.Integer,

  satisfactionScore: Number,

  totalVotesUp: SimpleSchema.Integer,

  totalVotesDown: SimpleSchema.Integer,

  deltaVotesUp: SimpleSchema.Integer,

  deltaVotesDown: SimpleSchema.Integer,

  broadcastHasDropped: {
    optional: true,
    type: Boolean,
  },

});

DataPoints.attachSchema(DataPoints.schema);
