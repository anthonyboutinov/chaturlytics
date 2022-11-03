import './payouts.js'; //collection.js
import './schema.js';
// import './hooks.js';

if (Meteor.isServer) {
  import './server/publications.js';
  import './server/methods.js';
}
