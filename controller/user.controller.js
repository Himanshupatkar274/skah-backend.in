const catchAsync = require("../utils/catchAsync");
require("dotenv").config();
const dbConnection = require("../connections/dbConnection");
const client = dbConnection.getClient();
const { OAuth2Client } = require('google-auth-library');
const oAuth = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ApiResponse = require("../utils/apiResponse");
const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const tokenService = require("../services/tokenService");
const type = require("../config/tokentype");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const csv = require('fast-csv');
const path = require('path');


const add_productItem = catchAsync(async (req, res, next) => {
  try {
    let fileUrl = null; // Default value if no file is uploaded
    
    if (req.file) {
      const filename = req.file.filename;
      fileUrl = `${process.env.BASE_URL}/uploads/${filename}`;
    }

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
      RETURNING *;
    `;

    const result = await client.query(insertQuery);
    
    ApiResponse(res, httpStatus.OK, true, "Product added successfully", result.rows[0]);
  } catch (error) {
    console.error("Error in add_productItem:", error); // Log the error for debugging
    
    return ApiResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, "Something went wrong", []);
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
      image: req.body.image
    };

    const addProduct = `
  DO $$
  DECLARE
    v_user_id numeric := '${data.userId}';
    v_product_id numeric := '${data.productId}';
    v_quantity numeric := ${data.quantity};
    v_base_price numeric := ${data.base_price};
    v_title varchar := '${data.title}';
    v_image text := '${data.image}';
          BEGIN
        IF EXISTS (SELECT 1 FROM cartitem WHERE user_id = v_user_id AND product_id = v_product_id) THEN
          UPDATE cartitem
          SET quantity = cartitem.quantity + v_quantity,
              price = (cartitem.quantity + v_quantity) * v_base_price
          WHERE user_id = v_user_id AND product_id = v_product_id;
        ELSE
          INSERT INTO cartitem (user_id, product_id, quantity, price, title, base_price, image)
          VALUES (v_user_id, v_product_id, v_quantity, v_quantity * v_base_price, v_title, v_base_price, v_image);
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
    const insertQuery = `INSERT INTO users (username, password, full_name, mobile, is_profile_complete) VALUES ('${req.body.email}', '${hashedPassword}', '+91${req.body.fullName}', '${req.body.mobile}', '${req.body.isProfileComplete}') RETURNING *;`;
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
      res.status(httpStatus.OK).send({ success: true, message: "User created successfully", data: result.rows[0], Token })
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

    const userResult = await client.query(
      `SELECT * FROM users WHERE username = $1;`,
      [email]
    );
    const user = userResult.rows[0];

    if (!user) {
      return ApiResponse(res, httpStatus.OK, false, "User not found", []);
    }

    if (user.password === null) {
      return ApiResponse(res, httpStatus.OK, true, "Continue with Google", [{ isPassword: false }]);
    }

    if (!password) {
      return ApiResponse(res, httpStatus.OK, true, "Password is required", [{ isPassword: true }]);
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (isPasswordMatch) {
      const userData = { userId: user.user_id };
      const token = await tokenService.generateUserTokens(userData);

      return res.status(httpStatus.OK).send({
        success: true,
        message: "User logged in successfully",
        data: user,
        token,
      });
    }

    return ApiResponse(res, httpStatus.OK, false, "Incorrect password", []);
  } catch (error) {
    return ApiResponse(res, httpStatus.BAD_REQUEST, false, error.message, []);
  }
});


const continueWithGoogle = catchAsync(async (req, res, next) =>{
 
  try {
    const { credential } = req.body;

     const ticket = await oAuth.verifyIdToken({   // Verify and decode the Google credential
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, email_verified } = payload;
    // console.log(email, name, picture,email_verified);
     let user = await client.query(`SELECT * FROM users WHERE username = $1`, [email]);   // Check if the user already exists in the database
 if (user.rows.length === 0) {
   // If user doesn't exist, register the user
   const insertQuery = `
   INSERT INTO users (username, full_name, is_profile_complete, image)
   VALUES ($1, $2, $3, $4)
   RETURNING *;
 `;
   const values = [email, name, false, picture];
   const result = await client.query(insertQuery, values);
   user = result.rows[0];
 } else {
   user = user.rows[0];
 }
 const isProfileComplete = user.is_profile_complete;
 const member = {
  userId: user.user_id
 }
 if (isProfileComplete) {
  const appToken = await tokenService.generateUserTokens(member)
  return res.status(httpStatus.OK).send({
    success: true,
    message: "Additional details required",
    data: user,
    token: appToken,
    requireAdditionalDetails: true, // Indicate that more details are needed
  });
}
 // Generate an application-specific token
  const appToken = await tokenService.generateUserTokens(member)
  return res.status(httpStatus.OK).send({success: true, message: "User logged in dashboard", data: user, token: appToken});
  } catch (error) {
    return ApiResponse(res, httpStatus.BAD_REQUEST, false, error.message, []);
  }
})

const updateJoinDetails = catchAsync(async (req, res, next) =>{
  const  { mobile, userId } = req.body;

  try {
    if (!mobile) {
    return  ApiResponse(res, httpStatus.OK, false, "mobile number is required", []);
    }
    const result = await client.query(
      `UPDATE users SET mobile = $1, is_profile_complete = $2 WHERE user_id = $3`,
      [`+91${mobile}`, true, userId]
    );
    ApiResponse(res, httpStatus.OK, true, "update successfully", []);
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, "update failed", []);
  }
 
}) 

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
    const { orderId, status, orderStatus } = req.body;
    if (!orderId) {
      return ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "orderId is required"
      );
    }
    const query = `UPDATE user_orders SET status = $1, order_status = $2 WHERE order_id = $3 RETURNING *;`;
    const values = [status, orderStatus, orderId ];
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

const getZipData = catchAsync(async (req, res, next) =>{

  try {
    const pincode  = req.params.pincode;
 
    if (!pincode) {
      return ApiResponse(
        res,
        httpStatus.OK,
        false,
        "Pincode is required",
        []
      );
    }
    
    const query = `SELECT * FROM pin_codes WHERE pincode = $1`
    const result = await client.query(query, [pincode])

    return ApiResponse( res,  httpStatus.OK, false, "Pincode get Success", result.rows[0]);
  } catch (error) {
    return ApiResponse(res, httpStatus.OK, false, error.message, []);
  }
})


const deleteAddressById = catchAsync(async (req, res, next) =>{

  try {
    const userId  = req.params.userId;
    const id  = req.params.id;
 
    if (!userId || !id) {
      return ApiResponse( res, httpStatus.OK, false, "field is required", []);
    }
    
    const query = `DELETE FROM user_addresses WHERE user_id = $1 AND id = $2`
    const result = await client.query(query, [userId, id])

    return ApiResponse( res,  httpStatus.OK, false, "Address delete Success", []);
  } catch (error) {
    return ApiResponse(res, httpStatus.OK, false, error.message, []);
  }
})

const saveShippingAddress = catchAsync(async (req, res, next) => {
  try {
    const { userId, name, mobile, address_line1, address_line2, city, state, pincode } = req.body;

    if (!userId) {
      return ApiResponse(res, httpStatus.OK, false, "UserId is required", []);
    }

    const query = `
      INSERT INTO shipping_addresses (user_id, name, mobile_number, address_line1, address_line2, city, state, pincode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        mobile_number = EXCLUDED.mobile_number,
        address_line1 = EXCLUDED.address_line1,
        address_line2 = EXCLUDED.address_line2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        pincode = EXCLUDED.pincode,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [userId, name, mobile, address_line1, address_line2, city, state, pincode];
    const result = await client.query(query, values);

    return ApiResponse(res, httpStatus.OK, true, "Address saved successfully", result.rows[0]);
  } catch (error) {
    return ApiResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, error.message, []);
  }
});


const getShippingAddress = catchAsync(async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return ApiResponse(res, httpStatus.OK, false, "UserId is required", []);
    }

    const query = `SELECT * FROM shipping_addresses WHERE user_id = $1`;
    const result = await client.query(query, [userId]);

    return ApiResponse(res, httpStatus.OK, true, "Address get successfully", result.rows);
  } catch (error) {
    return ApiResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, error.message, []);
  }
});

const getUserDetails = catchAsync(async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return ApiResponse(res, httpStatus.OK, false, "UserId is required", []);
    }

    const query = `SELECT * FROM users WHERE user_id = $1`;
    const result = await client.query(query, [userId]);
    if (result.rows.length > 0) {
      return ApiResponse(res, httpStatus.OK, true, "User get successfully", result.rows);
    } else {
      return ApiResponse(res, httpStatus.OK, false, "User Not Found");
    }
  } catch (error) {
    return ApiResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, error.message, []);
  }
});

const changesPassword = catchAsync(async (req, res, next) => {
  try {
    const { currentPassword, newPassword, userId } = req.body;
    const userResult = await client.query(
      `SELECT * FROM users WHERE user_id = $1;`,
      [userId]
    );
    const user = userResult.rows[0];
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(newPassword, salt);
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordMatch) {
      return ApiResponse(res, httpStatus.OK, false, "Password Update Failed");
    }

    const query = `UPDATE users SET password = $1 WHERE user_id = $2 RETURNING *;`;
    const values = [ newHashedPassword, userId ];
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return ApiResponse(res, httpStatus.NOT_FOUND, false, "Password Update Failed");
    }
    ApiResponse( res,  httpStatus.OK, true,  "Password Change Successfully",  [] );

  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, error.message);
  }
});

const updateUserInfo = catchAsync(async (req, res, next) => {
  try {
    const {name,  mobile, address, userId } = req.body;
    if (!userId) {
      return ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "userId is required"
      );
    }
    const query = `UPDATE users SET full_name = $1, mobile = $2, address = $3 WHERE user_id = $4 RETURNING *;`;
    const values = [name, `+91${mobile}`, address, userId ];
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return ApiResponse(res, httpStatus.NOT_FOUND, false, "User not found");
    }
    ApiResponse(
      res,
      httpStatus.OK,
      true,
      "profile update successfully",
      []
    );
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, error.message);
  }
});

const updateAvtar = catchAsync(async (req, res, next) => {
  try {
    const {avtarUrl, userId } = req.body;
    if (!avtarUrl) {
      return ApiResponse(
        res,
        httpStatus.BAD_REQUEST,
        false,
        "avatar is required"
      );
    }
    const query = `UPDATE users SET image = $1 WHERE user_id = $2 RETURNING *;`;
    const values = [avtarUrl, userId ];
    const result = await client.query(query, values);
    if (result.rows.length === 0) {
      return ApiResponse(res, httpStatus.NOT_FOUND, false, "Avatar not found");
    }
    ApiResponse(
      res,
      httpStatus.OK,
      true,
      "Avatar update successfully",
      []
    );
  } catch (error) {
    ApiResponse(res, httpStatus.OK, false, error.message);
  }
});

const getAvatar = catchAsync(async (req, res, next) => {
  try {
    const query = `SELECT * FROM user_avatar`;
    const result = await client.query(query);
    if (result.rows.length > 0) {
      return ApiResponse(res, httpStatus.OK, true, "Avatar get successfully", result.rows);
    } else {
      return ApiResponse(res, httpStatus.OK, false, "Avatar Not Found");
    }
  } catch (error) {
    return ApiResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, error.message, []);
  }
});

const saveOrderDetails = catchAsync(async (req, res, next) =>{
     try {
      const items = req.body; // Expecting an array of items
      const query = `
        INSERT INTO order_items (order_id, product_id, product_img, quantity, price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
  
      const results = [];
      for (const item of items) {
        const values = [
          item.orderId, 
          item.productId, 
          item.productImg, 
          item.quantity, 
          item.price
        ];
        const result = await client.query(query, values);
        results.push(result.rows[0]);
      }

        return ApiResponse(res, httpStatus.OK, true, "Order saved successfully", []);
     } catch (error) {
      return ApiResponse(res, httpStatus.INTERNAL_SERVER_ERROR, false, error.message, []);
     }
});

const getOrderDetails = catchAsync(async (req, res, next) => {
  try {
    const orderId  = req.params.orderId;
 
    if (!orderId) {
      return ApiResponse(
        res,
        httpStatus.OK,
        false,
        "Order Id is required",
        []
      );
    }
    
    const query = `SELECT * FROM order_items WHERE order_id = $1`
    const result = await client.query(query, [orderId])

    return ApiResponse( res,  httpStatus.OK, false, "Order get Success", result.rows);
  } catch (error) {
    return ApiResponse(res, httpStatus.OK, false, error.message, []);
  }
});

module.exports = {
  add_productItem, deleteAddressById, getAvatar, updateAvtar, getOrderDetails, 
  getAllProducts, saveShippingAddress,
  getproductById, getShippingAddress, changesPassword, 
  addToCart, getUserDetails, updateUserInfo, saveOrderDetails, 
  removeCartItem,
  joinUser,
  loginUser,
  getCartData,
  updateOrderStatus,
  removeOrderFromCart,
  addAddress, continueWithGoogle,
  updateShippingAddress, getZipData,
  getAddress, updateJoinDetails
};
