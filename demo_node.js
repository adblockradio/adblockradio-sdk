// Copyright (c) 2017 Alexandre Storelli
// This file is licensed under the MIT licence.
// See the LICENSE file.

var abrsdk = require("./libabr.js")();

// A token is currently required to use the Adblock Radio API.
// If you have not yet registered to Adblock Radio and received a confirmation email,
// go to https://www.adblockradio.com/player and sign up with a valid email.
// wait for the confirmation email to land in your inbox.
// It contains a link of the following form. Tip: to get it you may use the
// "Copy link location" right-click tool in browsers.
// https://www.adblockradio.com/player/?t=redactedtokenblahblahcopypasteme&lang=fr
// Import that token below. With the example link above, the token would be
// "redactedtokenblahblahcopypasteme".
var token = "change me or create a token file";
// Note: Each end user should get a token. A token gives the ability to monitor
// a limited number of radios at the same time.

var isNode=new Function("try {return this===global;}catch(e){return false;}")();
if (isNode) {
	var fs = require("fs");
	try {
		token = "" + fs.readFileSync("token");
		token = token.replace("\n","");
		console.log("token loaded=|" + token + "|");
	} catch(e) {
		console.log("no token found. err=" + e);
	}
}

var onConnected = function(err) {
	if (err) return console.log("connection error: " + err);

	abrsdk.getSupportedRadios(function(data) {
		console.log("supported radios: " + JSON.stringify(data));

		// here you can choose which stations you want to monitor.
		// you can monitor at most data.maxPlaylistLen stations at the same time.
		abrsdk.sendPlaylist(data.supportedRadios.slice(0, data.maxPlaylistLen), token, function(err, validatedPlaylist) {
			if (err) {
				console.log("sendPlaylist error = " + err);
			} else {
				// the validated playlist contains the list of monitored radios you have submitted,
				// minus the unavailable, invalid, or in excess station names.
				console.log("validated playlist = " + JSON.stringify(validatedPlaylist));
				abrsdk.setPredictionCallback(onPrediction);

				// to signal an incorrect radio status, send a flag and improve future predictions.
				//abrsdk.sendFlag(validatedPlaylist, token);

				// to send a feedback with the API, use abrsdk.sendFeedback(boolean isPositive, string feedback, string token)
				//abrsdk.sendFeedback(true, "test feedback", token);
			}
		});
	});
}

var onPrediction = function(predictions) {
	var status, volume;
	for (var i=0; i<predictions.radios.length; i++) {
		switch (predictions.status[i]) {
			case abrsdk.statusList.STATUS_AD: status = "AD"; break;
			case abrsdk.statusList.STATUS_SPEECH: status = "SPEECH"; break;
			case abrsdk.statusList.STATUS_MUSIC: status = "MUSIC"; break;
			default: status = "not available";
		}
		// normalized volume to apply to the audio tag to have similar loudness between channels
		volume = Math.pow(10, (Math.min(abrsdk.GAIN_REF-predictions.gain[i],0))/20);
		// you can now plug the data to your radio player.
		console.log(predictions.radios[i] + " has status " + status + " and volume " + Math.round(volume*100)/100);
	}
}

abrsdk.connectServer(onConnected);
