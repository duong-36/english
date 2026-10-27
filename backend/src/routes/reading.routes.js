const express = require("express");
const router = express.Router();
const readingController = require("../controllers/reading.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// Get static pre-defined test for a specific sheet (0s load)
router.get("/test", authenticateToken, readingController.getReadingTest);
router.get("/available-tests", authenticateToken, readingController.getAvailableTests);

// Legacy and database endpoints
router.post("/generate", authenticateToken, readingController.generateReading);
router.get("/topic/:topicId", authenticateToken, readingController.getTopicExercises);
router.get("/:exerciseId", authenticateToken, readingController.getExerciseById);

module.exports = router;
