const ApiResponse = (res, httpStatus, success, message, result, statusCode) => {  
    res.status(httpStatus).json({
      success: success,
      message: message,
      data: Array.isArray(result)?result:[result]
    });
  };

module.exports = ApiResponse;