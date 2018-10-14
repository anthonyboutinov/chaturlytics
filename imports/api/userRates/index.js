import './userRates.js';
import './schema.js';

if (Meteor.isServer) {
  import './server/publications.js';
  import './server/methods.js';
}
