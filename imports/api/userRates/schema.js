import { UserRates } from './userRates.js';
import SimpleSchema from 'simpl-schema';

UserRates.schema = new SimpleSchema({

  userId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },

  activeStartingDate: {
    type: Date,
  },

  currency: {
    type: String,
  },

  rate: {
    type: Number,
  },

});

UserRates.attachSchema(UserRates.schema);
