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

// Get pre-defined static test by sessionName + topicName or topicId (Part 5: 30q, Part 6: 16q, Full: 46q)
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

      // 1. Exact match
      const exactMatch = availableDirs.find(d => d.toLowerCase() === folderSlug.toLowerCase());
      if (exactMatch) candidateFolders.push(exactMatch);

      // 2. Fuzzy / Prefix match (e.g. TU_VUNG_VER_13 matches TU_VUNG_VER_13_FIXED)
      const prefixMatch = availableDirs.find(d =>
        d.toLowerCase().startsWith(folderSlug.toLowerCase()) ||
        folderSlug.toLowerCase().startsWith(d.toLowerCase())
      );
      if (prefixMatch && !candidateFolders.includes(prefixMatch)) {
        candidateFolders.push(prefixMatch);
      }

      // 3. Fallback to any available directory
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
        return (
          base === sheetSlug ||
          base.replace(/_/g, "") === sheetSlug.replace(/_/g, "") ||
          base.replace(/TEST/i, "").trim() === sheetSlug.replace(/TEST/i, "").trim()
        );
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

    // Part 5: 30 questions (101 - 130)
    if (part === "part5") {
      return res.json({
        success: true,
        source: "seed",
        metadata: testData.metadata,
        part: "part5",
        data: testData.part5
      });
    }

    // Part 6: 4 passages, 16 questions (131 - 146)
    if (part === "part6") {
      return res.json({
        success: true,
        source: "seed",
        metadata: testData.metadata,
        part: "part6",
        data: testData.part6
      });
    }

    // Full test: Part 5 (30 questions) + Part 6 (16 questions) = 46 questions
    return res.json({
      success: true,
      source: "seed",
      metadata: testData.metadata,
      part: "full",
      data: {
        title: `TOEIC Reading Test (Part 5 + Part 6 - 46 câu) - ${topicName}`,
        totalQuestions: 46,
        part5: testData.part5,
        part6: testData.part6
      }
    });

  } catch (error) {
    console.error("Lỗi lấy đề đọc mặc định:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get summary of ONLY available seed tests (Filters out empty files & sheets)
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
      if (files.length === 0) continue;

      let sessionName = folder;
      const sheets = [];

      for (const f of files) {
        try {
          const filePath = path.join(folderPath, f);
          const raw = fs.readFileSync(filePath, "utf8");
          const parsed = JSON.parse(raw);
          if (parsed.metadata?.excelFileName) {
            sessionName = parsed.metadata.excelFileName;
          }
          sheets.push({
            sheetName: parsed.metadata?.sheetName || path.parse(f).name.replace(/_/g, " "),
            sheetSlug: parsed.metadata?.sheetSlug || path.parse(f).name,
            totalVocabs: parsed.metadata?.totalVocabs || 0,
            totalQuestions: parsed.metadata?.totalQuestions || 46
          });
        } catch (err) {
          sheets.push({
            sheetName: path.parse(f).name.replace(/_/g, " "),
            sheetSlug: path.parse(f).name,
            totalQuestions: 46
          });
        }
      }

      // Sort sheets naturally: TEST 1, TEST 2, ..., TEST 10
      sheets.sort((a, b) => a.sheetName.localeCompare(b.sheetName, undefined, { numeric: true }));

      result.push({
        folderName: folder,
        sessionName: sessionName,
        totalSheets: sheets.length,
        totalVocab: sheets.reduce((sum, s) => sum + (s.totalVocabs || 0), 0),
        sheets: sheets
      });
    }

    // Sort sessions
    result.sort((a, b) => a.sessionName.localeCompare(b.sessionName, undefined, { numeric: true }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fallback legacy generate endpoint (kept for backward compatibility)
exports.generateReading = async (req, res) => {
  const { topicId, part = "part5" } = req.body;
  req.query = { topicId, part: part === "part7" ? "part6" : part };
  return exports.getReadingTest(req, res);
};

// Get list of saved exercises for a topic (excluding part7)
exports.getTopicExercises = async (req, res) => {
  const { topicId } = req.params;
  try {
    const [rows] = await pool.execute(
      "SELECT exercise_id, topic_id, part, title, created_at FROM reading_exercises WHERE topic_id = ? AND part != 'part7' ORDER BY exercise_id DESC",
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
    const [rows] = await pool.execute("SELECT * FROM reading_exercises WHERE exercise_id = ? AND part != 'part7'", [exerciseId]);
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
