import SimpleSchema from 'simpl-schema';

export const RawDataPointSchema = new SimpleSchema({

  username: {
    type: String
  },

  time_online: {
    type: Number
  },

  tips_in_last_hour: {
    type: Number,
    optional: true,
  },

  num_followers: {
    type: Number
  },

  token_balance: {
    type: Number
  },

  satisfaction_score: {
    type: Number,
    optional: true
  },

  num_tokened_viewers: {
    type: Number
  },

  votes_down: {
    type: Number
  },

  votes_up: {
    type: Number
  },

  last_broadcast: {
    type: String
  },

  num_registered_viewers: {
    type: Number
  },

  num_viewers: {
    type: Number
  },

});
