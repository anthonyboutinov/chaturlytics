Handlebars.registerHelper('formatNumber', function(value) {
  return value && typeof value === 'number' ? value.toLocaleString('en') : value;
});
