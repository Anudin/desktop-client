const express = require('express');
const router = express.Router();
const {spawn} = require('child_process');
const _ = require('lodash');
const axios = require('axios');
const contentType = require('content-type')
const mime = require('mime');
const fs = require('fs')
const path = require('path')
const fileUrl = require('file-url');

// Position for HTML5 video & audio: #t=
// Position for PDF: #page=

const availableBrowsers = getAvailableBrowsers();
if (_.isEmpty(availableBrowsers)) {
    console.log('ERROR: Please add Firefox or Google Chrome to your PATH.');
    process.exit(1);
}
const browser = Object.keys(availableBrowsers)[0];

router.post('/open', async (req, res) => {
    // TODO Differences in argument passing between operating systems?
    spawn(browser, [await resolveTargetToURL(req.body)]);
    res.status(200).send();
});

// Check content-type with HTTP HEAD request
// Download & display via file:// URL
// Simply open text/html or unknown content-types
async function resolveTargetToURL(target) {
    // YouTube link
    if (target.URL.match(/^(http[s]?:\/\/)?(www\.)?youtube\.com/)) {
        return `${target.URL}&t=${target.position}`;
    }
    // Google Drive (sharing) link
    else if (target.URL.match(/^(http[s]?:\/\/)?(www\.)?drive.google.com\/file\/d\//)) {
        // TODO Get webContentLink, mimeType via Google Drive API
        // https://drive.google.com/file/d/1sn3Ajj7pY26XKOrSpnDQvK0N5TqF8yMo/view?usp=sharing - public
        // https://drive.google.com/file/d/1Tx8iULXcrjejgKluKukE4AdS3Eoe8uNT/view?usp=sharing - restricted
    } else {
        // FIXME Error handling
        const contentType = await getContentType(target.URL);
        if (contentType === 'application/pdf') {
            const filePath = path.resolve(process.cwd(), 'cache', `file.${mime.getExtension(contentType)}`);
            return axios({
                method: 'get',
                url: target.URL,
                responseType: 'stream'
            }).then((res) => {
                const file = fs.createWriteStream(filePath);
                res.data.pipe(file);
                return new Promise((resolve, reject) => {
                    file.on("finish", () => {
                        // FIXME Missing position is currently passed as empty string
                        resolve(fileUrl(filePath) + ('position' in target ? `#page=${target.position}` : ''));
                    });
                    file.on("error", reject);
                });
            });
        } else {
            return target.URL + ('position' in target ? target.position : '');
        }
    }
}

// FIXME Handle HTTP error 405
async function getContentType(url) {
    const res = await axios.head(url);
    return contentType.parse(res).type;
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
