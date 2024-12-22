const moment = require("moment");
const dbConnection = require("../connections/dbConnection");
const client = dbConnection.getClient();
const tokenTypes = require("../config/tokentype");
const jwtr = require("jsonwebtoken");
require("dotenv").config();

const saveToken = async (token, expires, type, userId) => {
  const queryCheck = `SELECT * FROM user_token WHERE user_id = $1 AND token_type = $2 AND expires_in > NOW();`;
  const valuesCheck = [userId, type];
  const existingToken = await client.query(queryCheck, valuesCheck);

  if (existingToken.rows.length > 0) {    
    // If token already exists and is valid, return it
    return existingToken.rows[0];
  }

  const queryInsert = `INSERT INTO user_token (user_id, token, expires_in, token_type) VALUES ($1, $2, $3, $4) RETURNING *;`;
  const valuesInsert = [userId, token, expires.toDate(), type];

  const result = await client.query(queryInsert, valuesInsert);
  return result.rows[0];
};

const generateAuthToken = (userId, expires, type) => {
  const payload = {
    userId: userId,
    iat: moment().unix(),
    exp: moment(expires).unix(),
    type: type,
  };
  return jwtr.sign(payload, process.env.AUTH_SECRET);
};

const generateNewRefreshToken = async (userId, tokenType = "refresh") => {
  const query = `SELECT * FROM user_token WHERE user_id = $1 AND token_type = $2 AND expires_in > NOW();`;
  const values = [userId, tokenType];

  const existingToken = await client.query(query, values);

  if (existingToken.rows.length > 0) {
    // Return the existing token if it is valid    
    const token = existingToken.rows[0];
    return {
      refreshToken: token.token,
      refreshTokenExpires: moment(token.expires_in).unix(),
    };
  }

  // Generate new token if no valid token exists
  const refreshTokenExpires = moment().add(process.env.REFRESH_EXPIRATION, "days");
  const refreshToken = generateAuthToken(userId, refreshTokenExpires, tokenTypes.tokenTypes.REFRESH);

  // Save the token in the database
  const savedToken = await saveToken(refreshToken, refreshTokenExpires, tokenTypes.tokenTypes.REFRESH, userId);

  return {
    refreshToken: savedToken.token,
    refreshTokenExpires: moment(savedToken.expires_in).unix(),
  };
};

const generateUserTokens = async (member) => {
  const accessTokenExpires = moment().add(process.env.ACCESS_EXPIRATION, "minutes");
  const accessToken = generateAuthToken(member.userId, accessTokenExpires, tokenTypes.tokenTypes.ACCESS);

  // Handle refresh token generation or retrieval
  const { refreshToken, refreshTokenExpires } = await generateNewRefreshToken(member.userId);

  return {
    token: {
      access: {
        token: accessToken,
        expires: moment(accessTokenExpires).unix(),
      },
      refresh: {
        token: refreshToken,
        expires: refreshTokenExpires,
      },
    },
  };
};



module.exports = {
    generateUserTokens, generateAuthToken
}