const express = require("express");
const routes = require("./route/user.router");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const cors = require("cors");
require("dotenv").config(); 
const corsOptions = {
  origin: ['http://localhost:4200', 'https://skah-in.web.app'], // Allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
};
app.use(cors(corsOptions))
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api", routes);

app.use((err, req, res, next) => {
    res.status(500).send('Something broke!');
  });
  

  app.use((req, res, next) => {
    console.log(`Request received: ${req.method} ${req.url}`);
    next();
  });

module.exports = app;
