'use strict';

var hello = require('./hello');
var ctx = require('./local');

hello(ctx, function(nothing, input) {
  console.log(input);
});
