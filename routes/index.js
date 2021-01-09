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
const gdrive = require('../api/drive');

// See https://caniuse.com/audio
const supportedAudioFormats = [
    'audio/wav',
    'audio/mpeg',
    'audio/ogg',
    'audio/opus',
    'audio/flac',
];

// See https://caniuse.com/video
const supportedVideoFormats = [
    'video/webm',
    'video/mpeg',
    'video/ogg'
];

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

async function resolveTargetToURL(target) {
    // Edge cases, there's no (official) way to obtain a direct download link
    if (target.URL.match(/^(http[s]?:\/\/)?(www\.)?youtube\.com/)) {
        return `${target.URL}&t=${target.position}`;
    }

    let url = target.URL;
    let mimeType = '';
    // A direct download link as well as the applying MIME-type is either directly available or available through an API call
    // TODO Doesn't respect https://docs.google.com/spreadsheets
    if (target.URL.match(/^(http[s]?:\/\/)?(www\.)?drive.google.com\/file\/d\//)) {
        // https://drive.google.com/file/d/1sn3Ajj7pY26XKOrSpnDQvK0N5TqF8yMo/view?usp=sharing - public
        // https://drive.google.com/file/d/1Tx8iULXcrjejgKluKukE4AdS3Eoe8uNT/view?usp=sharing - restricted
        const fileId = target.URL.match(/^(?:http[s]?:\/\/)?(?:www\.)?drive.google.com\/file\/d\/(.*?)\//)[1];
        const response = await gdrive(fileId).catch((err) => null);
        if (response) {
            url = response.webContentLink;
            mimeType = response.mimeType;

            const exportParam = '&export=download';
            if (_.endsWith(url, exportParam)) url = url.substr(0, url.length - exportParam.length);
        }
    } else {
        // TODO Handle failing HEAD request
        mimeType = await getContentType(target.URL);
    }

    if (mimeType === 'application/pdf') {
        return url + (target.position !== '' ? `#page=${target.position}` : '');
    } else if (supportedAudioFormats.includes(mimeType) || supportedVideoFormats.includes(mimeType)) {
        return url + (target.position !== '' ? `#t=${target.position}` : '');
    } else {
        return url + (target.position !== '' ? target.position : '');
    }
}

async function getContentType(url) {
    const res = await axios.head(url).catch((e) => null);
    return res !== null ? contentType.parse(res).type : '';
}

// Don't use, misses error handling, may leak resources, see
// https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries
// async function download(url) {
//     const filePath = path.resolve(process.cwd(), 'cache', `file.${mime.getExtension(contentType)}`);
//     return axios({
//         method: 'get',
//         url: url,
//         responseType: 'stream'
//     }).then((res) => {
//         const file = fs.createWriteStream(filePath);
//         res.data.pipe(file);
//         return new Promise((resolve, reject) => {
//             file.on("finish", () => {
//                 resolve(true);
//             });
//             file.on("error", reject);
//         });
//     });
// }

module.exports = router;

function getAvailableBrowsers() {
    const which = require('which');

    const commands = ['google-chrome', 'chrome', 'firefox'];
    let available = {};
    for (const command of commands) {
        const path = which.sync(command, {nothrow: true});
        available = Object.assign(available, path && {[command]: path});
    }
    return available;
}
