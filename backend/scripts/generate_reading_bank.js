const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Utility: Shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Clean string
function cleanStr(s) {
  return s ? String(s).trim() : '';
}

// Generate Part 5 Questions (30 questions: 101 - 130)
function generatePart5(vocabs, sheetName) {
  const questions = [];
  const safeVocabs = vocabs.filter(v => v.word && v.meaning);
  const shuffled = shuffle(safeVocabs);

  // Business Sentence Context Templates for Part 5
  const templates = [
    {
      ctx: "Before finalizing the agreement, the legal department requested that all staff _______ carefully.",
      meaningPrefix: "cần kiểm tra/thực hiện",
      grammarRule: "Sau 'requested that all staff + V-inf' cần động từ/cụm từ nguyên mẫu."
    },
    {
      ctx: "Mr. Thompson had trouble _______ the quarterly financial statement before the deadline.",
      meaningPrefix: "gặp khó khăn khi",
      grammarRule: "Cấu trúc 'have trouble doing something' đòi hỏi dạng V-ing phù hợp ngữ cảnh."
    },
    {
      ctx: "If you cannot reach the department manager directly, please _______ with the front desk.",
      meaningPrefix: "hành động phù hợp khi gọi điện/liên lạc là",
      grammarRule: "Ngữ cảnh liên lạc văn phòng, chọn cụm từ thích hợp nhất."
    },
    {
      ctx: "Employees must show their _______ to the security guard before entering the facility.",
      meaningPrefix: "vật dụng cần xuất trình khi vào cổng là",
      grammarRule: "Cần danh từ chỉ giấy tờ/thẻ phù hợp để xác thực danh tính."
    },
    {
      ctx: "The director scheduled a meeting to _______ with the regional sales representatives.",
      meaningPrefix: "mục đích cuộc họp là để",
      grammarRule: "Cấu trúc chỉ mục đích 'to + V-inf' diễn tả hành động trong công việc."
    },
    {
      ctx: "Due to a technical issue on the server, the technical team will _______ this evening.",
      meaningPrefix: "hành động xử lý sự cố là",
      grammarRule: "Sau trợ động từ 'will' là động từ nguyên thể không to."
    },
    {
      ctx: "Please provide your _______ when filling out the online registration form.",
      meaningPrefix: "thông tin cần cung cấp là",
      grammarRule: "Cần một cụm danh từ thích hợp làm tân ngữ cho động từ 'provide'."
    },
    {
      ctx: "The accounting department reminds all supervisors to _______ by the end of the month.",
      meaningPrefix: "yêu cầu cần hoàn thành là",
      grammarRule: "Cấu trúc 'remind someone to + V-inf'."
    },
    {
      ctx: "Customers who require specialized assistance are encouraged to speak with a _______.",
      meaningPrefix: "người hỗ trợ chuyên trách là",
      grammarRule: "Cần danh từ chỉ người/chức danh sau mạo từ 'a'."
    },
    {
      ctx: "The company announced plans to _______ in order to accommodate its expanding workforce.",
      meaningPrefix: "kế hoạch mở rộng là",
      grammarRule: "Cụm động từ nguyên mẫu sau 'plans to'."
    },
    {
      ctx: "All travel expenses must be documented and submitted with an official _______.",
      meaningPrefix: "chứng từ đi kèm là",
      grammarRule: "Cần danh từ chỉ tài liệu/chứng từ sau mạo từ 'an official'."
    },
    {
      ctx: "The supervisor commended the project team for their _______ during the inspection.",
      meaningPrefix: "phẩm chất/hành động được khen ngợi là",
      grammarRule: "Cần danh từ sau tính từ sở hữu 'their'."
    },
    {
      ctx: "Prospective applicants are advised to _______ prior to submitting their portfolio.",
      meaningPrefix: "lời khuyên dành cho ứng viên là",
      grammarRule: "Cấu trúc bị động 'are advised to + V-inf'."
    },
    {
      ctx: "To avoid unnecessary delays, international packages must _______ the destination clearly.",
      meaningPrefix: "yêu cầu đối với bưu kiện là",
      grammarRule: "Sau động từ khuyết thiếu 'must' cần động từ nguyên mẫu."
    },
    {
      ctx: "The customer was highly satisfied with the prompt response from our _______ team.",
      meaningPrefix: "bộ phận hỗ trợ khách hàng là",
      grammarRule: "Cần danh từ/tính từ bổ nghĩa cho 'team'."
    },
    {
      ctx: "Management decided to _______ until market conditions stabilize next quarter.",
      meaningPrefix: "quyết định của ban quản lý là",
      grammarRule: "Cấu trúc 'decided to + V-inf'."
    },
    {
      ctx: "Please make sure to _______ before leaving the conference room.",
      meaningPrefix: "việc cần làm trước khi rời phòng là",
      grammarRule: "Cấu trúc 'make sure to + V-inf'."
    },
    {
      ctx: "A thorough review of the system revealed several areas that require _______ attention.",
      meaningPrefix: "loại sự chú ý cần thiết là",
      grammarRule: "Cần tính từ đứng trước danh từ 'attention'."
    },
    {
      ctx: "The human resources division has issued new guidelines regarding _______ in the workplace.",
      meaningPrefix: "chủ đề quy định là",
      grammarRule: "Sau giới từ 'regarding' cần danh từ hoặc V-ing."
    },
    {
      ctx: "Clients are requested to pay the _______ before the project initiation phase begins.",
      meaningPrefix: "khoản tiền cần thanh toán là",
      grammarRule: "Cần cụm danh từ chỉ phí/chi phí làm tân ngữ của 'pay'."
    },
    {
      ctx: "The logistics company has agreed to _______ all damaged merchandise immediately.",
      meaningPrefix: "cam kết xử lý hàng hóa là",
      grammarRule: "Cấu trúc 'agreed to + V-inf'."
    },
    {
      ctx: "Our senior consultant will provide _______ on optimizing your business workflow.",
      meaningPrefix: "nội dung tư vấn cung cấp là",
      grammarRule: "Cần danh từ sau 'provide' kết hợp với giới từ 'on'."
    },
    {
      ctx: "Visitors must check in at the _______ upon entering the headquarters building.",
      meaningPrefix: "địa điểm tiếp đón là",
      grammarRule: "Cần danh từ chỉ địa điểm/vị trí sau giới từ 'at the'."
    },
    {
      ctx: "The annual budget proposal will be presented to the board for _______ next Tuesday.",
      meaningPrefix: "mục đích trình lên hội đồng là để",
      grammarRule: "Sau giới từ 'for' cần danh từ chỉ sự phê duyệt/xem xét."
    },
    {
      ctx: "Participants in the training session are asked to _______ with their assigned groups.",
      meaningPrefix: "yêu cầu học viên là",
      grammarRule: "Cấu trúc 'are asked to + V-inf'."
    },
    {
      ctx: "The executive committee reached a unanimous agreement to _______ the partnership.",
      meaningPrefix: "quyết định liên quan đến đối tác là",
      grammarRule: "Cấu trúc 'agreement to + V-inf'."
    },
    {
      ctx: "Before boarding the corporate shuttle, passengers must present their _______.",
      meaningPrefix: "vật phẩm cần xuất trình là",
      grammarRule: "Cần danh từ chỉ vé/thẻ thông hành sau 'their'."
    },
    {
      ctx: "The technician worked diligently to _______ the malfunctioning equipment by noon.",
      meaningPrefix: "hành động khắc phục thiết bị là",
      grammarRule: "Cấu trúc 'worked diligently to + V-inf'."
    },
    {
      ctx: "All feedback received from recent surveys indicates a strong preference for _______.",
      meaningPrefix: "sự lựa chọn ưu tiên là",
      grammarRule: "Sau giới từ 'for' cần danh từ hoặc cụm danh từ."
    },
    {
      ctx: "The branch manager expressed gratitude for the team's _______ during peak hours.",
      meaningPrefix: "sự cống hiến/nỗ lực được ghi nhận là",
      grammarRule: "Cần danh từ sau 'the team's'."
    }
  ];

  for (let i = 0; i < 30; i++) {
    const qNum = 101 + i;
    const target = shuffled[i % shuffled.length];
    const tmpl = templates[i % templates.length];

    // Pick 3 distractors from the rest of the vocabulary list
    const distractors = safeVocabs
      .filter(v => cleanStr(v.word).toLowerCase() !== cleanStr(target.word).toLowerCase())
      .slice(i * 3, (i * 3) + 3)
      .map(v => v.word);

    while (distractors.length < 3) {
      distractors.push(`alternative_${distractors.length + 1}`);
    }

    const optionsList = shuffle([target.word, ...distractors]);
    const keys = ["A", "B", "C", "D"];
    const correctIdx = optionsList.indexOf(target.word);
    const correctKey = keys[correctIdx >= 0 ? correctIdx : 0];

    const sentenceText = tmpl.ctx.replace("_______", "_______");
    const fullSentence = tmpl.ctx.replace("_______", target.word);

    questions.push({
      id: qNum,
      questionNumber: qNum,
      question: sentenceText,
      options: keys.map((k, idx) => ({ key: k, text: optionsList[idx] || "" })),
      correctAnswer: correctKey,
      explanation: `Đáp án đúng là [${correctKey}] "${target.word}" (nghĩa: ${target.meaning}). ${tmpl.grammarRule}`,
      translation: `Câu hoàn chỉnh: "${fullSentence}". Nghĩa: ${target.meaning}`,
      targetWord: target.word
    });
  }

  return {
    title: `TOEIC Reading Part 5 - Incomplete Sentences (${sheetName})`,
    totalQuestions: 30,
    questions
  };
}

// Generate Part 6: 4 passages, 16 questions (131 - 146)
function generatePart6(vocabs, sheetName) {
  const safeVocabs = vocabs.filter(v => v.word && v.meaning);
  const shuffled = shuffle(safeVocabs);

  const passagesConfig = [
    {
      passageId: 1,
      passageType: "Email Announcement",
      title: "Notice of Systems Modernization and Staff Guidelines",
      offset: 131,
      context: "Thông báo nâng cấp hệ thống nội bộ"
    },
    {
      passageId: 2,
      passageType: "Business Letter",
      title: "Confirmation of Annual Service Agreement and Pricing",
      offset: 135,
      context: "Thư xác nhận hợp đồng dịch vụ thường niên"
    },
    {
      passageId: 3,
      passageType: "Internal Memorandum",
      title: "Revised Travel Reimbursement and Expense Protocol",
      offset: 139,
      context: "Quy định thanh toán chi phí công tác mới"
    },
    {
      passageId: 4,
      passageType: "Facility Advisory",
      title: "Upcoming Building Improvements and Parking Relocation",
      offset: 143,
      context: "Thông báo cải tạo toà nhà và bố trí bãi đậu xe"
    }
  ];

  const passages = passagesConfig.map((cfg, pIdx) => {
    const pWords = shuffled.slice(pIdx * 4, (pIdx + 1) * 4);
    while (pWords.length < 4) {
      pWords.push({ word: "coordinate", meaning: "phối hợp" });
    }

    const q1Num = cfg.offset;
    const q2Num = cfg.offset + 1;
    const q3Num = cfg.offset + 2;
    const q4Num = cfg.offset + 3;

    const w1 = pWords[0];
    const w2 = pWords[1];
    const w3 = pWords[2];
    const w4 = pWords[3];

    let passageText = "";
    let translationText = "";

    if (cfg.passageType === "Email Announcement") {
      passageText = `To: All Department Staff\nFrom: Operations Directorate\nDate: October 27\nSubject: Scheduled System Upgrades\n\nPlease be advised that our IT infrastructure team will [${q1Num}] essential server upgrades this coming weekend. During this transition window, all personnel are instructed to [${q2Num}] their ongoing project records prior to Friday at 6:00 PM.\n\n[${q3Num}]. We appreciate your patience and assistance as we strive to create a more [${q4Num}] operational environment for the entire company.\n\nSincerely,\nDirector of IT`;
      translationText = `Gửi: Toàn thể nhân viên phòng ban\nTừ: Ban Giám đốc Vận hành\nNgày: 27 tháng 10\nTiêu đề: Lịch nâng cấp hệ thống\n\nXin lưu ý rằng đội ngũ hạ tầng CNTT sẽ [${q1Num}] các nâng cấp máy chủ quan trọng vào cuối tuần này. Trong khoảng thời gian chuyển giao này, toàn bộ nhân sự được hướng dẫn [${q2Num}] các hồ sơ dự án đang thực hiện trước 18:00 chiều thứ Sáu.\n\n[${q3Num}]. Chúng tôi trân trọng sự kiên nhẫn và giúp đỡ của các bạn khi chúng tôi nỗ lực xây dựng môi trường vận hành [${q4Num}] hơn cho toàn công ty.\n\nTrân trọng,\nGiám đốc CNTT`;
    } else if (cfg.passageType === "Business Letter") {
      passageText = `Dear Valued Partner,\n\nWe are writing to formalize our agreement regarding the upcoming fiscal year. Our executive committee has reviewed your proposal and decided to [${q1Num}] the terms outlined in the memorandum. We believe that this partnership will [${q2Num}] substantial mutual benefits for both organizations.\n\n[${q3Num}]. Please do not hesitate to contact our representative if you require further [${q4Num}] regarding billing arrangements.\n\nWarm regards,\nCorporate Relations Office`;
      translationText = `Kính gửi Quý đối tác,\n\nChúng tôi viết thư này để chính thức hóa thỏa thuận cho năm tài chính sắp tới. Ban điều hành của chúng tôi đã xem xét đề xuất và quyết định [${q1Num}] các điều khoản nêu trong bản ghi nhớ. Chúng tôi tin rằng quan hệ đối tác này sẽ [${q2Num}] những lợi ích to lớn cho cả hai bên.\n\n[${q3Num}]. Xin đừng ngần ngại liên hệ đại diện của chúng tôi nếu bạn cần thêm [${q4Num}] về các thỏa thuận thanh toán.\n\nTrân trọng,\nVăn phòng Quan hệ Doanh nghiệp`;
    } else if (cfg.passageType === "Internal Memorandum") {
      passageText = `MEMORANDUM\n\nTo: Traveling Executives and Field Associates\nFrom: Finance and Compliance Department\nSubject: Updated Travel Expense Claims\n\nIn order to streamline our expense auditing procedures, the accounting team has instituted a new digital filing process. Effective immediately, travelers must [${q1Num}] all itemized receipts via the employee portal within five days of return. Any expense report submitted without appropriate [${q2Num}] will experience delays in reimbursement.\n\n[${q3Num}]. Your adherence to this updated protocol ensures [${q4Num}] processing of all employee disbursements.\n\nThank you for your cooperation.`;
      translationText = `BẢN GHI NHỚ\n\nGửi: Các cán bộ đi công tác và nhân viên thị trường\nTừ: Phòng Tài chính và Tuân thủ\nTiêu đề: Yêu cầu thanh toán chi phí công tác cập nhật\n\nĐể đơn giản hóa quy trình kiểm toán chi phí, bộ phận kế toán đã thiết lập quy trình nộp hồ sơ số mới. Có hiệu lực ngay lập tức, người đi công tác phải [${q1Num}] toàn bộ hóa đơn chi tiết qua cổng thông tin nhân viên trong vòng 5 ngày kể từ ngày về. Mọi báo cáo chi phí nộp thiếu [${q2Num}] hợp lệ sẽ bị chậm trễ hoàn tiền.\n\n[${q3Num}]. Việc tuân thủ quy trình này sẽ đảm bảo xử lý [${q4Num}] cho mọi khoản giải ngân.\n\nCảm ơn sự hợp tác của các bạn.`;
    } else {
      passageText = `FACILITY ADVISORY\n\nAttention: Building Occupants\n\nBeginning next Monday, extensive exterior restoration work will commence on the western wing of the facility. Contractors will [${q1Num}] new energy-efficient double-pane windows throughout the second floor. To ensure safety, pedestrian access along the main pathway will be temporarily [${q2Num}] until Wednesday afternoon.\n\n[${q3Num}]. The facility management team remains dedicated to ensuring the highest standards of [${q4Num}] for all visitors and employees.\n\nSincerely,\nFacilities Management`;
      translationText = `THÔNG BÁO VẬN HÀNH TOÀ NHÀ\n\nLưu ý: Khách thuê và nhân sự trong toà nhà\n\nBắt đầu từ thứ Hai tới, công việc trùng tu ngoại thất sẽ được tiến hành ở cánh phía Tây toà nhà. Các nhà thầu sẽ [${q1Num}] các cửa sổ hai lớp tiết kiệm năng lượng trên toàn bộ tầng 2. Để đảm bảo an toàn, lối đi bộ chính sẽ tạm thời bị [${q2Num}] cho đến chiều thứ Tư.\n\n[${q3Num}]. Ban quản lý toà nhà luôn tận tâm duy trì các tiêu chuẩn [${q4Num}] cao nhất cho khách tham quan và nhân viên.\n\nTrân trọng,\nBan Quản lý Toà nhà`;
    }

    // 4 Questions for this passage
    const q1Opts = shuffle([w1.word, "overlook", "diminish", "abandon"]);
    const q2Opts = shuffle([w2.word, "neglect", "postpone", "eliminate"]);
    const q3Opts = shuffle([
      "Detailed step-by-step instructions have been uploaded to the shared folder.",
      "The annual company dinner will be postponed until winter.",
      "Parking permits are strictly non-transferable between vehicles.",
      "The kitchen pantry will be closed for sanitation."
    ]);
    const q4Opts = shuffle([w4.word, "complexity", "hesitation", "uncertainty"]);

    const questions = [
      {
        id: q1Num,
        questionNumber: q1Num,
        blankId: `[${q1Num}]`,
        options: ["A", "B", "C", "D"].map((k, idx) => ({ key: k, text: q1Opts[idx] })),
        correctAnswer: ["A", "B", "C", "D"][q1Opts.indexOf(w1.word)],
        explanation: `Vị trí [${q1Num}] cần từ "${w1.word}" mang nghĩa: ${w1.meaning}, hoàn toàn chuẩn xác với ngữ cảnh thông báo.`,
        targetWord: w1.word
      },
      {
        id: q2Num,
        questionNumber: q2Num,
        blankId: `[${q2Num}]`,
        options: ["A", "B", "C", "D"].map((k, idx) => ({ key: k, text: q2Opts[idx] })),
        correctAnswer: ["A", "B", "C", "D"][q2Opts.indexOf(w2.word)],
        explanation: `Vị trí [${q2Num}] chọn "${w2.word}" (nghĩa: ${w2.meaning}) phù hợp về ngữ pháp và kết hợp từ trong văn bản.`,
        targetWord: w2.word
      },
      {
        id: q3Num,
        questionNumber: q3Num,
        blankId: `[${q3Num}]`,
        options: ["A", "B", "C", "D"].map((k, idx) => ({ key: k, text: q3Opts[idx] })),
        correctAnswer: ["A", "B", "C", "D"][q3Opts.indexOf("Detailed step-by-step instructions have been uploaded to the shared folder.")],
        explanation: `Câu điền [${q3Num}] cung cấp thông tin liên kết hợp lý nhất về hướng dẫn triển khai cho toàn thể nhân sự.`,
        targetWord: "instructions"
      },
      {
        id: q4Num,
        questionNumber: q4Num,
        blankId: `[${q4Num}]`,
        options: ["A", "B", "C", "D"].map((k, idx) => ({ key: k, text: q4Opts[idx] })),
        correctAnswer: ["A", "B", "C", "D"][q4Opts.indexOf(w4.word)],
        explanation: `Vị trí [${q4Num}] yêu cầu danh từ/tính từ "${w4.word}" (${w4.meaning}) thể hiện cam kết chất lượng môi trường làm việc.`,
        targetWord: w4.word
      }
    ];

    return {
      passageId: cfg.passageId,
      passageType: cfg.passageType,
      title: cfg.title,
      passage: passageText,
      passageTranslation: translationText,
      questions
    };
  });

  return {
    title: `TOEIC Reading Part 6 - Text Completion (${sheetName})`,
    totalPassages: 4,
    totalQuestions: 16,
    passages
  };
}

// Main generation execution (Part 5 + Part 6 = 46 questions)
function buildBankForFile(filePath, folderName) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  const wb = xlsx.readFile(filePath);
  const outDir = path.join(__dirname, '..', 'data', 'reading_seeds', folderName);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`\n========================================`);
  console.log(`Generating Reading Question Bank for: ${path.basename(filePath)} (Part 5 & Part 6 only)`);
  console.log(`Target folder: ${outDir}`);
  console.log(`Sheets count: ${wb.SheetNames.length}`);

  wb.SheetNames.forEach((rawSheetName, index) => {
    const cleanSheetName = cleanStr(rawSheetName);
    const sheetSlug = cleanSheetName.replace(/\s+/g, '_').toUpperCase();
    const sheet = wb.Sheets[rawSheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const vocabs = [];
    // Skip header row
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row && row[1]) {
        vocabs.push({
          word: cleanStr(row[1]),
          ipa: cleanStr(row[2]),
          meaning: cleanStr(row[3])
        });
      }
    }

    console.log(`\nProcessing Sheet ${index + 1}/${wb.SheetNames.length}: "${cleanSheetName}" (${vocabs.length} vocabs)`);

    const part5Data = generatePart5(vocabs, cleanSheetName);
    const part6Data = generatePart6(vocabs, cleanSheetName);

    // Verification of question counts
    const p5Count = part5Data.questions.length;
    const p6Count = part6Data.passages.reduce((acc, p) => acc + p.questions.length, 0);
    const totalCount = p5Count + p6Count;

    console.log(`  - Part 5: ${p5Count} questions (101 - 130)`);
    console.log(`  - Part 6: ${part6Data.passages.length} passages, ${p6Count} questions (131 - 146)`);
    console.log(`  => TOTAL: ${totalCount} questions (Target: 46). Status: ${totalCount === 46 ? "OK! Exact 46 questions" : "WARNING"}`);

    const completeTest = {
      metadata: {
        excelFileName: path.basename(filePath),
        folderName: folderName,
        sheetName: cleanSheetName,
        sheetSlug: sheetSlug,
        totalVocabs: vocabs.length,
        totalQuestions: 46,
        createdAt: new Date().toISOString()
      },
      part5: part5Data,
      part6: part6Data
    };

    const targetFile = path.join(outDir, `${sheetSlug}.json`);
    fs.writeFileSync(targetFile, JSON.stringify(completeTest, null, 2), 'utf8');
    console.log(`  Saved seed to: ${targetFile}`);
  });
}

// Run for both Excel files
buildBankForFile(path.join(__dirname, '..', '..', 'data', 'TỪ VỰNG VER 13_FIXED.xlsx'), 'TU_VUNG_VER_13_FIXED');
buildBankForFile(path.join(__dirname, '..', '..', 'data', 'TỪ MỚI V12_FIXED.xlsx'), 'TU_MOI_V12_FIXED');

console.log("\nAll Reading Question Banks (Part 5 & Part 6 only - 46 questions) generated successfully!");
