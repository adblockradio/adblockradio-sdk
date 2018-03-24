// Copyright (c) 2017 Alexandre Storelli
// This file is licensed under the MIT licence.
// See the LICENSE file.

var log = require("./log.js")("abrsdk");

function abrsdk() {
	var APIHOSTS_LIST = "https://www.adblockradio.com/api/servers";
	var isNode = new Function("try {return this===global;}catch(e){return false;}")(); // detect node or browser env

	if (isNode) {
		var ioc = require("socket.io-client");
	} else {
		var ioc = require("./node_modules/socket.io-client/dist/socket.io.js");
	}

	var sio;
	var predictionCallback = null;
	var statusList = {
		STATUS_AD: 2001,
		STATUS_NOTAD: 2002,
		STATUS_SPEECH: 2003,
		STATUS_MUSIC: 2004,
		STATUS_NOT_AVAILABLE: 2005,
		STATUS_FREEMIUM_DISABLED: 2006,
		STATUS_NOT_AVAILABLE_TEMPORARY: 2007,
		STATUS_STREAM_BROKEN: 2008
	}
	var GAIN_REF = 70;
	var load = function(path, callback) {
		if (isNode) {
			//console.log("load: node not implemented");
			//callback(null);
			(path.slice(0,5) == "https" ? require("https") : require("http")).get(path, (res) => {
				var statusCode = res.statusCode;
				var contentType = res.headers['content-type'];
				var error;
				if (statusCode !== 200) {
					log.warn("load: path=" + path + " status=" + statusCode);
					return callback(null);
				}
				res.setEncoding('utf8');

				var rawData = '';
				res.on('data', (chunk) => rawData += chunk);
				res.on('end', function() {
					callback(rawData);
				});
			}).on('error', (e) => {
				callback("http request error: " + e.message, null);
			});
		} else {
			var xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if (xhttp.readyState === 4 && xhttp.status === 200) {
					callback(xhttp.responseText); //, xhttp.getResponseHeader("Content-Type"));
				}
			};
			xhttp.onerror = function (e) {
				log.warn("load: request failed: path=" + path + " e=" + e);
			};
			xhttp.open("GET", path, true);
			xhttp.send();
		}
	}

	var getServerList = function(callback) {
		var hosts;
		load(APIHOSTS_LIST, function(data) {
			try {
				hosts = JSON.parse(data);
			} catch (e) {
				return callback("could not get api servers list: " + e, []);
			}
			hosts = hosts.map(item => "https://status." + item)
			//log.debug("hosts: " + JSON.stringify(hosts));
			callback(null, hosts);
		});
	}

	var newSocket = function(hosts, ihost, callback) {
		if (sio && sio.disconnect) {
			sio.disconnect();
		}
		if (isNode) {
			sio = ioc.connect(hosts[ihost]);
		} else {
			sio = ioc(hosts[ihost]);
		}
		sio.once("reconnect", function() {
			log.info("reconnected");
			callback(null);
		});
		sio.once("connect", function() {
			log.info("connected to API host " + hosts[ihost]);
			callback(null);
		});
		sio.once("connect_timeout", function() {
			log.warn("connect timeout, will attempt to reconnect.");
			newSocket(hosts, (ihost + 1) % hosts.length, callback);
		});
		sio.on("predictions", function(data) {
			//log.debug("predictions: " + JSON.stringify(data));
			if (predictionCallback) predictionCallback(data);
		});
	}

	var connectServer = function(callback) {
		getServerList(function(err, hosts) {
			if (err) {
				return callback("connectServer: error: " + err);
			} else {
				let ihost = Math.floor(Math.random()*hosts.length); // Math.random() is always < 1
				//log.debug("selected host is " + hosts[ihost]);
				newSocket(hosts, ihost, callback);
			}
		});
	};

	var getSupportedRadios = function(callback) {
		sio.emit("supportedRadios", {}, callback);
	};

	// - radios is an array of strings of the form COUNTRY_RADIONAME,
	//   with country and radio names matching entries in www.radio-browser.info
	// - the token is a string that can be obtained by registering on
	//   https://www.adblockradio.com/player
	// - callback(errors or null, radios array taken into account):
	var sendPlaylist = function(radios, token, callback) {
		if (!token) return callback("please provide a token", null);

		log.info("send playlist update");

		sio.emit("playlist", { names: radios, token: token }, function(msg) {
			if (msg.error) {
				return callback("playlist update problem: " + msg.error, null);
			} else {
				return callback(null, msg.playlist);
			}
		});
	}

	var sendFeedback = function(isPositive, feedbackText, token) {
		if (!token) return false;
		log.info("send feedback");
		sio.emit("feedback", {
			token: token,
			feedback: {
				small: isPositive ? "up" : "dn",
				large: feedbackText
			}
		});
		return true;
	};

	// - radios is an array of strings of the form COUNTRY_RADIONAME,
	//   with country and radio names matching entries in www.radio-browser.info
	var sendFlag = function(radios, token) {
		log.info("send flag");
		sio.emit("flag", {
			token: token,
			playlist: radios,
		});
	};

	var setPredictionCallback = function(func) {
		predictionCallback = func;
	}

	return {
		_load: load, // for dev only
		_newSocket: newSocket, // for dev only
		connectServer: connectServer,
		getSupportedRadios: getSupportedRadios,
		sendPlaylist: sendPlaylist,
		sendFeedback: sendFeedback,
		sendFlag: sendFlag,
		setPredictionCallback: setPredictionCallback,
		statusList: statusList,
		GAIN_REF: GAIN_REF
	}
}

module.exports = abrsdk;
