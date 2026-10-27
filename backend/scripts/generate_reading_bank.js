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

// Generate Part 7: Passages totaling 54 questions (147 - 200)
// 9 Single Passages (29 questions) + 5 Multi Passages (25 questions)
function generatePart7(vocabs, sheetName) {
  const safeVocabs = vocabs.filter(v => v.word && v.meaning);
  const shuffled = shuffle(safeVocabs);

  // Configuration of 14 Passage Sets totaling exactly 54 questions
  const passageConfigs = [
    // --- SINGLE PASSAGES (29 questions: 147 - 175) ---
    { id: 1, type: "Advertisement", title: "Commercial Space for Lease", qCount: 2, startQ: 147 },
    { id: 2, type: "Text Message Chain", title: "Delivery Logistics Coordination", qCount: 2, startQ: 149 },
    { id: 3, type: "Business Email", title: "Request for Quotation on Bulk Supplies", qCount: 3, startQ: 151 },
    { id: 4, type: "Online Review & Response", title: "Customer Experience at Grand Horizon Hotel", qCount: 3, startQ: 154 },
    { id: 5, type: "Job Posting & Schedule", title: "Senior Logistics Coordinator Vacancy", qCount: 3, startQ: 157 },
    { id: 6, type: "Executive Memo", title: "Implementation of Cloud Database System", qCount: 4, startQ: 160 },
    { id: 7, type: "Customer Support Communication", title: "Resolution of Software Subscription Inquiry", qCount: 4, startQ: 164 },
    { id: 8, type: "Product Warranty & Policy", title: "Enterprise Hardware Warranty Terms", qCount: 4, startQ: 168 },
    { id: 9, type: "Conference Program & Guidelines", title: "Annual Innovation Summit Agenda", qCount: 4, startQ: 172 },

    // --- MULTIPLE PASSAGES (25 questions: 176 - 200) ---
    { id: 10, type: "Double Passage (Brochure & Email)", title: "Equipment Catalog & Purchase Order", qCount: 5, startQ: 176 },
    { id: 11, type: "Double Passage (Notice & Inquiry)", title: "Office Relocation Timeline & Department Request", qCount: 5, startQ: 181 },
    { id: 12, type: "Triple Passage (Announcement, Schedule & Review)", title: "International Trade Expo Participation", qCount: 5, startQ: 186 },
    { id: 13, type: "Triple Passage (Job Ad, Candidate Email & Schedule)", title: "Regional Manager Recruitment Process", qCount: 5, startQ: 191 },
    { id: 14, type: "Triple Passage (Flight Itinerary, Hotel Voucher & Expense)", title: "Corporate Delegation Travel & Reimbursement", qCount: 5, startQ: 196 }
  ];

  const passages = passageConfigs.map((cfg, idx) => {
    const vocabChunk = shuffled.slice(idx * 5, (idx + 1) * 5);
    const keyWord1 = vocabChunk[0] || { word: "schedule", meaning: "lên lịch trình" };
    const keyWord2 = vocabChunk[1] || { word: "inquire", meaning: "hỏi thăm, yêu cầu thông tin" };
    const keyWord3 = vocabChunk[2] || { word: "submit", meaning: "nộp hồ sơ" };

    const passageText = `DOCUMENT: ${cfg.title.toUpperCase()}\nDocument Reference: REF-${202600 + cfg.id}\nCategory: ${cfg.type}\n\nTo Whom It May Concern,\n\nWe are pleased to announce our latest updates regarding ${cfg.title.toLowerCase()}. As part of our commitment to excellence, our team has arranged to ${keyWord1.word} all key activities with precision. Clients wishing to ${keyWord2.word} about additional details are advised to submit an online inquiry through our primary portal.\n\nPlease ensure that all documentation is verified prior to the designated deadline. Representatives will be on hand to assist throughout the transition period.\n\nFor urgent matters, please contact the administrative coordinator at contact@enterprise-solutions.com.`;

    const translationText = `TÀI LIỆU: ${cfg.title.toUpperCase()}\nMã tham chiếu: REF-${202600 + cfg.id}\nThể loại: ${cfg.type}\n\nKính gửi các bên liên quan,\n\nChúng tôi vui mừng thông báo những cập nhật mới nhất liên quan đến ${cfg.title.toLowerCase()}. Nhằm thực hiện cam kết về chất lượng, đội ngũ của chúng tôi đã sắp xếp để [${keyWord1.word} - ${keyWord1.meaning}] tất cả các hoạt động chính một cách chuẩn xác. Khách hàng muốn [${keyWord2.word} - ${keyWord2.meaning}] thêm chi tiết nên gửi biểu mẫu trực tuyến qua cổng thông tin chính của chúng tôi.\n\nVui lòng đảm bảo mọi tài liệu được kiểm tra trước thời hạn quy định. Các đại diện sẽ luôn có mặt để hỗ trợ trong suốt giai đoạn này.\n\nĐối với các vấn đề khẩn cấp, vui lòng liên hệ điều phối viên hành chính tại contact@enterprise-solutions.com.`;

    // Generate cfg.qCount questions
    const qList = [];
    for (let qI = 0; qI < cfg.qCount; qI++) {
      const qNum = cfg.startQ + qI;
      let qText = "";
      let opts = [];
      let correctKey = "A";
      let explanation = "";
      let evidence = "";
      let trText = "";

      if (qI === 0) {
        qText = `What is the main purpose of this ${cfg.type.toLowerCase().split(' ')[0]}?`;
        opts = [
          { key: "A", text: `To announce updates regarding ${cfg.title.toLowerCase()}` },
          { key: "B", text: "To dispute a recent billing invoice" },
          { key: "C", text: "To cancel an existing service contract" },
          { key: "D", text: "To advertise an upcoming clearance sale" }
        ];
        correctKey = "A";
        explanation = `Đoạn mở đầu nêu rõ mục đích thông báo về ${cfg.title.toLowerCase()}.`;
        evidence = `We are pleased to announce our latest updates regarding ${cfg.title.toLowerCase()}.`;
        trText = `Mục đích chính của văn bản này là gì?`;
      } else if (qI === 1) {
        qText = `According to the document, what are clients advised to do if they need more information?`;
        opts = [
          { key: "A", text: "Submit an online inquiry via the primary portal" },
          { key: "B", text: "Visit the corporate headquarters in person" },
          { key: "C", text: "Request an immediate refund from finance" },
          { key: "D", text: "Send a physical letter via registered mail" }
        ];
        correctKey = "A";
        explanation = `Văn bản ghi rõ: Khách hàng muốn tìm hiểu thêm thông tin cần gửi biểu mẫu trực tuyến ('submit an online inquiry through our primary portal').`;
        evidence = `Clients wishing to inquire about additional details are advised to submit an online inquiry through our primary portal.`;
        trText = `Theo tài liệu, khách hàng được khuyên nên làm gì nếu muốn biết thêm thông tin?`;
      } else if (qI === 2) {
        qText = `The word "${keyWord1.word}" in paragraph 1 is closest in meaning to:`;
        opts = [
          { key: "A", text: "organize / coordinate" },
          { key: "B", text: "discontinue" },
          { key: "C", text: "prohibit" },
          { key: "D", text: "misplace" }
        ];
        correctKey = "A";
        explanation = `Từ "${keyWord1.word}" (${keyWord1.meaning}) trong ngữ cảnh lên lịch/sắp xếp hoạt động đồng nghĩa với 'organize / coordinate'.`;
        evidence = `our team has arranged to ${keyWord1.word} all key activities with precision`;
        trText = `Từ "${keyWord1.word}" trong đoạn 1 gần nghĩa nhất với từ nào?`;
      } else if (qI === 3) {
        qText = `What is indicated about the representatives?`;
        opts = [
          { key: "A", text: "They will be available to provide assistance during the transition" },
          { key: "B", text: "They will be working exclusively from international branch offices" },
          { key: "C", text: "They have already completed all annual evaluations" },
          { key: "D", text: "They are scheduled to retire by next month" }
        ];
        correctKey = "A";
        explanation = `Bài đọc xác nhận: 'Representatives will be on hand to assist throughout the transition period'.`;
        evidence = `Representatives will be on hand to assist throughout the transition period.`;
        trText = `Điều gì được chỉ ra về các đại diện?`;
      } else {
        qText = `How should recipients handle urgent matters?`;
        opts = [
          { key: "A", text: "By contacting contact@enterprise-solutions.com" },
          { key: "B", text: "By filing a formal legal complaint" },
          { key: "C", text: "By submitting a paper application form" },
          { key: "D", text: "By contacting the local newspaper" }
        ];
        correctKey = "A";
        explanation = `Đoạn cuối nêu rõ địa chỉ email liên hệ cho các trường hợp khẩn cấp: contact@enterprise-solutions.com.`;
        evidence = `For urgent matters, please contact the administrative coordinator at contact@enterprise-solutions.com.`;
        trText = `Người nhận nên xử lý các vấn đề khẩn cấp bằng cách nào?`;
      }

      qList.push({
        id: qNum,
        questionNumber: qNum,
        question: qText,
        options: opts,
        correctAnswer: correctKey,
        explanation,
        evidence,
        translation: trText
      });
    }

    return {
      passageId: cfg.id,
      passageType: cfg.type,
      title: cfg.title,
      passage: passageText,
      passageTranslation: translationText,
      questions: qList
    };
  });

  return {
    title: `TOEIC Reading Part 7 - Reading Comprehension (${sheetName})`,
    totalPassages: passageConfigs.length,
    totalQuestions: 54,
    passages
  };
}

// Main generation execution
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
  console.log(`Generating Reading Question Bank for: ${path.basename(filePath)}`);
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
    const part7Data = generatePart7(vocabs, cleanSheetName);

    // Verification of question counts
    const p5Count = part5Data.questions.length;
    const p6Count = part6Data.passages.reduce((acc, p) => acc + p.questions.length, 0);
    const p7Count = part7Data.passages.reduce((acc, p) => acc + p.questions.length, 0);
    const totalCount = p5Count + p6Count + p7Count;

    console.log(`  - Part 5: ${p5Count} questions (101 - 130)`);
    console.log(`  - Part 6: ${part6Data.passages.length} passages, ${p6Count} questions (131 - 146)`);
    console.log(`  - Part 7: ${part7Data.passages.length} passages, ${p7Count} questions (147 - 200)`);
    console.log(`  => TOTAL: ${totalCount} questions (Target: 100). Status: ${totalCount === 100 ? "OK! Standard TOEIC" : "WARNING"}`);

    const completeTest = {
      metadata: {
        excelFileName: path.basename(filePath),
        folderName: folderName,
        sheetName: cleanSheetName,
        sheetSlug: sheetSlug,
        totalVocabs: vocabs.length,
        createdAt: new Date().toISOString()
      },
      part5: part5Data,
      part6: part6Data,
      part7: part7Data
    };

    const targetFile = path.join(outDir, `${sheetSlug}.json`);
    fs.writeFileSync(targetFile, JSON.stringify(completeTest, null, 2), 'utf8');
    console.log(`  Saved seed to: ${targetFile}`);
  });
}

// Run for both Excel files
buildBankForFile(path.join(__dirname, '..', '..', 'data', 'TỪ VỰNG VER 13_FIXED.xlsx'), 'TU_VUNG_VER_13_FIXED');
buildBankForFile(path.join(__dirname, '..', '..', 'data', 'TỪ MỚI V12_FIXED.xlsx'), 'TU_MOI_V12_FIXED');

console.log("\nAll Reading Question Banks generated successfully!");
