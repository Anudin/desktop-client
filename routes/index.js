const express = require('express');
const router = express.Router();
const {spawn} = require('child_process');
const _ = require('lodash');

// Position for HTML5 video & audio: #t=
// Position for PDF: #page=

const availableBrowsers = getAvailableBrowsers();
if (_.isEmpty(availableBrowsers)) {
    console.log('ERROR: Please add Firefox or Google Chrome to your PATH.');
    process.exit(1);
}
const browser = Object.keys(availableBrowsers)[0];

router.post('/open', function (req, res) {
    // TODO Differences in argument passing between operating systems?
    spawn(browser, [resolveTargetToURL(req.body)]);
    res.status(200).send();
});

// Check content-type with HTTP HEAD request
// Download & display via file:// URL
// Simply open text/html or unknown content-types
function resolveTargetToURL(target) {
    // YouTube link
    if (target.URL.match(/^(http[s]?:\/\/)?(www\.)?youtube\.com/)) {
        return `${target.URL}&t=${target.position}`;
    }
    // Google Drive (sharing) link
    else if (target.URL.match(/^(http[s]?:\/\/)?(www\.)?drive.google.com\/file\/d\//)) {
        // TODO Get webContentLink via Google Drive API
        // https://drive.google.com/file/d/1sn3Ajj7pY26XKOrSpnDQvK0N5TqF8yMo/view?usp=sharing - public
        // https://drive.google.com/file/d/1Tx8iULXcrjejgKluKukE4AdS3Eoe8uNT/view?usp=sharing - restricted
    } else {
        return `${target.URL}${target.position}`;
    }
}

// Receives content-type via HTTP HEAD request
function getContentType() {

}

module.exports = router;

function getAvailableBrowsers() {
    const which = require('which');

    const commands = ['google-chrome', 'chrome', 'firefox'];
    var available = {};
    for (const command of commands) {
        const path = which.sync(command, {nothrow: true});
        available = Object.assign(available, path && {[command]: path});
    }
    return available;
}
