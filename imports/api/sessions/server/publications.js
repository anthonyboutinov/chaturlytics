import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Sessions } from '../sessions.js';
import { UserProfiles } from '../../userprofiles/userprofiles.js';

Meteor.publish('sessions.all', function () {
  if (!this.userId) {
    return this.ready();
  }

  // return this.ready();

  // Meteor._sleepForMs(2000);
  return Sessions.find( {
    userId: this.userId,
    username: UserProfiles.getCurrentUsername(this.userId)
  } );
});

Meteor.publish('sessions.forDates', function (startTime, endTime) {
  if (!this.userId) {
    return this.ready();
  }

  check(startTime, Date);
  check(endTime, Date);

  console.log({startTime, endTime});

  // Meteor._sleepForMs(2000);
  return Sessions.find(
    {
      userId: this.userId,
      username: UserProfiles.getCurrentUsername(this.userId),
      endTime: { $gte: startTime },
      // $or: [
      //   endTime : null,
        endTime : { $lte: endTime },
      // ]
    }
  );
});

Meteor.publish('sessions.last', function() {
  if (!this.userId) {
    return this.ready();
  }

  // Meteor._sleepForMs(2000);

  const liveSession = Sessions.find({
    userId: this.userId,
    username: UserProfiles.getCurrentUsername(this.userId),
    endTime: null,
  }, {
    limit: 1
  });
  if (liveSession.count()) {
    return liveSession;
  }
  return Sessions.find({
    userId: this.userId,
    username: UserProfiles.getCurrentUsername(this.userId)
  }, {
    sort: {endTime: -1},
    limit: 1
  });
});

Meteor.publish('sessions.recent', function(limit) {
  if (!this.userId) {
    return this.ready();
  }
  check(limit, Number);

  // Meteor._sleepForMs(2000);
  return Sessions.find({
    userId: this.userId,
    username: UserProfiles.getCurrentUsername(this.userId)
  }, {
    sort: {endTime: -1},
    limit,
  });
});

Meteor.publish("sessions.count", function () {
  if (!this.userId) {
    return this.ready();
  }

  var self = this;
  var count = 0;
  var initializing = true;

  const username = UserProfiles.getCurrentUsername(this.userId);

  const id = 'sessions';

  // observeChanges only returns after the initial `added` callbacks
  // have run. Until then, we don't want to send a lot of
  // `self.changed()` messages - hence tracking the
  // `initializing` state.
  var handle = Sessions.find({
    userId: this.userId,
    username
  }).observeChanges({
    added: function (id) {
      count++;
      if (!initializing)
        self.changed("counts", id, {count: count});
    },
    removed: function (id) {
      count--;
      self.changed("counts", id, {count: count});
    }
    // don't care about changed
  });

  // Instead, we'll send one `self.added()` message right after
  // observeChanges has returned, and mark the subscription as
  // ready.
  initializing = false;
  self.added("counts", id, {count: count});
  self.ready();

  // Stop observing the cursor when client unsubs.
  // Stopping a subscription automatically takes
  // care of sending the client any removed messages.
  self.onStop(function () {
    handle.stop();
  });
});
