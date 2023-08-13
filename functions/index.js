global.__base = __dirname + '/';
const functions = require("firebase-functions");

var tr8 = require(__base + 'tr8');

exports.api = functions.runWith({secrets: ["TR8_PRIVATE"]}).https.onRequest((req, res) => {
    return tr8.api(req, res);
}); // api
