import './settings.html';

import { Currencies } from '/imports/api/currencies/currencies.js';
import { UserRates } from '/imports/api/userRates/userRates.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';

Template.Page_settings.onCreated(function() {
  const instance = this;
  instance.subscribe("currencies.latest");
  instance.subscribe('userData');
  instance.subscribe('userRates.all');
  instance.selectedCurrency = new ReactiveVar();
  instance.dataUpdated = new ReactiveVar();
});

Template.Page_settings.helpers({

  userCurrencies() {
    const user = Meteor.user();
    return user ? user.currencies : false;
  },

  primaryCurrency() {
    const user = Meteor.user();
    return user ? user.primaryCurrency : false;
  },

  currencyKeys() {
    const currencies = Currencies.findOne();
    if (!currencies) {
      return;
    }
    console.log({currencies});
    return _.keys(currencies.rates).sort()
  },

  currencyToggleOn() {
    const usersActiveCurrencies = Meteor.user().currencies;
    const thisCurrency = this.toString();
    return _.indexOf(usersActiveCurrencies, thisCurrency) >= 0;
  },

  userConversionRateHintValue() {
    const currencies = Currencies.findOne();
    if (!currencies) {
      return;
    }
    const selectedCurrency = Template.instance().selectedCurrency.get();
    if (!selectedCurrency) {
      return;
    }
    const rate = currencies.rates[selectedCurrency];
    const defaultTokenToUSDRate = 0.05;
    return Math.round(rate * defaultTokenToUSDRate * 100) / 100;
  },

  disabledAttr() {
    return Currencies.findOne() ? null : "disabled";
  },

  disabledUnlessSelectedCurrency() {
    return Currencies.findOne() && Template.instance().selectedCurrency.get() ? null : "disabled";
  },

  dataUpdated: () => Template.instance().dataUpdated.get(),

  userRates() {
    return UserRates.find();
  }

});

Template.Page_settings.events({

  // 'click .toggle-currency-display'(event, template) {
  //   event.preventDefault();
  //   const thisCurrency = this.toString();
  //   const toggleTo = !(_.indexOf(Meteor.user().currencies, thisCurrency) >= 0);
  //   Meteor.call('users.setCurrencyDisplayToggle', thisCurrency, toggleTo);
  // },

  'change #select-currency'(event, template) {
    template.selectedCurrency.set(event.target.value);
  },

  'click #update-user-rate'(event, template) {
    event.preventDefault();
    const currency = template.find('#select-currency').value;
    const rate = template.find('#user-defined-rate').value;
    Meteor.call('userRates.update', currency, null, parseFloat(rate), function(error, result) {
      if (!error) {
        template.dataUpdated.set(result);
        setTimeout(function () {
          template.dataUpdated.set(null);
        }, 3000);
      } else {
        alert("Server error @userRates.update");
      }
    });
  },

});
