const pool = require("../config/db");

// Helper: Shuffle array
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Fallback generator when AI is unavailable or quota is exceeded
function generateFallbackExercise(topicName, vocabs, part) {
  const safeVocabs = vocabs.length > 0 ? vocabs : [
    { word: "schedule", meaning: "lên lịch, lịch trình" },
    { word: "maintenance", meaning: "bảo trì" },
    { word: "notify", meaning: "thông báo" },
    { word: "inquire", meaning: "hỏi thăm, yêu cầu thông tin" },
    { word: "postpone", meaning: "hoãn lại" },
    { word: "submit", meaning: "nộp, gửi" },
    { word: "approve", meaning: "phê duyệt" },
    { word: "efficient", meaning: "hiệu quả" }
  ];

  if (part === "part5") {
    const templates = [
      { text: "The department manager decided to _______ the deadline for the final project report.", suffix: " sau khi xem xét đề xuất." },
      { text: "All employees are strictly required to _______ company policies regarding data security.", suffix: " theo đúng quy định." },
      { text: "We are pleased to _______ that our quarterly sales targets have been surpassed.", suffix: " với toàn thể nhân viên." },
      { text: "Please _______ your updated contact information to the human resources office.", suffix: " trước thứ Sáu." },
      { text: "The board will meet tomorrow to _______ the proposed annual budget.", suffix: " cho năm tài chính mới." },
      { text: "The new automation software has proven to be highly _______ in reducing costs.", suffix: " trong quá trình vận hành." },
      { text: "Customers are advised to _______ about shipping fees before confirming their purchase.", suffix: " để tránh phát sinh chi phí." },
      { text: "The technician will conduct scheduled _______ on the servers this weekend.", suffix: " nhằm đảm bảo an toàn hệ thống." },
      { text: "Mr. Henderson will _______ the international marketing seminar in Tokyo.", suffix: " vào tuần tới." },
      { text: "The committee agreed to _______ the grand opening ceremony until next month.", suffix: " do điều kiện thời tiết." }
    ];

    const count = Math.min(templates.length, Math.max(5, safeVocabs.length));
    const shuffledVocabs = shuffle(safeVocabs);
    const questions = [];

    for (let i = 0; i < count; i++) {
      const target = shuffledVocabs[i % shuffledVocabs.length];
      const tmpl = templates[i % templates.length];
      
      // Generate distractors
      const distractors = safeVocabs
        .filter(v => v.word.toLowerCase() !== target.word.toLowerCase())
        .slice(0, 3)
        .map(v => v.word);
      while (distractors.length < 3) {
        distractors.push(`option_${distractors.length + 1}`);
      }

      const allOptions = shuffle([target.word, ...distractors]);
      const keys = ["A", "B", "C", "D"];
      const correctIdx = allOptions.indexOf(target.word);
      const correctKey = keys[correctIdx >= 0 ? correctIdx : 0];

      questions.push({
        id: i + 1,
        question: tmpl.text,
        options: keys.map((k, idx) => ({ key: k, text: allOptions[idx] || "" })),
        correctAnswer: correctKey,
        explanation: `Từ cần điền là "${target.word}" (nghĩa: ${target.meaning || 'từ vựng cốt lõi'}), phù hợp nhất về nghĩa và ngữ cảnh câu.`,
        translation: tmpl.text.replace("_______", `[${target.word}]`) + tmpl.suffix,
        targetWord: target.word
      });
    }

    return {
      title: `TOEIC Part 5 - Câu hỏi từ vựng ${topicName}`,
      part: "part5",
      questions
    };
  }

  if (part === "part6") {
    const selected = safeVocabs.slice(0, 4);
    while (selected.length < 4) {
      selected.push({ word: "update", meaning: "cập nhật" });
    }

    return {
      title: `TOEIC Part 6 - Thông báo nội bộ (${topicName})`,
      part: "part6",
      passageType: "Internal Announcement",
      passage: `To: All Staff Members\nFrom: Executive Operations Team\nDate: October 27\nSubject: Important Updates for Operations\n\nPlease be informed that our team will [1] a comprehensive review of existing project workflows. During this transition, we urge all members to [2] their system files and notify supervisors immediately if any error occurs. [3]. Our main goal is to build a more [4] workplace environment for everyone.\n\nThank you for your cooperation.\nBest regards,\nOperations Department`,
      passageTranslation: `Gửi: Toàn thể nhân viên\nTừ: Ban Điều hành\nNgày: 27 tháng 10\nTiêu đề: Cập nhật quan trọng về vận hành\n\nXin lưu ý rằng đội ngũ của chúng tôi sẽ [1] một đợt đánh giá toàn diện các quy trình dự án hiện tại. Trong quá trình chuyển đổi này, chúng tôi khuyến khích tất cả thành viên [2] các tệp hệ thống của mình và thông báo cho người giám sát ngay lập tức nếu có bất kỳ lỗi nào xảy ra. [3]. Mục tiêu chính của chúng tôi là xây dựng một môi trường làm việc [4] hơn cho mọi người.\n\nCảm ơn sự hợp tác của các bạn.\nTrân trọng,\nPhòng Vận hành`,
      questions: [
        {
          id: 1,
          blankId: "[1]",
          options: [
            { key: "A", text: selected[0]?.word || "conduct" },
            { key: "B", text: "conducting" },
            { key: "C", text: "conducted" },
            { key: "D", text: "conductor" }
          ],
          correctAnswer: "A",
          explanation: `Sau trợ động từ khuyết thiếu 'will' cần động từ nguyên thể không to: '${selected[0]?.word || "conduct"}' (nghĩa: ${selected[0]?.meaning || "tiến hành"}).`,
          targetWord: selected[0]?.word || "conduct"
        },
        {
          id: 2,
          blankId: "[2]",
          options: [
            { key: "A", text: "delete" },
            { key: "B", text: selected[1]?.word || "maintain" },
            { key: "C", text: "ignoring" },
            { key: "D", text: "forgot" }
          ],
          correctAnswer: "B",
          explanation: `Cấu trúc 'urge someone to + V-inf'. Từ '${selected[1]?.word || "maintain"}' mang nghĩa phù hợp (${selected[1]?.meaning || "duy trì / bảo quản"}).`,
          targetWord: selected[1]?.word || "maintain"
        },
        {
          id: 3,
          blankId: "[3]",
          options: [
            { key: "A", text: "The cafeteria will be closed early today." },
            { key: "B", text: "Detailed guidelines will be sent to your email by noon." },
            { key: "C", text: "Please do not use the parking lot tomorrow." },
            { key: "D", text: "Flight tickets are non-refundable." }
          ],
          correctAnswer: "B",
          explanation: "Câu điền [3] liên kết chặt chẽ với ngữ cảnh quy trình dự án: thông báo hướng dẫn chi tiết sẽ được gửi qua email.",
          targetWord: "guidelines"
        },
        {
          id: 4,
          blankId: "[4]",
          options: [
            { key: "A", text: "efficiency" },
            { key: "B", text: selected[3]?.word || "efficient" },
            { key: "C", text: "efficiently" },
            { key: "D", text: "inefficiency" }
          ],
          correctAnswer: "B",
          explanation: `Cần một tính từ đứng trước danh từ 'workplace environment' và sau 'more'. '${selected[3]?.word || "efficient"}' (${selected[3]?.meaning || "hiệu quả"}) là tính từ chuẩn xác.`,
          targetWord: selected[3]?.word || "efficient"
        }
      ]
    };
  }

  // Part 7 Fallback
  const w1 = safeVocabs[0] || { word: "inquire", meaning: "hỏi thông tin" };
  const w2 = safeVocabs[1] || { word: "schedule", meaning: "lên lịch" };
  const w3 = safeVocabs[2] || { word: "submit", meaning: "nộp" };

  return {
    title: `TOEIC Part 7 - Bài đọc thư tín thương mại (${topicName})`,
    part: "part7",
    passageType: "Business Correspondence",
    passage: `MEMORANDUM\n\nTo: Regional Sales Representatives\nFrom: Clara Vance, Regional Director\nDate: October 27\nSubject: Quarterly Performance and New Client Requirements\n\nThank you for attending last week's strategy conference. As discussed, our corporate clients have decided to ${w1.word} about additional bulk order discounts. In order to accommodate these requests promptly, we must ${w2.word} weekly synchronization calls with our logistics partners.\n\nAll team leaders are requested to ${w3.word} their sales forecasts before this Friday at 5:00 PM. Representatives who meet their targets ahead of time will be eligible for a special commendation at the annual gala next month.\n\nIf you have any questions or require additional resources, please contact my administrative assistant directly.`,
    passageTranslation: `BẢN THÔNG BÁO NỘI BỘ\n\nGửi: Các đại diện bán hàng khu vực\nTừ: Clara Vance, Giám đốc Khu vực\nNgày: 27 tháng 10\nTiêu đề: Hiệu suất theo quý và Yêu cầu mới của khách hàng\n\nCảm ơn các bạn đã tham dự hội nghị chiến lược tuần trước. Như đã thảo luận, các khách hàng doanh nghiệp của chúng ta đã quyết định hỏi về các mức chiết khấu cho đơn đặt hàng số lượng lớn. Để đáp ứng kịp thời các yêu cầu này, chúng ta phải lên lịch các cuộc họp đồng bộ hóa hàng tuần với các đối tác logistics.\n\nTất cả trưởng nhóm được yêu cầu nộp dự báo doanh số trước 17:00 thứ Sáu này. Những đại diện đạt mục tiêu trước thời hạn sẽ đủ điều kiện nhận bằng khen đặc biệt tại đêm tiệc thường niên vào tháng tới.\n\nNếu bạn có thắc mắc hoặc cần thêm tài nguyên, vui lòng liên hệ trực tiếp với trợ lý hành chính của tôi.`,
    questions: [
      {
        id: 1,
        question: "What is the primary purpose of the memorandum?",
        options: [
          { key: "A", text: "To announce the cancellation of a strategy conference" },
          { key: "B", text: "To outline client requests and assign upcoming team deadlines" },
          { key: "C", text: "To terminate contracts with logistics partners" },
          { key: "D", text: "To introduce a newly hired administrative assistant" }
        ],
        correctAnswer: "B",
        explanation: "Bản ghi nhớ tóm tắt yêu cầu từ khách hàng doanh nghiệp và thông báo hạn nộp báo cáo doanh số cho toàn đội ngũ.",
        evidence: "As discussed, our corporate clients have decided to... All team leaders are requested to submit...",
        translation: "Mục đích chính của bản ghi nhớ là gì?"
      },
      {
        id: 2,
        question: `According to the memo, why will weekly calls be arranged?`,
        options: [
          { key: "A", text: "To synchronize operations with logistics partners" },
          { key: "B", text: "To interview prospective candidates" },
          { key: "C", text: "To review individual employee salaries" },
          { key: "D", text: "To train new regional representatives" }
        ],
        correctAnswer: "A",
        explanation: "Bài đọc nêu rõ: 'we must schedule weekly synchronization calls with our logistics partners'.",
        evidence: "we must schedule weekly synchronization calls with our logistics partners",
        translation: "Theo thông báo, tại sao các cuộc gọi hàng tuần lại được sắp xếp?"
      },
      {
        id: 3,
        question: "What must team leaders do by Friday at 5:00 PM?",
        options: [
          { key: "A", text: "Deliver product samples to clients" },
          { key: "B", text: "Finalize flight arrangements for the gala" },
          { key: "C", text: "Submit their sales forecasts" },
          { key: "D", text: "Sign contracts with bulk buyers" }
        ],
        correctAnswer: "C",
        explanation: "Bài đọc ghi: 'All team leaders are requested to submit their sales forecasts before this Friday at 5:00 PM.'",
        evidence: "All team leaders are requested to submit their sales forecasts before this Friday at 5:00 PM.",
        translation: "Các trưởng nhóm phải làm gì trước 17:00 chiều thứ Sáu?"
      },
      {
        id: 4,
        question: "What benefit is offered to representatives who achieve their targets early?",
        options: [
          { key: "A", text: "Additional paid vacation days" },
          { key: "B", text: "Recognition at the upcoming annual gala" },
          { key: "C", text: "A transfer to the international headquarters" },
          { key: "D", text: "Free tickets to the strategy conference" }
        ],
        correctAnswer: "B",
        explanation: "Bài đọc ghi: 'Representatives who meet their targets ahead of time will be eligible for a special commendation at the annual gala next month.'",
        evidence: "eligible for a special commendation at the annual gala next month",
        translation: "Lợi ích nào được dành cho các đại diện đạt mục tiêu sớm?"
      }
    ]
  };
}

// Generate reading exercise using Gemini 2.5 Flash
exports.generateReading = async (req, res) => {
  const { topicId, part = "part5", count = 10, forceNew = false } = req.body;
  const userId = req.user?.user_id || null;

  if (!topicId) {
    return res.status(400).json({ success: false, message: "Thiếu topicId." });
  }

  try {
    // 1. Fetch topic and vocabularies
    const [topics] = await pool.execute("SELECT * FROM topics WHERE topic_id = ?", [topicId]);
    if (topics.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bộ từ vựng (sheet)." });
    }
    const topic = topics[0];

    // If not forcing new, check if we already have exercises saved for this topic and part
    if (!forceNew) {
      const [saved] = await pool.execute(
        "SELECT * FROM reading_exercises WHERE topic_id = ? AND part = ? ORDER BY exercise_id DESC LIMIT 1",
        [topicId, part]
      );
      if (saved.length > 0) {
        try {
          const content = JSON.parse(saved[0].content_json);
          return res.json({
            success: true,
            source: "cache",
            exerciseId: saved[0].exercise_id,
            data: content
          });
        } catch (e) {
          // If JSON parse failed, proceed to generate fresh
        }
      }
    }

    const [vocabRows] = await pool.execute(
      "SELECT word, ipa, meaning FROM vocabularies WHERE topic_id = ? AND word IS NOT NULL AND word != '' LIMIT 60",
      [topicId]
    );

    if (vocabRows.length === 0) {
      return res.status(400).json({ success: false, message: "Sheet này chưa có từ vựng nào để tạo bài đọc." });
    }

    const sampleVocabs = shuffle(vocabRows).slice(0, 30);
    const vocabListStr = sampleVocabs.map(v => `${v.word} (${v.meaning})`).join(", ");

    let exerciseData = null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      let prompt = "";
      if (part === "part5") {
        prompt = `Bạn là chuyên gia ra đề thi TOEIC Reading Part 5 (Incomplete Sentences).
Hãy tạo ${Math.min(count || 10, 15)} câu trắc nghiệm điền câu đơn chuẩn format TOEIC Part 5 dựa trên danh sách từ vựng từ bộ từ "${topic.topic_name}":
[${vocabListStr}]

Yêu cầu chi tiết:
1. Mỗi câu phải đặt trong ngữ cảnh công việc/doanh nghiệp thực tế (văn phòng, marketing, kế toán, nhân sự, chăm sóc khách hàng, xuất nhập khẩu, lịch trình...).
2. Câu có đúng 1 chỗ trống thể hiện bằng "_______".
3. Trọng tâm kiểm tra các từ vựng trong danh sách trên hoặc các biến thể ngữ pháp của từ (danh/tính/động/trạng hoặc chọn nghĩa phù hợp ngữ cảnh).
4. 4 phương án A, B, C, D rõ ràng.
5. "correctAnswer": ghi chính xác một chữ cái "A", "B", "C" hoặc "D".
6. "explanation": giải thích chi tiết ngữ pháp và ngữ nghĩa bằng tiếng Việt.
7. "translation": dịch toàn bộ câu hoàn chỉnh sang tiếng Việt.
8. "targetWord": từ vựng mục tiêu từ danh sách được đem ra kiểm tra.

BẮT BUỘC trả về JSON thuần định dạng:
{
  "title": "TOEIC Part 5 - Luyện câu đơn: ${topic.topic_name}",
  "part": "part5",
  "questions": [
    {
      "id": 1,
      "question": "The manager decided to _______ the meeting until everyone was available.",
      "options": [
        {"key": "A", "text": "postpone"},
        {"key": "B", "text": "postponement"},
        {"key": "C", "text": "postponed"},
        {"key": "D", "text": "postponing"}
      ],
      "correctAnswer": "A",
      "explanation": "Cần động từ nguyên thể sau 'decided to + V'. 'Postpone' là động từ mang nghĩa hoãn lại.",
      "translation": "Người quản lý đã quyết định hoãn cuộc họp cho đến khi mọi người đều có mặt.",
      "targetWord": "postpone"
    }
  ]
}`;
      } else if (part === "part6") {
        prompt = `Bạn là chuyên gia ra đề thi TOEIC Reading Part 6 (Text Completion).
Hãy tạo 1 bài đọc điền đoạn văn gồm 4 câu hỏi chuẩn TOEIC Part 6 dựa trên các từ vựng từ bộ từ "${topic.topic_name}":
[${vocabListStr}]

Yêu cầu chi tiết:
1. Thể loại bài đọc: Email công việc, Thông báo nội bộ (Notice/Memo), hoặc Thư tín thương mại.
2. Đoạn văn chứa đúng 4 chỗ trống được đánh dấu rõ ràng là [1], [2], [3], [4].
3. Lồng ghép khéo léo 4-6 từ vựng trong danh sách vào đoạn văn và phương án trắc nghiệm.
4. Đủ 4 câu hỏi tương ứng [1], [2], [3], [4]. Mỗi câu 4 lựa chọn A, B, C, D. Trong đó ít nhất 2 câu hỏi từ vựng, 1 câu ngữ pháp/thì/từ loại, 1 câu điền trọn vẹn câu văn hoặc liên từ.
5. Có bản dịch tiếng Việt hoàn chỉnh cho bài đọc ("passageTranslation").
6. Giải thích chi tiết bằng tiếng Việt cho từng câu hỏi.

BẮT BUỘC trả về JSON thuần định dạng:
{
  "title": "TOEIC Part 6 - Điền đoạn văn: ${topic.topic_name}",
  "part": "part6",
  "passageType": "Email / Announcement / Memo",
  "passage": "Nội dung bài đọc tiếng Anh có các vị trí [1], [2], [3], [4]...",
  "passageTranslation": "Bản dịch tiếng Việt của toàn bộ bài đọc...",
  "questions": [
    {
      "id": 1,
      "blankId": "[1]",
      "options": [
        {"key": "A", "text": "..."},
        {"key": "B", "text": "..."},
        {"key": "C", "text": "..."},
        {"key": "D", "text": "..."}
      ],
      "correctAnswer": "A",
      "explanation": "Giải thích chi tiết bằng tiếng Việt...",
      "targetWord": "từ vựng liên quan"
    }
  ]
}`;
      } else {
        // Part 7
        prompt = `Bạn là chuyên gia ra đề thi TOEIC Reading Part 7 (Reading Comprehension).
Hãy tạo 1 bài đọc hiểu gồm 4 câu hỏi chuẩn TOEIC Part 7 dựa trên các từ vựng từ bộ từ "${topic.topic_name}":
[${vocabListStr}]

Yêu cầu chi tiết:
1. Thể loại: Bài đọc thương mại (Email đối tác, Quảng cáo sản phẩm/dịch vụ, Bản ghi nhớ nội bộ, Bài báo kinh doanh).
2. Tự nhiên lồng ghép 6-10 từ vựng trong danh sách trên vào văn cảnh bài đọc.
3. Đủ 4 câu hỏi trắc nghiệm A, B, C, D đa dạng: 1 câu hỏi ý chính/mục đích (purpose), 1 câu chi tiết sự thật (detail), 1 câu suy luận (inference), 1 câu từ vựng/ngữ cảnh.
4. Có trích dẫn chứng cứ từ bài đọc ("evidence") cho đáp án đúng.
5. Có dịch tiếng Việt toàn bài đọc ("passageTranslation") và câu hỏi ("translation").
6. Giải thích chi tiết bằng tiếng Việt.

BẮT BUỘC trả về JSON thuần định dạng:
{
  "title": "TOEIC Part 7 - Đọc hiểu văn bản: ${topic.topic_name}",
  "part": "part7",
  "passageType": "Business Email / Advertisement / Article",
  "passage": "Đoạn văn đọc hiểu tiếng Anh chuẩn TOEIC...",
  "passageTranslation": "Bản dịch tiếng Việt hoàn chỉnh...",
  "questions": [
    {
      "id": 1,
      "question": "What is the main purpose of the announcement?",
      "options": [
        {"key": "A", "text": "..."},
        {"key": "B", "text": "..."},
        {"key": "C", "text": "..."},
        {"key": "D", "text": "..."}
      ],
      "correctAnswer": "A",
      "explanation": "...",
      "evidence": "Trích dẫn câu chứa thông tin đáp án trong bài...",
      "translation": "Mục đích chính của thông báo là gì?"
    }
  ]
}`;
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const aiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4
            }
          })
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
              exerciseData = parsed;
            }
          }
        } else {
          console.warn("Gemini API returned status:", aiRes.status);
        }
      } catch (geminiErr) {
        console.error("Gemini Generation Error:", geminiErr.message);
      }
    }

    // If AI failed or not available, use programmatic fallback
    if (!exerciseData) {
      exerciseData = generateFallbackExercise(topic.topic_name, vocabRows, part);
    }

    // Save generated exercise into database
    let insertId = null;
    try {
      const [insertRes] = await pool.execute(
        "INSERT INTO reading_exercises (topic_id, user_id, part, title, content_json) VALUES (?, ?, ?, ?, ?)",
        [topicId, userId, part, exerciseData.title || `TOEIC ${part.toUpperCase()}`, JSON.stringify(exerciseData)]
      );
      insertId = insertRes.insertId;
    } catch (dbErr) {
      console.error("Failed to save reading exercise to DB:", dbErr.message);
    }

    res.json({
      success: true,
      source: apiKey && exerciseData ? "ai" : "fallback",
      exerciseId: insertId,
      data: exerciseData
    });

  } catch (error) {
    console.error("Reading generation error:", error);
    res.status(500).json({ success: false, message: "Lỗi tạo bài luyện đọc: " + error.message });
  }
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

// Delete exercise
exports.deleteExercise = async (req, res) => {
  const { exerciseId } = req.params;
  try {
    await pool.execute("DELETE FROM reading_exercises WHERE exercise_id = ?", [exerciseId]);
    res.json({ success: true, message: "Đã xóa bài luyện tập." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
