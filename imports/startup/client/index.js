// Import client startup through a single index entry point

import './routes.js';
import { Chart } from 'chart.js';

Chart.defaults.global.defaultFontFamily = 'BlinkMacSystemFont,-apple-system,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",Helvetica,Arial,sans-serif';
Chart.defaults.global.legend.position = 'bottom';
Chart.defaults.global.legend.labels.usePointStyle = true;
Chart.defaults.global.legend.labels.padding = 20;

import '/imports/ui/globalHelpers.js';

Counts = new Mongo.Collection("counts");
