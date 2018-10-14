if (Meteor.isServer) {
  import './server/hooks.js';
  import './server/methods.js';
  import './server/publications.js';
}
