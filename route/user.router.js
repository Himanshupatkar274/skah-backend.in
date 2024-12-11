// userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const paymentController = require('../middlewares/payment');
const {upload} = require('../middlewares/multer');
// Define user routes

router.post('/addProductItem', upload.single('image'), userController.add_productItem)
router.get('/getAllProducts' , userController.getAllProducts)
router.get('/getproductById/:id', userController.getproductById)
router.post('/addToCart', userController.addToCart)
router.post('/removeCartItem/:id', userController.removeCartItem)
router.post('/joinUser', userController.joinUser)
router.post('/loginUser', userController.loginUser)
router.post('/removeCartItem', userController.removeCartItem)
router.post('/addAddress', userController.addAddress)
router.get('/getAddress/:userId', userController.getAddress)
router.get('/getCartData/:userId', userController.getCartData)
router.post('/createOrder', paymentController.createOrder)
router.post('/updateShippingAddress', userController.updateShippingAddress)
router.post('/paymentVerify', paymentController.verifyPayment)

module.exports = router;
