'use strict';

var hello = require('./hello');
var ctx = require('./local');

hello(ctx, function (err, input) {
	if(err) {
		return console.log(err);
	}
	console.log(input);
});
