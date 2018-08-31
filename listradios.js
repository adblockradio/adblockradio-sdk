// Copyright (c) 2018 Alexandre Storelli
// This file is licensed under the MIT licence.
// See the LICENSE file.

const abrsdk = require("./libabr.js")();
abrsdk.connectServer(function() {
	abrsdk.getSupportedRadios(function(data) {
		data.supportedRadios = data.supportedRadios.sort();
		console.log("supported radios (" + data.supportedRadios.length + "): " + JSON.stringify(data, null, "\t"));
	});
});
