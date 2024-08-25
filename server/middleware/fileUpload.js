const multer = require('multer');
const path = require('path');



// const upload = multer({ storage: storage });


// Define the file filter function
const fileFilter = (req, file, cb) => {
    // Accept images only (jpg, jpeg, png, gif)
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Images Only!'));
    }
};

// Set up storage configuration for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit files to 5MB
    fileFilter: fileFilter
});

module.exports = { upload };