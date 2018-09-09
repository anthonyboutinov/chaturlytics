import './datapoints.js'; //collection.js
import './schema.js';
// import './hooks.js';

if (Meteor.isServer) {
  // import './security.js';
  import './server/publications.js';
  import './server/methods.js';
}
