import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

// Import needed templates
import '../../ui/layouts/body/body.js';
import '../../ui/pages/home/home.js';
import '../../ui/pages/calendarViews/calendarViews.js';
import '../../ui/pages/settings/settings.js';
import '../../ui/pages/not-found/not-found.js';

// Set up all routes in the app
FlowRouter.route('/', {
  name: 'home',
  action() {
    BlazeLayout.render('Layout_body', { content: 'Page_home' });
  },
});


FlowRouter.route('/settings', {
  name: 'settings',
  action() {
    BlazeLayout.render('Layout_body', { content: 'Page_settings' });
  },
});



let viewRouts = FlowRouter.group({
  prefix: '/view',
  name: 'view',
  triggersEnter: [function(context, redirect) {
    console.log('running group triggers');
  }]
});


viewRouts.route('/logs', {
  name: 'view.logs',
  action() {
    BlazeLayout.render('Layout_body', { content: 'Page_home' });
  },
  triggersEnter: [function(context, redirect) {
    console.log('running /logs trigger');
  }]
});

viewRouts.route('/calendar/:calendarViewMode', {
  name: 'view.calendarViews',
  action() {
    BlazeLayout.render('Layout_body', { content: 'Page_calendarViews', sectionless: true });
  },
  triggersEnter: [function(context, redirect) {
    console.log('running /logs trigger');
  }]
});

FlowRouter.notFound = {
  action() {
    BlazeLayout.render('Layout_body', { content: 'Page_notFound' });
  },
};
