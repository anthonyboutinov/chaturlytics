import './updateConversionRateSettingView.html';

import { Currencies } from '/imports/api/currencies/currencies.js';
import { UserRates } from '/imports/api/userRates/userRates.js';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';

Template.updateConversionRateSettingView.onCreated(function() {
  const instance = this;

  instance.subscribe("currencies.latest");
  instance.subscribe('userData');

  instance.selectedCurrency = new ReactiveVar(instance.data.currency);
  instance.dataUpdated = new ReactiveVar();
  instance.dateNow = new ReactiveVar(true);

  ////////

  instance.calculatorDropdownIsActive = new ReactiveVar(false);
  instance.payouts = new ReactiveVar(false);

});

Template.updateConversionRateSettingView.helpers({

  userCurrencies() {
    const user = Meteor.user();
    return user ? user.currencies : false;
  },

  primaryCurrency() { // FIXME: Seems like I don't use primaryCurrency at all anywhere actually!
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
    function _userConversionRateHintValue() {
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
    }

    return Template.instance().data.rate || _userConversionRateHintValue();
  },

  disabledUnlessSelectedCurrency() {
    return Currencies.findOne() && Template.instance().selectedCurrency.get() ? null : "disabled";
  },

  currency: () => Template.instance().data.currency,

  dataUpdated: () => Template.instance().dataUpdated.get(),

  dateNow: () => Template.instance().dateNow.get(),

  /////////

  disabledAttr() {
    return Currencies.findOne() ? null : "disabled";
  },

  disabledAttrPayoutsReady() {
    return Template.instance().payouts.get() ? null : "disabled";
  },


  payouts: () => Template.instance().payouts.get(),

  calculatorDropdownIsActive: () => Template.instance().calculatorDropdownIsActive.get() ? "is-active" : null,

});

Template.updateConversionRateSettingView.events({

  // 'click .toggle-currency-display'(event, instance) {
  //   event.preventDefault();
  //   const thisCurrency = this.toString();
  //   const toggleTo = !(_.indexOf(Meteor.user().currencies, thisCurrency) >= 0);
  //   Meteor.call('users.setCurrencyDisplayToggle', thisCurrency, toggleTo);
  // },

  'change .select-currency'(event, instance) {
    instance.selectedCurrency.set(event.target.value);
    const selectNode = instance.find('select.select-currency');
    selectNode.value = event.target.value;
  },

  'submit #update-conversion-rate-form'(event, instance) {
    event.preventDefault();

    let _moment;
    if (!instance.dateNow.get()) {
      _moment = moment(instance.find("#conversion-rate-date").value, "MMM D, YYYY");
      if (!_moment.isValid()) {
        alert("Not a valid date.")
        return;
      }
    }

    const currency = instance.data.currency || instance.find('.select-currency').value;
    const rate = instance.find('#user-defined-rate').value;
    const _id = instance.data._id || null;
    const date = !_moment ? new Date() : _moment.toDate();

    Meteor.call('userRates.update', currency, date, parseFloat(rate), _id, function(error, result) {
      if (!error) {
        instance.dataUpdated.set(result);
      } else {
        alert(error.message);
      }
    });
  },

  "click .set-dateNow-true"(event, instance) {
    instance.dateNow.set(true);
    instance.find("#conversion-rate-date").value = "";
  },

  "click .set-dateNow-false, focus .set-dateNow-false"(event, instance) {
    instance.dateNow.set(false);
  },

  //////////

  'click [aria-controls="dropdown-menu-calculator"]'(event, template) {
    event.preventDefault();
    template.calculatorDropdownIsActive.set(!template.calculatorDropdownIsActive.get());
  },

});
