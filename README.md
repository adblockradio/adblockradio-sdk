# Adblock Radio client SDK
This is a JS Node & browser library to connect to adblockradio.com API servers.
It provides live information about the nature of broadcast contents: either ads, talk or music.
It also gives the average volume gain of radio streams so that channel-hopping between stations does not lead to volume variations.

## Installation
```sh
$ npm install
```
### Usage in browser:
The demo script `demo.js` *requires* `libabr.js`. To test it in a browser, you need to use [browserify](http://browserify.org/).
```sh
$ browserify demo.js -o bundle.js
```
or
```sh
$ npm run build
```
Then launch a local web server at `http://localhost:5000`:
```sh
$ serve -s
```
The demo has no UI, everything happens in the web console (F12 to display it in Firefox & Chrome).
### Usage in Node:
Put a valid token in a `token` file. Then:
```sh
$ nodejs demo_node.js
```

## How to get an API token
A token is required to use this API. To get one:
- register on https://www.adblockradio.com/player with a valid email, if not already done.
- watch your inbox for the confirmation email (it may not arrive immediately).
- the email contains a link to open the Adblock Radio player, of the form https://www.adblockradio.com/player/?t=redactedtokenblahblahcopypasteme&lang=fr
- with the example link above, the token would be "redactedtokenblahblahcopypasteme".

## Documentation

The workflow is to call `connectServer`, then get the list of available streams with `getSupportedRadios`. You create a list of desired radios and send it to the server with `sendPlaylist`. You register to a prediction callback with `setPredictionCallback`. It will give you live updates about the streams status.

If a prediction is incorrect, use `sendFlag` to help improve the system.
If you want to send some feedback with the API, use `sendFeedback`.

## Demo usage

```javascript
var abrsdk = require("./libabr.js")();
var token = "change me";

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
```

## Licence
MIT
