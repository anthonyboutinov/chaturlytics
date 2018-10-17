Handlebars.registerHelper('formatNumber', function(value) {
  return value && typeof value === 'number' ? value.toLocaleString('en') : value;
});

Handlebars.registerHelper('or', function(a, b) {
  return a || b;
});

Handlebars.registerHelper('and', function(a, b) {
  return a && b;
});
