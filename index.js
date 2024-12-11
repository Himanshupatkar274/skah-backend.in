const app = require("./app");
const server = require("http").createServer(app);
// const serverless = require('serverless-http');
require("dotenv").config();

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});

// const handler = serverless(app);

module.exports = app;
