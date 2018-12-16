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

UserProfiles.getUserIds = function(username) {
  const users = UserProfiles.find({username}, {
    fields: {userId: 1}
  });
  if (users) {
    return users.map((user) => user.userId);
  } else {
    throw "No user associated with tis username";
  }
}
