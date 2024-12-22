const catchAsync = require("../utils/catchAsync");
require("dotenv").config();
const dbConnection = require("../connections/dbConnection");
const client = dbConnection.getClient();
const ApiResponse = require("../utils/apiResponse");
const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const tokenService = require("../services/tokenService");
const type = require("../config/tokentype");

const add_productItem = catchAsync(async (req, res, next) => {
  try {
    const filename = req.file.filename;
    const fileUrl = `${process.env.BASE_URL}/uploads/${filename}`;
    const data = {
      title: req.body?.title,
      price: req.body?.price,
      description: req.body?.description,
      category: req.body?.category,
      image: fileUrl,
      ratingRate: req.body?.ratingRate,
      ratingCount: req.body?.ratingCount,
    };
    const insertQuery = `
      INSERT INTO productitem (title, price, description, category, image, ratingRate, ratingCount)
      VALUES ('${data.title}', '${data.price}', '${data.description}', '${data.category}', '${data.image}', '${data.ratingRate}', '${data.ratingCount}')
      RETURNING *;`;
    const result = await client.query(insertQuery);
    ApiResponse(res, httpStatus.OK, true, "product add successfully");
  } catch (error) {
  }
});

const getAllProducts = catchAsync(async (req, res, next) => {
  const getAllProducts = "SELECT * FROM productitem";
  const result = await client.query(getAllProducts);
  ApiResponse(
    res,
    httpStatus.OK,
    true,
    "Product get successfully",
    result.rows
  );
});

const getproductById = catchAsync(async (req, res, next) => {
  const result = await client.query(
    `SELECT * FROM productitem where productid = ${req.params.id}`
  );
  ApiResponse(
    res,
    httpStatus.OK,
    true,
    "Product get successfully",
    result.rows
  );
});

const addToCart = catchAsync(async (req, res, next) => {
  try {
    const data = {
      userId: req.body.userId,
      productId: req.body.productId,
      quantity: req.body.quantity,
      price: req.body.price,
      title: req.body.title,
      base_price: req.body.base_price,
    };

    const addProduct = `
  DO $$
  DECLARE
    v_user_id numeric := '${data.userId}';
    v_product_id numeric := '${data.productId}';
    v_quantity numeric := ${data.quantity};
    v_base_price numeric := ${data.base_price};
    v_title varchar := '${data.title}';
          BEGIN
        IF EXISTS (SELECT 1 FROM cartitem WHERE user_id = v_user_id AND product_id = v_product_id) THEN
          UPDATE cartitem
          SET quantity = cartitem.quantity + v_quantity,
              price = (cartitem.quantity + v_quantity) * v_base_price
          WHERE user_id = v_user_id AND product_id = v_product_id;
        ELSE
          INSERT INTO cartitem (user_id, product_id, quantity, price, title, base_price)
          VALUES (v_user_id, v_product_id, v_quantity, v_quantity * v_base_price, v_title, v_base_price);
        END IF;
      END$$;
`;

    const result = await client.query(addProduct);
    ApiResponse(
      res,
      httpStatus.OK,
      true,
      "Item added successfully",
      result.rows
    );
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, "Item added faild", error.message);
  }
});

const getCartData = catchAsync(async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const removeCartById = `SELECT * FROM cartitem WHERE user_id = ${userId}`;
    const result = await client.query(removeCartById);
    ApiResponse(res, httpStatus.OK, true, "Item get successfully", result.rows);
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, error.message);
  }
});

const removeCartItem = catchAsync(async (req, res, next) => {
  try {
    const data = {
      userId: req.body.userId,
      productId: req.body.productId,
    };
    const removeCartById = `DELETE FROM cartitem WHERE user_id = ${data.userId} AND  product_id = ${data.productId}`;
    const result = await client.query(removeCartById);
    ApiResponse(
      res,
      httpStatus.OK,
      true,
      "Item remove successfully",
      result.rows
    );
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, error.message);
  }
});

const joinUser = catchAsync(async (req, res, next) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const emailCheckResult = await client.query(
      `SELECT * FROM users WHERE username = '${req.body.email}';`
    );
    if (emailCheckResult.rows.length > 0) {
      return ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "User already exists",
        []
      );
    }
    const insertQuery = `INSERT INTO users (username, password, full_name, mobile) VALUES ('${req.body.email}', '${hashedPassword}', '${req.body.fullName}', '${req.body.mobile}') RETURNING *;`;
    const result = await client.query(insertQuery);
    if (result.rows) {
      const memberData = {
        email: req.body.email,
        password: hashedPassword,
        fullName: req.body.fullName,
        mobile: req.body.mobile,
        userId: result.rows[0].user_id
      };
      const Token = await tokenService.generateUserTokens(memberData)
      res.status(httpStatus.OK).send({ success: true, message: "User created successfully", data: result.data[0], Token })
    }

  } catch (error) {
    return ApiResponse(
      res,
      httpStatus.BAD_REQUEST,
      false,
      "Something went wrong",
      []
    );
  }
});

const loginUser = catchAsync(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await client.query(
      `SELECT * FROM users WHERE username = '${email}';`
    );
    if (user.rows.length === 0) {
      return ApiResponse(res, httpStatus.NOT_FOUND, false, "User not found", []);
    }

    const hashedPassword = user.rows[0].password;
    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (passwordMatch) {
      const userData = {
        userId: user.rows[0].user_id
      }
      const token = await tokenService.generateUserTokens(userData);
      return res.status(httpStatus.OK).send({ success: true, message: "User Login successfully", data: user.rows[0] , token })
    } else {
      return ApiResponse(res, httpStatus.UNAUTHORIZED, false, "Incorrect password", []);
    }
  } catch (error) {
    return ApiResponse(res, httpStatus.BAD_REQUEST, false, error.message, []);
  }
});

const addAddress = catchAsync(async (req, res, next) => {
  try {
    const { userId, address, state, city, zipcode, mobileNumber, name } =
      req.body;
    const addAddress = `
      INSERT INTO user_addresses (user_id, address, state, city, zipcode, mobile_number, name)
      VALUES ($1,$2,$3,$4,$5,$6,$7);`;
    const values = [userId, address, state, city, zipcode, mobileNumber, name];
    const result = await client.query(addAddress, values);
    ApiResponse(res, httpStatus.OK, true, "Address added successfully", []);
  } catch (error) {
    ApiResponse(
      res,
      httpStatus.OK,
      false,
      "Address added faild",
      error.message
    );
  }
});

const getAddress = catchAsync(async (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "User ID is required"
      );
    }
    const getAddress = `SELECT * FROM user_addresses WHERE user_id = ${userId}`;
    const result = await client.query(getAddress);
    ApiResponse(res, httpStatus.OK, true, "Item get successfully", result.rows);
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, error.message);
  }
});

const updateShippingAddress = catchAsync(async (req, res, next) => {
  try {
    const { userId, address } = req.body;
    if (!userId) {
      return ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "User ID is required"
      );
    }
    const updateAddress = `UPDATE user_addresses SET ship_address=$1 WHERE user_id = $2`;
    const values = [address, userId];
    const result = await client.query(updateAddress, values);

    ApiResponse(
      res,
      httpStatus.OK,
      true,
      "Address set successfully",
      result.rows
    );
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, error.message);
  }
});

const updateOrderStatus = catchAsync(async (req, res, next) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId) {
      return ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "orderId is required"
      );
    }
    const query = `UPDATE user_orders SET status = $1 WHERE order_id = $2 RETURNING *;`;
    const values = [status, orderId];
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return ApiResponse(res, httpStatus.NOT_FOUND, false, "Order not found");
    }
    ApiResponse(
      res,
      httpStatus.OK,
      true,
      "order status update successfully",
      []
    );
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, error.message);
  }
});

const removeOrderFromCart = catchAsync(async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "User id os required",
        []
      );
    }
    const query = `DELETE FROM cartitem WHERE user_id = $1`;
    const values = [userId];
    const result = await client.query(query, values);
    ApiResponse(res, httpStatus.OK, true, "Cart remove successfully", []);
  } catch (error) {
    return ApiResponse(res, httpStatus.OK, false, error.message, []);
  }
});

module.exports = {
  add_productItem,
  getAllProducts,
  getproductById,
  addToCart,
  removeCartItem,
  joinUser,
  loginUser,
  getCartData,
  updateOrderStatus,
  removeOrderFromCart,
  addAddress,
  updateShippingAddress,
  getAddress,
};
