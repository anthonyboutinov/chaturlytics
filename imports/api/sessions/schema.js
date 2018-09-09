import { Sessions } from './sessions.js';
import SimpleSchema from 'simpl-schema';

Sessions.schema = new SimpleSchema({

  userId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },

  startTime: {
    type: Date
  },

  endTime: {
    type: Date,
    optional: true
  },

  comment: {
    type: String,
    optional: true
  },

});

// Sessions.attachSchema(Sessions.Sessions);
