import { Sessions } from '/imports/api/sessions/sessions.js';


Handlebars.registerHelper('formatNumber', function(value) {
  return value && typeof value === 'number' ? (Math.round(value * 100) / 100).toLocaleString('en') : value;
});

Handlebars.registerHelper('or', function(a, b) {
  return a || b;
});

Handlebars.registerHelper('and', function(a, b) {
  return a && b;
});

Handlebars.registerHelper('equals', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('formatDate', function(date, format) {
  if (typeof format === 'object') {
    format = 'lll';
  }
  return moment(date).format(format);
});

function _getLabelForErrorCode(errorCode) {
  return "Error: " + errorCode + ". (This message will become more detailed in a later update.)";
}

Handlebars.registerHelper('sessionErrorMessage', function(session, asString = true) {
  if (!session) return null;
  let errors = [];
  if (session.broadcastHasDropped) errors.push("The video stream has dropped for a few minutes.");
  if (session.errorCode) errors.push(_getLabelForErrorCode(session.errorCode));

  if (asString) {
    return errors.join(' ');
  }
  return errors;
});

Handlebars.registerHelper('log', function(a) {
  console.log(a);
  return "<span class='tag is-warning'>Log</span>";
});


//////////////-------------------


Handlebars.registerHelper('isBroadcasting', function() {
  const lastSession = Sessions.findOne({}, {
    sort: {startTime: -1}
  });
  if (lastSession && !lastSession.endTime) {
    return true;
  }
  if (!lastSession || lastSession.endTime && lastSession.endTime < new Date()) {
    return false;
  } else {
    return true;
  }
});
