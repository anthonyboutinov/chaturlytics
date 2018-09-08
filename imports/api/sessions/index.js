import './sessions.js'; //collection.js
// import './hooks.js';

if (Meteor.isServer) {
  // import './security.js';
  import './server/publications.js';
  import './methods.js';
}
