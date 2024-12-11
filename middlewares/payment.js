const Razorpay = require("razorpay");
const ApiResponse = require("../utils/apiResponse");
const httpStatus = require("http-status");

var razorpay = new Razorpay({
  key_id: "rzp_test_eX9ADsz2045K1z",
  key_secret: "KwvTPu54JMr3D1U8ZQ0ToXZy",
});

/**
 * Create a new order with Razorpay
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */

const createOrder = async (req, res) => {
  try {
    const { amount } = req.body; // Amount from the frontend
    if (!amount) {
        return ApiResponse(res, httpStatus.BAD_REQUEST, false, 'Amount is required');
    }
    // Create an order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${new Date().getTime()}`,
    });
    ApiResponse(res, httpStatus.OK, true, "Order create successfully", order);
  } catch (error) {
    console.error("Razorpay Error:", error);
    // If it's a Razorpay error, handle it
    if (error.response) {
      return res.status(500).json({
        message: 'Razorpay Error',
        details: error.response,
      });
    }
    res.status(500).send("Internal Server Error");
  }
};

/**
 * Verify the payment with Razorpay
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyPayment = (req, res) => {
  try {
    const { payment_id, order_id, signature } = req.body;

    const crypto = require("crypto");
    const generated_signature = crypto
      .createHmac("sha256", razorpay.key_secret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    if (generated_signature === signature) {
      ApiResponse(res, httpStatus.OK, true, "Payment verified successfully");
    } else {
      ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "Payment verification failed"
      );
    }
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};


module.exports = {
  createOrder,
  verifyPayment,
};
