// Register your apis here

// Deny all client-side updates to user documents
Meteor.users.deny({
  update() { return true; }
});

// import '../../api/links/methods.js';
// import '../../api/links/server/publications.js';
