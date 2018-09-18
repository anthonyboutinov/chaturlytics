import { Meteor } from 'meteor/meteor';
// import { SyncedCron } from 'littledata:synced-cron';

Meteor.startup(() => {

  SyncedCron.add({
    name: 'getDataPointsForAll',
    schedule: function(parser) {
      // parser is a later.parse object
      return parser.text('every 10 minutes');
    },
    job: function() {
      console.log(new Date() + " | Calling dataPoints.getDataPointsForAll from SynecCron job named getDataPointsForAll");
      Meteor.call('dataPoints.getDataPointsForAll');
      return true;
    }
  });

  //...




  SyncedCron.start();

});
