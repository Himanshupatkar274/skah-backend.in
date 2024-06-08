const express = require("express");
const routes = require("./route/user.router");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config(); 

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(port, (res) => {
  console.log("App is connected", port);
});

app.use("/api", routes);
