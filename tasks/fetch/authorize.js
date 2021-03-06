'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')
const readline = require('readline')

const chalk = require('chalk')
const google = require('googleapis')

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
require('dotenv').config();

let CLIENT_SECRETS_FILE

if (process.env.CLIENT_SECRETS_FILE) {
  CLIENT_SECRETS_FILE = process.env.CLIENT_SECRETS_FILE
} else {
  CLIENT_SECRETS_FILE = path.join(os.homedir(), '.nbn_google_client_secrets.json')
}

var secrets

try {
  secrets = JSON.parse(fs.readFileSync(CLIENT_SECRETS_FILE, 'utf8')).installed
} catch (e) {
  if (e.code === 'ENOENT') {
    console.log(chalk.red("Could not find the client secrets file at %s. Are you sure it's there?"), CLIENT_SECRETS_FILE)
  } else {
    throw e
  }
}

const GOOGLE_CLIENT_ID = secrets.client_id
const GOOGLE_CLIENT_SECRET = secrets.client_secret
const GOOGLE_REDIRECT_URI = secrets.redirect_uris[0]
const GOOGLE_TOKEN_FILE = process.env.GOOGLE_TOKEN_FILE ? process.env.GOOGLE_TOKEN_FILE : path.join(os.homedir(), '.nbn_google_drive_fetch_token')

function authorize (callback) {
  const OAuth2 = google.auth.OAuth2
  const client = new OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)

  fs.readFile(GOOGLE_TOKEN_FILE, function (err, token) {
    if (err) {
      getGoogleToken(client, callback)
    } else {
      console.log(chalk.bold('Access token found.'))
      client.setCredentials(JSON.parse(token))
      callback(client)
    }
  })
}

function getGoogleToken (client, callback) {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  })

  console.log(chalk.bold("You do not have an authorization token from Google! Let's get one or else this won't work."))
  console.log(chalk.bold('Visit this URL:\n' + chalk.yellow(url)))

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question(chalk.bold('Enter your success code from that page here:\n'), function (code) {
    rl.close()

    client.getToken(code, function (err, token) {
      if (err) {
        return console.error('Error while trying to retrieve access token', err)
      }

      client.setCredentials(token)
      saveToken(token)
      callback(client)
    })
  })
}

function saveToken (token) {
  try {
    fs.mkdirSync(path.dirname(GOOGLE_TOKEN_FILE))
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }

  fs.writeFile(GOOGLE_TOKEN_FILE, JSON.stringify(token), function (err) {
    if (err) return console.error('Error attempting to save access token file', err)
    console.log(chalk.bold('Token saved at: ' + GOOGLE_TOKEN_FILE))
  })
}

module.exports = authorize
