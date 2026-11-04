const multer = require("multer");
const os = require("os");
const path = require("path");

// Use diskStorage for Audio to prevent OOM on server with large files (up to 70MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "audio-" + uniqueSuffix + path.extname(file.originalname || ".mp3"));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 70 * 1024 * 1024 } // 70MB limit
});

module.exports = upload;
