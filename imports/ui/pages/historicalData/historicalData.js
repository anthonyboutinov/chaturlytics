import './historicalData.html';

import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';

Template.Page_historicalData.onCreated(function(){
  this.itemAdded = new ReactiveVar();
});

Template.Page_historicalData.helpers({

  itemAdded: () => Template.instance().itemAdded.get(),

});

Template.Page_historicalData.events({

  'submit form[name="add-session"]'(event, instance) {
    event.preventDefault();
    const target = event.target;
    const startTime = moment(target.startTime.value, "MMM D YYYY H:m").toDate();
    let endTime;
    if (target.endTime.value.length <= 5) {
      endTime = target.startTime.value.substr(0, target.startTime.value.indexOf(' ', 8) + 1);
      console.log(endTime);
      endTime = moment(endTime + target.endTime.value, "MMM D YYYY H:m").toDate();
    } else {
      endTime = moment(target.endTime.value, "MMM D YYYY H:m").toDate();
    }
    const deltaTokens = parseInt(target.deltaTokens.value, 10);
    const note = target.note.value;

    Meteor.call('sessions.insertHistorical', startTime, endTime, deltaTokens, note,
      (error, result) => {
        if (error) {
          alert("Error. Could not understand entered dates. Please check them.")
        } else {
          target.reset();
          instance.itemAdded.set(result);
          setTimeout(function () {
            instance.itemAdded.set(null);
          }, 3000);
        }
      }
    );
  },

});
