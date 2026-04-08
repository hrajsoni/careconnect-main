const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = "uploads/misc";

    if (file.fieldname === "photo") {
      uploadPath = "uploads/profile-photos";
    } else if (
      file.fieldname === "idProof" ||
      file.fieldname === "licenseProof"
    ) {
      uploadPath = "uploads/nurse-documents";
    } else if (file.fieldname === "report") {
      uploadPath = "uploads/patient-reports";
    }

    ensureDir(uploadPath);
    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const safeName = `${file.fieldname}-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extName = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  const mimeType =
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "application/pdf";

  if (extName && mimeType) {
    return cb(null, true);
  }

  cb(new Error("Only JPG, PNG, and PDF files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;