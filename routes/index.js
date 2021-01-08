const express = require('express');
const router = express.Router();
const {spawn} = require('child_process');
const _ = require('lodash');

// TODO Pay attention to differences in argument passing styles between operating systems

const availableBrowsers = getAvailableBrowsers();
if (_.isEmpty(availableBrowsers)) {
    console.log('ERROR: Please add Firefox or Google Chrome to your PATH.');
    process.exit(1);
}
const browser = Object.keys(availableBrowsers)[0];

// TODO Google Drive sharing links
// Frei verfügbar: https://drive.google.com/file/d/1sn3Ajj7pY26XKOrSpnDQvK0N5TqF8yMo/view?usp=sharing
// Nur für hinzugefügte Personen: https://drive.google.com/file/d/1Tx8iULXcrjejgKluKukE4AdS3Eoe8uNT/view?usp=sharing

router.post('/open', function (req, res) {
    spawn(browser, [resolveTargetToURL(req.body)]);
    res.status(200).send();
});

function resolveTargetToURL(target) {
    return `${target.URL}?t=${target.position}`;
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
