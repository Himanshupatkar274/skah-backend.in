const app = require('./app');
// const serverless = require('serverless-http');
require("dotenv").config();
const port = process.env.PORT || 3000;

app.listen(port, (res) => {
    console.log("App is connected", port);
});

// const handler = serverless(app);

module.exports = app ;
  



