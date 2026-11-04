const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.post('/chat', authenticateToken, aiController.chat);

// Wrap multer to handle errors gracefully (e.g. file size limit, boundary errors) with CORS headers
router.post('/transcribe', authenticateToken, (req, res, next) => {
  upload.single("audio")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File quá lớn (tối đa 70MB)." });
      }
      return res.status(400).json({ success: false, message: "Lỗi tải file: " + err.message });
    }
    next();
  });
}, aiController.transcribe);

router.post('/check-answer', authenticateToken, aiController.checkAnswer);

module.exports = router;
