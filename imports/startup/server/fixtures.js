// Fill the DB with example data on startup

import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {

  let DEV_ALLOW_AUTO_USER_RESET = false

  if (Meteor.users.find().count() === 0 && DEV_ALLOW_AUTO_USER_RESET) {
    const data = [
      {
        url: '***REMOVED_URL***',
        email: "***REMOVED_EMAIL***",
        password: "password",
      }
    ];


    data.forEach(function(user) {
      const id = Accounts.createUser({
        email: user.email,
        password: user.password,
        url: user.url,
      });
    });

  }
  
});
