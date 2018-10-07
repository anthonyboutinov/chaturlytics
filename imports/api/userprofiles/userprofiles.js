import { Mongo } from 'meteor/mongo';

export const UserProfiles = new Mongo.Collection('userProfiles');

UserProfiles.getCurrentUsername = function(userId) {
  const userProfile = UserProfiles.findOne({
    userId,
    isCurrent: true,
  }, {fields: {username: 1}});
  if (!userProfile) {
    throw "Current User Profile not set";
  };
  return userProfile.username;
};
