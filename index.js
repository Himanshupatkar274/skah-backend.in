const app = require('./app');
const server = require('http').createServer(app);
const serverless = require('serverless-http');
require("dotenv").config();




const handler = serverless(app);

module.exports.handler = handler;



