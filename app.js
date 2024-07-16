const express = require("express");
const routes = require("./route/user.router");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();

require("dotenv").config(); 

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api", routes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
  

module.exports = app;
