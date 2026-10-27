const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

// Helper: Normalize name to folder/file slug
function normalizeSlug(name) {
  if (!name) return "";
  return String(name)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

const SEEDS_DIR = path.join(__dirname, "..", "..", "data", "reading_seeds");

// Get pre-defined static test by sessionName + topicName or topicId
exports.getReadingTest = async (req, res) => {
  try {
    let { sessionName, topicName, topicId, part = "part5" } = req.query;

    // If topicId provided, fetch session_name and topic_name from DB
    if (topicId && (!sessionName || !topicName)) {
      const [rows] = await pool.execute("SELECT session_name, topic_name FROM topics WHERE topic_id = ?", [topicId]);
      if (rows.length > 0) {
        sessionName = rows[0].session_name;
        topicName = rows[0].topic_name;
      }
    }

    if (!topicName) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin Sheet (topicName)." });
    }

    // Try finding the seed folder
    const folderSlug = normalizeSlug(sessionName || "TU_VUNG_VER_13_FIXED");
    const sheetSlug = normalizeSlug(topicName);

    // List of candidate folders to search
    let candidateFolders = [];
    if (fs.existsSync(SEEDS_DIR)) {
      const availableDirs = fs.readdirSync(SEEDS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      // Match folderSlug or fallback to available
      const exactMatch = availableDirs.find(d => d.toLowerCase() === folderSlug.toLowerCase());
      if (exactMatch) {
        candidateFolders.push(exactMatch);
      }
      // Add other folders as fallback
      availableDirs.forEach(d => {
        if (!candidateFolders.includes(d)) candidateFolders.push(d);
      });
    }

    let testData = null;

    for (const folder of candidateFolders) {
      const folderPath = path.join(SEEDS_DIR, folder);
      if (!fs.existsSync(folderPath)) continue;

      const files = fs.readdirSync(folderPath);
      // Find matching sheet file (e.g. TEST_1.json, TEST_2.json)
      const matchedFile = files.find(f => {
        const base = path.parse(f).name.toUpperCase();
        return base === sheetSlug || base.replace(/_/g, "") === sheetSlug.replace(/_/g, "");
      });

      if (matchedFile) {
        try {
          const raw = fs.readFileSync(path.join(folderPath, matchedFile), "utf8");
          testData = JSON.parse(raw);
          break;
        } catch (e) {
          console.error("Lỗi đọc file seed:", e.message);
        }
      }
    }

    if (!testData) {
      return res.status(404).json({
        success: false,
        message: `Chưa có bộ đề đọc mặc định cho Sheet "${topicName}".`
      });
    }

    // If part requested specifically
    if (part === "part5") {
      return res.json({
        success: true,
        source: "seed",
        metadata: testData.metadata,
        part: "part5",
        data: testData.part5
      });
    }

    if (part === "part6") {
      return res.json({
        success: true,
        source: "seed",
        metadata: testData.metadata,
        part: "part6",
        data: testData.part6
      });
    }

    if (part === "part7") {
      return res.json({
        success: true,
        source: "seed",
        metadata: testData.metadata,
        part: "part7",
        data: testData.part7
      });
    }

    // If full test (all 100 questions)
    return res.json({
      success: true,
      source: "seed",
      metadata: testData.metadata,
      part: "full",
      data: {
        title: `TOEIC Reading Full Test (100 câu) - ${topicName}`,
        totalQuestions: 100,
        part5: testData.part5,
        part6: testData.part6,
        part7: testData.part7
      }
    });

  } catch (error) {
    console.error("Lỗi lấy đề đọc mặc định:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get summary of available seed tests
exports.getAvailableTests = async (req, res) => {
  try {
    if (!fs.existsSync(SEEDS_DIR)) {
      return res.json({ success: true, data: [] });
    }

    const folders = fs.readdirSync(SEEDS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const result = [];
    for (const folder of folders) {
      const folderPath = path.join(SEEDS_DIR, folder);
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith(".json"));
      result.push({
        folderName: folder,
        sheets: files.map(f => path.parse(f).name.replace(/_/g, " "))
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fallback legacy generate endpoint (kept for backward compatibility)
exports.generateReading = async (req, res) => {
  // Redirect to getReadingTest logic
  const { topicId, part = "part5" } = req.body;
  req.query = { topicId, part };
  return exports.getReadingTest(req, res);
};

// Get list of saved exercises for a topic
exports.getTopicExercises = async (req, res) => {
  const { topicId } = req.params;
  try {
    const [rows] = await pool.execute(
      "SELECT exercise_id, topic_id, part, title, created_at FROM reading_exercises WHERE topic_id = ? ORDER BY exercise_id DESC",
      [topicId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single exercise by ID
exports.getExerciseById = async (req, res) => {
  const { exerciseId } = req.params;
  try {
    const [rows] = await pool.execute("SELECT * FROM reading_exercises WHERE exercise_id = ?", [exerciseId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài luyện đọc." });
    }
    const item = rows[0];
    const data = JSON.parse(item.content_json);
    res.json({
      success: true,
      data: {
        exercise_id: item.exercise_id,
        topic_id: item.topic_id,
        part: item.part,
        title: item.title,
        created_at: item.created_at,
        exercise: data
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
