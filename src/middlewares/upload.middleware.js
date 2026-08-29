const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;

  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );

  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    return cb(
      new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"),
      false,
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

const uploadSingleImage = upload.single("profileImage");
const uploadMultipleImages = upload.array("profileImages", 5);

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
};
