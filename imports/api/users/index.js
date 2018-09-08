if (Meteor.isServer) {
  Accounts.onCreateUser(function(options, user) {
   user.usernames = options.usernames;
   return user;
  });
}
