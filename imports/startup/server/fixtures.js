// Fill the DB with example data on startup

import { Meteor } from 'meteor/meteor';
import { DataPoints } from '../../api/datapoints/datapoints.js';

Meteor.startup(() => {

  if (Meteor.users.find().count() === 0) {
    const data = [
      {
        usernames: ['***REMOVED***'],
        email: "***REMOVED_EMAIL***",
        password: "password",
      }
    ];


    data.forEach(function(user) {
      const id = Accounts.createUser({
        email: user.email,
        password: user.password,
        // profile: { name: user.name }
        usernames: user.usernames,
      });
      console.log({newUser: Meteor.users.find(id).fetch()});
    });

  }

  // if the Links collection is empty
  // if (Links.find().count() === 0) {
  //   const data = [
  //     {
  //       title: 'Do the Tutorial',
  //       url: 'https://www.meteor.com/try',
  //       createdAt: new Date(),
  //     },
  //     {
  //       title: 'Follow the Guide',
  //       url: 'http://guide.meteor.com',
  //       createdAt: new Date(),
  //     },
  //     {
  //       title: 'Read the Docs',
  //       url: 'https://docs.meteor.com',
  //       createdAt: new Date(),
  //     },
  //     {
  //       title: 'Discussions',
  //       url: 'https://forums.meteor.com',
  //       createdAt: new Date(),
  //     },
  //   ];
  //
  //   data.forEach(link => Links.insert(link));
  // }
});
