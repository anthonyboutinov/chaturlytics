import { Currencies } from './currencies.js';
import SimpleSchema from 'simpl-schema';

Currencies.schema = new SimpleSchema({

  date: Date,

  rates: {
    type: Object,
    blackbox: true,
  },

});

Currencies.attachSchema(Currencies.schema);
