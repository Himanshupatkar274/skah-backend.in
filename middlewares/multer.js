const express = require('express')
const multer  = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
var upload = multer({ storage: storage });

const storages = multer.memoryStorage()
var uploads = multer({ storage: storages });
module.exports = {upload, uploads}