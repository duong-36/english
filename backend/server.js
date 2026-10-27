require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth.routes");
const topicRoutes = require("./src/routes/topic.routes");
const quizRoutes = require("./src/routes/quiz.routes");
const aiRoutes = require("./src/routes/ai.routes");
const adminRoutes = require("./src/routes/admin.routes");
const readingRoutes = require("./src/routes/reading.routes");

const app = express();
const PORT = process.env.PORT || 3001;

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://english-brown-seven.vercel.app"
  ]
}));
app.use(express.json({ limit: "50mb" }));

// Handle JSON syntax errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error(err);
    return res.status(400).json({ success: false, message: "Lỗi định dạng dữ liệu JSON." });
  }
  next();
});

// ========== ROUTES ==========
app.use("/api", authRoutes); // Auth and Stats
app.use("/api", topicRoutes); // Topics, Vocabularies, Upload Excel
app.use("/api/reviews", quizRoutes);
app.use("/api", aiRoutes); // chat & transcribe
app.use("/api/admin", adminRoutes);
app.use("/api/reading", readingRoutes); // TOEIC Reading Part 5, 6, 7

// Root Endpoint
app.get("/", (req, res) => res.send("EngMaster API is running (Refactored Structure)"));

// ========== DB AUTO-MIGRATE ==========
const pool = require("./src/config/db");
async function autoMigrate() {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
    console.log("Auto-migrated: Added role column to DB.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("Role column already exists.");
  }
  
  try {
    await pool.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
    console.log("Auto-migrated: Added status column to DB.");
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log("Status column already exists.");
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_exercises (
        exercise_id INT AUTO_INCREMENT PRIMARY KEY,
        topic_id INT NOT NULL,
        user_id INT NULL,
        part VARCHAR(20) NOT NULL,
        title VARCHAR(255),
        content_json LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_topic (topic_id),
        INDEX idx_part (part)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Auto-migrated: reading_exercises table verified/created.");
  } catch (e) {
    console.error("Migration error for reading_exercises:", e.message);
  }
}
autoMigrate();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
