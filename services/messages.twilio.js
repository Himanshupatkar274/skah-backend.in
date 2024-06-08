const accountSid = process.env.TWILIO_ACCOUNT_SI;
const authToken = process.env.TWILIO_AUTH_TOKE;
const messageClient = require('twilio')(accountSid, authToken);

module.exports = messageClient
