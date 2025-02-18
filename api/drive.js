const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const path = require('path')

// Code adapted from the Node.js Quicktart section of the Google Drive API

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

function getFile(fileId) {
    return new Promise(function (resolve, reject) {
        // Load client secrets from a local file.
        fs.readFile(path.join(__dirname, '../credentials.json'), (err, content) => {
            if (err) return reject('Error loading client secret file:');
            // Authorize a client with credentials, then call the Google Drive API.
            authorize(JSON.parse(content), async (auth) => {
                resolve(await getFileRequest(auth, fileId));
            });
        });
    });
}

async function getFileRequest(auth, fileId) {
    const drive = google.drive({version: 'v3', auth});
    try {
        const res = await drive.files.get({
            fileId: fileId,
            fields: 'webContentLink, mimeType',
        });
        return res.data;
    } catch (err) {
        console.log(`The API returned an error ${err}`);
    }
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

module.exports = getFile;
