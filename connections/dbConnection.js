const { Client } = require("pg");

// Function to create and return a client instance
let client;
function getClient() {
  if (!client) {
    client = new Client({
      user: "postgres",
      host: "localhost",
      database: "NewTestDB",
      password: "Himanshu@123",
      port: process.env.DBPORT || 5657,
    });
    // Connect to the database
    client.connect().then(() => console.log("Connected to PostgreSQL database")).catch((err) => console.error("Connection error", err));
  }
  return client;
}

module.exports = {
  getClient,
};
