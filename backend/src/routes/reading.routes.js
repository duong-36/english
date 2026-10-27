const express = require("express");
const router = express.Router();
const readingController = require("../controllers/reading.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.post("/generate", authenticateToken, readingController.generateReading);
router.get("/topic/:topicId", authenticateToken, readingController.getTopicExercises);
router.get("/:exerciseId", authenticateToken, readingController.getExerciseById);
router.delete("/:exerciseId", authenticateToken, readingController.deleteExercise);

module.exports = router;
