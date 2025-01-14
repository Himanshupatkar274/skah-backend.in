const QRCode = require('qrcode');
const fs = require('fs');

// URL for the restaurant order page
const restaurantUrl = 'https://devuser.opinion-edge.com/';

// Generate and save the QR code as an image
QRCode.toFile('./restaurant_qr.png', restaurantUrl, (err) => {
  if (err) {
    console.error('Error generating QR code:', err);
  } else {
    console.log('QR Code saved as restaurant_qr.png');
  }
});