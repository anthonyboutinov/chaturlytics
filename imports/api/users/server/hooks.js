import { UserProfiles } from '/imports/api/userprofiles/userprofiles.js';

Accounts.onCreateUser(function(options, user) {
 if (options.url) {
   Meteor.call('userProfiles.insert', options.url);
 }

 user.currencies = ['USD', 'RUB'];
 user.primaryCurrency = 'USD';

 return user;
});
//
// try {
//   Meteor.users.update({currencies: null}, {
//     $set: {
//       currencies: ['USD', 'RUB'],
//     }
//   });
//   console.log("CUrrencies set to default");
//
// } catch (e) {
//   console.log({eMeteorUsers: e});
// }
//
// console.log(Meteor.users.find().fetch());
