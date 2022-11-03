import { Payouts } from './payouts.js';
import SimpleSchema from 'simpl-schema';

Payouts.schema = new SimpleSchema({

  userId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },

  username: String,

  date: Date,

  tokens: SimpleSchema.Integer,

});
