const app = require('./app');
// const serverless = require('serverless-http');
require("dotenv").config();

if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`App is running on http://localhost:${port}`);
    });
}

// const handler = serverless(app);

module.exports = app ;
  



