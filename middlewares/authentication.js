const ApiResponse = require("../utils/apiResponse");
const httpStatus = require("http-status");
const jwtr = require('jsonwebtoken');
const moment = require("moment")

const authentication = () => async (req, res, next) => {
  const bearerHeader = req.headers['authorization'];

  if (!bearerHeader) {
    return res.status(400).send({ message: "Token is required for authentication" });
  }

  const bearerToken = bearerHeader.split(' ')[1];

  try {
    // Verify token using JWTR
    const authData = await jwtr.verify(bearerToken, process.env.AUTH_SECRET);
    // const userId = authData.sub
    const remainingMinutes = Math.round((moment(authData.exp * 1000) - new Date().getTime()) / (1000 * 60));
    console.log('authData.exp:', remainingMinutes);
    
    return next();
  } catch (jwtrError) {
    // Fallback to JWT verification
    jwtr.verify(bearerToken, process.env.JWT_SECRET, (jwtError, authData) => {
      if (jwtError) {
        return res.status(401).send({ message: "Invalid token" });
      }
      return next();
    });
  }
};


module.exports = {authentication};
