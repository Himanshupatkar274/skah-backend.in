const ApiResponse = require("../utils/apiResponse");
const httpStatus = require("http-status");
const jwt = require('jsonwebtoken');


const authentication = () => async (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
      const bearer = bearerHeader.split(' ');
      const bearerToken = bearer[1];
  
      await jwtr.verify(bearerToken, process.env.AUTH_SECRET).then((authData) => {
        req.userData = authData;
        logger.info(`jwtrAuth:  ${JSON.stringify(authData)}`);
        console.log('authData.exp: ', Math.round((moment(authData.exp * 1000) - new Date().getTime()) / (1000 * 60)));
        //console.log('jwtrAuth: ', authData);
        next();
      }).catch((err) => {
        logger.error('jwtr auth err: now trying jwt auth');
        //Backward compatibility for previous tokens
        jwt.verify(bearerToken, process.env.JWT_SECRET, (err, authData) => {
          if (err) {
            logger.error('jwtAuth err: 401 returned');
            res.status(401).send({ message: "invalid token" });
          }
          else {
            req.userData = authData;
            //logger.info('authData: ', authData);
            next();
          }
        });
      });
    }
    else {
      return res.status(400).send({ message: "Token is required for authentication" });
    }
  }

module.exports = {authentication};
