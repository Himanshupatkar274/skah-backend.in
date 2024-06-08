// userRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controller/user.controller');
const {upload} = require('../middlewares/multer');
// Define user routes

router.post('/addProductItem', upload.single('image'), controller.add_productItem)
router.get('/getAllProducts' , controller.getAllProducts)
router.get('/getproductById/:id', controller.getproductById)
router.post('/addToCart', controller.addToCart)
router.post('/removeCartItem/:id', controller.removeCartItem)
router.post('/joinUser', controller.joinUser)
router.post('/loginUser', controller.loginUser)

module.exports = router;
