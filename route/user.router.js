// userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const paymentController = require('../middlewares/payment');
const {upload} = require('../middlewares/multer');
const { authentication } = require('../middlewares/auth');
// Define user routes

router.post('/addProductItem', upload.single('image'), userController.add_productItem)
router.get('/getAllProducts', userController.getAllProducts)
router.get('/getproductById/:id', authentication(), userController.getproductById)
router.post('/addToCart', authentication(), userController.addToCart)
router.post('/joinUser', userController.joinUser)
router.post('/loginUser', userController.loginUser)
router.post('/removeCartItem', authentication(), userController.removeCartItem)
router.post('/addAddress', authentication(), userController.addAddress)
router.get('/getAvatar', authentication(), userController.getAvatar)
router.get('/getAddress/:userId', authentication(), userController.getAddress)
router.get('/getCartData/:userId', authentication(), userController.getCartData)
router.post('/createOrder', authentication(), paymentController.createOrder)
router.post('/updateShippingAddress', authentication(), userController.updateShippingAddress)
router.post('/paymentVerify', authentication(), paymentController.verifyPayment)
router.post('/getOrderHistory', authentication(), paymentController.getOrderHistory)
router.post('/getTransactionHistory', authentication(), paymentController.getTransactionHistory)
router.post('/updateOrderStatus', authentication(), userController.updateOrderStatus)
router.post('/changesPassword', authentication(), userController.changesPassword)
router.post('/updateUserInfo', authentication(), userController.updateUserInfo)
router.post('/removeOrderFromCart', authentication(), userController.removeOrderFromCart)
router.post('/continueWithGoogle', userController.continueWithGoogle)
router.post('/updateJoinDetails', userController.updateJoinDetails)
router.post('/updateAvtar', userController.updateAvtar)
router.get('/getZipData/:pincode',  authentication(), userController.getZipData)
router.post('/saveShippingAddress',  authentication(), userController.saveShippingAddress)
router.get('/getShippingAddress/:userId',  authentication(), userController.getShippingAddress)
router.get('/deleteAddressById/:userId/:id',  authentication(), userController.deleteAddressById)
router.get('/getUserDetails/:userId',  authentication(), userController.getUserDetails)

module.exports = router;
