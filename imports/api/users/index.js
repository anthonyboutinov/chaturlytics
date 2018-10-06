if (Meteor.isServer) {

  import { UserProfiles } from '/imports/api/userprofiles/userprofiles.js';

  Accounts.onCreateUser(function(options, user) {
   // user.usernames = options.usernames;

   if (options.url) {
     Meteor.call('userProfiles.insert', options.url);
   }

   return user;
  });
}
