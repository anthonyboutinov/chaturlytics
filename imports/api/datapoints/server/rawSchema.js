import SimpleSchema from 'simpl-schema';

export const RawDataPointSchema = new SimpleSchema({

  username: {
    type: String
  },

  time_online: SimpleSchema.Integer,

  tips_in_last_hour: {
    type: Number,
    optional: true,
  },

  num_followers: SimpleSchema.Integer,

  token_balance: SimpleSchema.Integer,

  satisfaction_score: {
    type: Number,
    optional: true
  },

  num_tokened_viewers: SimpleSchema.Integer,

  votes_down: SimpleSchema.Integer,

  votes_up: SimpleSchema.Integer,

  last_broadcast: {
    type: String
  },

  num_registered_viewers: SimpleSchema.Integer,

  num_viewers: SimpleSchema.Integer,

});
