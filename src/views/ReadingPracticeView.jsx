import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios, { API_BASE } from "../utils/api.js";
import {
  BookOpen, Sparkles, Clock, CheckCircle2, XCircle, RotateCcw,
  ArrowLeft, ChevronRight, ChevronLeft, Award, FileText, Check,
  Eye, EyeOff, Zap, Play, BookMarked, Loader2, AlertCircle,
  HelpCircle, ChevronDown, ListFilter, RefreshCw, BarChart2,
  FileSpreadsheet, Flag, Layers, Search
} from "lucide-react";

export default function ReadingPracticeView({ topics = [], user, addXP }) {
  // Navigation: 'lobby' | 'practice' | 'result'
  const [viewState, setViewState] = useState("lobby");

  // Excel sessions grouping
  const sortedSessions = useMemo(() => {
    const grouped = {};
    topics.forEach(t => {
      const groupName = t.session_name || "TỪ VỰNG VER 13_FIXED.xlsx";
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push(t);
    });

    return Object.entries(grouped).map(([sessionName, sheetList]) => {
      sheetList.sort((a, b) => a.topic_name.localeCompare(b.topic_name, undefined, { numeric: true }));
      return {
        sessionName,
        sheets: sheetList,
        totalVocab: sheetList.reduce((s, sh) => s + Number(sh.vocab_count || 0), 0)
      };
    }).sort((a, b) => a.sessionName.localeCompare(b.sessionName, undefined, { numeric: true }));
  }, [topics]);

  // Selected state
  const [selectedSessionName, setSelectedSessionName] = useState(() => sortedSessions[0]?.sessionName || "");
  const [selectedTopic, setSelectedTopic] = useState(() => sortedSessions[0]?.sheets[0] || null);
  const [selectedPart, setSelectedPart] = useState("part5"); // 'part5' (30) | 'part6' (16) | 'part7' (54) | 'full' (100)
  const [isLoadingTest, setIsLoadingTest] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Keep selectedTopic in sync when selectedSessionName changes
  useEffect(() => {
    if (!selectedSessionName && sortedSessions.length > 0) {
      setSelectedSessionName(sortedSessions[0].sessionName);
    }
  }, [sortedSessions, selectedSessionName]);

  const currentSessionSheets = useMemo(() => {
    const found = sortedSessions.find(s => s.sessionName === selectedSessionName);
    return found ? found.sheets : [];
  }, [sortedSessions, selectedSessionName]);

  useEffect(() => {
    if (currentSessionSheets.length > 0) {
      const stillValid = currentSessionSheets.some(s => s.topic_id === selectedTopic?.topic_id);
      if (!stillValid) {
        setSelectedTopic(currentSessionSheets[0]);
      }
    }
  }, [currentSessionSheets, selectedTopic]);

  // Practice & Question State
  const [testPackage, setTestPackage] = useState(null); // full data received from backend
  const [flattenedQuestions, setFlattenedQuestions] = useState([]); // all questions for easy indexing
  const [currentPassages, setCurrentPassages] = useState([]); // for Part 6, 7
  const [userAnswers, setUserAnswers] = useState({}); // { [questionNumber]: "A" | "B" | "C" | "D" }
  const [flaggedQuestions, setFlaggedQuestions] = useState({}); // { [questionNumber]: boolean }
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0); // 0 to N-1
  const [activePassageIndex, setActivePassageIndex] = useState(0); // for Part 6 & 7 passage pagination
  const [showPassageTranslation, setShowPassageTranslation] = useState(false);

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Result
  const [submittedResult, setSubmittedResult] = useState(null);
  const [reviewFilter, setReviewFilter] = useState("all"); // 'all' | 'wrong' | 'flagged'

  // Format time (MM:SS)
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Timer interval
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Load Test from Backend Seed Bank (0s instant load)
  const handleStartPractice = async () => {
    if (!selectedTopic) return;
    setErrorMsg("");
    setIsLoadingTest(true);

    try {
      const res = await axios.get(`${API_BASE}/reading/test`, {
        params: {
          sessionName: selectedSessionName,
          topicName: selectedTopic.topic_name,
          topicId: selectedTopic.topic_id,
          part: selectedPart
        }
      });

      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setTestPackage(data);

        // Flatten questions depending on part
        let allQ = [];
        let passages = [];

        if (selectedPart === "part5") {
          allQ = data.questions || [];
        } else if (selectedPart === "part6" || selectedPart === "part7") {
          passages = data.passages || [];
          passages.forEach((p, pIdx) => {
            (p.questions || []).forEach(q => {
              allQ.push({
                ...q,
                passageRefIndex: pIdx,
                passageTitle: p.title,
                passageType: p.passageType
              });
            });
          });
        } else if (selectedPart === "full") {
          // Part 5 (30 questions: 101 - 130)
          const p5Q = (data.part5?.questions || []).map(q => ({ ...q, sectionPart: "Part 5" }));
          // Part 6 (16 questions: 131 - 146)
          const p6Passages = data.part6?.passages || [];
          const p6Q = [];
          p6Passages.forEach((p, pIdx) => {
            (p.questions || []).forEach(q => {
              p6Q.push({
                ...q,
                sectionPart: "Part 6",
                passageRefIndex: pIdx,
                passageType: p.passageType,
                passageTitle: p.title
              });
            });
          });
          // Part 7 (54 questions: 147 - 200)
          const p7Passages = data.part7?.passages || [];
          const p7Q = [];
          p7Passages.forEach((p, pIdx) => {
            (p.questions || []).forEach(q => {
              p7Q.push({
                ...q,
                sectionPart: "Part 7",
                passageRefIndex: pIdx + p6Passages.length,
                passageType: p.passageType,
                passageTitle: p.title
              });
            });
          });

          allQ = [...p5Q, ...p6Q, ...p7Q];
          passages = [...p6Passages, ...p7Passages];
        }

        setFlattenedQuestions(allQ);
        setCurrentPassages(passages);
        setUserAnswers({});
        setFlaggedQuestions({});
        setActiveQuestionIndex(0);
        setActivePassageIndex(0);
        setTimerSeconds(0);
        setIsTimerRunning(true);
        setShowPassageTranslation(false);
        setSubmittedResult(null);
        setViewState("practice");
      } else {
        setErrorMsg(res.data.message || "Không thể tải đề đọc.");
      }
    } catch (err) {
      console.error("Lỗi lấy đề đọc:", err);
      setErrorMsg(err.response?.data?.message || "Lỗi nạp bộ câu hỏi mặc định.");
    } finally {
      setIsLoadingTest(false);
    }
  };

  // Select Answer
  const handleSelectAnswer = (qNumber, optKey) => {
    if (viewState !== "practice") return;
    setUserAnswers(prev => ({
      ...prev,
      [qNumber]: optKey
    }));
  };

  // Toggle Flag
  const toggleFlag = (qNumber) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [qNumber]: !prev[qNumber]
    }));
  };

  // Keyboard shortcut (1, 2, 3, 4 -> A, B, C, D)
  useEffect(() => {
    if (viewState !== "practice") return;
    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      const numMap = { "1": "A", "2": "B", "3": "C", "4": "D" };
      const selectedKey = numMap[key] || (["A", "B", "C", "D"].includes(key) ? key : null);

      if (selectedKey && flattenedQuestions[activeQuestionIndex]) {
        const curQ = flattenedQuestions[activeQuestionIndex];
        handleSelectAnswer(curQ.questionNumber, selectedKey);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewState, activeQuestionIndex, flattenedQuestions]);

  // When activeQuestionIndex changes in Part 6/7, sync passage index
  useEffect(() => {
    const curQ = flattenedQuestions[activeQuestionIndex];
    if (curQ && curQ.passageRefIndex !== undefined) {
      setActivePassageIndex(curQ.passageRefIndex);
    }
  }, [activeQuestionIndex, flattenedQuestions]);

  // Submit and Calculate TOEIC Score
  const handleSubmitPractice = () => {
    if (flattenedQuestions.length === 0) return;
    const unansweredCount = flattenedQuestions.filter(q => !userAnswers[q.questionNumber]).length;

    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `Bạn vẫn còn ${unansweredCount} câu chưa chọn đáp án. Bạn có chắc muốn nộp bài?`
      );
      if (!confirmed) return;
    }

    setIsTimerRunning(false);

    let correctCount = 0;
    const reviewDetails = flattenedQuestions.map(q => {
      const userAns = userAnswers[q.questionNumber] || null;
      const isCorrect = userAns === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        ...q,
        userAnswer: userAns,
        isCorrect,
        isFlagged: !!flaggedQuestions[q.questionNumber]
      };
    });

    const totalQuestions = flattenedQuestions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    // TOEIC Reading Scaled Score Estimation (out of 495)
    let estimatedToeicScore = Math.round((correctCount / totalQuestions) * 495);
    if (selectedPart === "full") {
      // Standard TOEIC conversion curve
      if (correctCount >= 96) estimatedToeicScore = 495;
      else if (correctCount >= 90) estimatedToeicScore = 470;
      else if (correctCount >= 80) estimatedToeicScore = 420;
      else if (correctCount >= 70) estimatedToeicScore = 370;
      else if (correctCount >= 60) estimatedToeicScore = 320;
      else if (correctCount >= 50) estimatedToeicScore = 270;
      else estimatedToeicScore = Math.max(50, correctCount * 5);
    }

    // Award XP: 10 XP per correct question + 50 bonus
    const xpGained = correctCount * 10 + 50;
    if (addXP) {
      addXP(xpGained);
    }

    setSubmittedResult({
      score: correctCount,
      total: totalQuestions,
      percentage,
      estimatedToeicScore,
      timeSpent: timerSeconds,
      xpGained,
      details: reviewDetails
    });

    setViewState("result");
  };

  // ==========================================
  // RENDER 1: LOBBY (CHỌN FILE EXCEL -> SHEET -> PART)
  // ==========================================
  if (viewState === "lobby") {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
                <BookOpen size={14} className="text-yellow-300" />
                Bộ Đề Mặc Định Chuẩn TOEIC Reading (100 Câu)
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Luyện Đọc TOEIC Theo Từng File Excel & Sheet
              </h1>
              <p className="text-blue-100 text-sm md:text-base leading-relaxed">
                Đề thi đã được thiết lập sẵn 100 câu chuẩn TOEIC cho từng sheet: Part 5 (30 câu), Part 6 (4 đoạn - 16 câu) và Part 7 (54 câu đọc hiểu). Nạp đề tức thì 0 giây, không chờ AI.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 min-w-[110px]">
                <div className="text-2xl font-black">{sortedSessions.length}</div>
                <div className="text-xs text-blue-100 font-medium">File Excel</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 min-w-[110px]">
                <div className="text-2xl font-black">100 Câu</div>
                <div className="text-xs text-blue-100 font-medium">Chuẩn TOEIC</div>
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 flex items-center gap-3 text-sm font-semibold">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3 Steps Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1: Select Excel File */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                1
              </div>
              <span>Chọn File Excel</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Phân tách rõ ràng từng file Excel bạn đã tải lên hệ thống:
            </p>
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {sortedSessions.map(sess => {
                const isSelected = selectedSessionName === sess.sessionName;
                return (
                  <button
                    key={sess.sessionName}
                    onClick={() => {
                      setSelectedSessionName(sess.sessionName);
                      setSelectedTopic(sess.sheets[0] || null);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 text-blue-800 dark:text-blue-200 shadow-sm ring-1 ring-blue-500"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${isSelected ? "bg-blue-600 text-white" : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"}`}>
                        <FileSpreadsheet size={18} />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs md:text-sm truncate">{sess.sessionName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {sess.sheets.length} Sheets • {sess.totalVocab} từ
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Sheet inside that File */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                2
              </div>
              <span>Chọn Bảng Sheet</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Các sheet thuộc <strong className="text-slate-700 dark:text-slate-200">{selectedSessionName || "File đã chọn"}</strong>:
            </p>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {currentSessionSheets.length === 0 ? (
                <div className="text-xs text-slate-400 italic py-6 text-center">
                  Không có sheet nào trong file này.
                </div>
              ) : (
                currentSessionSheets.map(sh => {
                  const isSelected = selectedTopic?.topic_id === sh.topic_id;
                  return (
                    <button
                      key={sh.topic_id}
                      onClick={() => setSelectedTopic(sh)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group ${
                        isSelected
                          ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-600 text-indigo-800 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500"
                          : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-bold text-sm truncate">{sh.topic_name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{sh.vocab_count || 0} từ vựng</div>
                      </div>
                      {isSelected && <Check size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 3: Select Part and Start */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                  3
                </div>
                <span>Chọn Phần Thi & Bắt Đầu</span>
              </div>

              {/* Part Tabs */}
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedPart("part5")}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedPart === "part5"
                      ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 text-blue-800 dark:text-blue-200 ring-1 ring-blue-500 font-bold"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Part 5: Incomplete Sentences</div>
                    <div className="text-[11px] text-slate-400">30 câu đơn (Câu 101 - 130)</div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    30 CÂU
                  </span>
                </button>

                <button
                  onClick={() => setSelectedPart("part6")}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedPart === "part6"
                      ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-600 text-indigo-800 dark:text-indigo-200 ring-1 ring-indigo-500 font-bold"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Part 6: Text Completion</div>
                    <div className="text-[11px] text-slate-400">4 đoạn văn • 16 câu (Câu 131 - 146)</div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    16 CÂU
                  </span>
                </button>

                <button
                  onClick={() => setSelectedPart("part7")}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedPart === "part7"
                      ? "bg-purple-50/90 dark:bg-purple-950/40 border-purple-600 text-purple-800 dark:text-purple-200 ring-1 ring-purple-500 font-bold"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Part 7: Reading Comprehension</div>
                    <div className="text-[11px] text-slate-400">14 bài đọc • 54 câu (Câu 147 - 200)</div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                    54 CÂU
                  </span>
                </button>

                <button
                  onClick={() => setSelectedPart("full")}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedPart === "full"
                      ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500 font-bold"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">Full Test: Đề thi thử hoàn chỉnh</div>
                    <div className="text-[11px] text-slate-400">Trọn vẹn 100 câu (Part 5 + 6 + 7)</div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                    100 CÂU
                  </span>
                </button>
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleStartPractice}
                disabled={isLoadingTest || !selectedTopic}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoadingTest ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Đang nạp bộ đề...</span>
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    <span>Bắt đầu làm bài ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: PRACTICE VIEW (PART 5, 6, 7 & FULL TEST)
  // ==========================================
  if (viewState === "practice" && flattenedQuestions.length > 0) {
    const curQ = flattenedQuestions[activeQuestionIndex];
    const answeredCount = Object.keys(userAnswers).length;
    const totalQCount = flattenedQuestions.length;
    const progressPercent = Math.round((answeredCount / totalQCount) * 100);

    const isCurrentFlagged = !!flaggedQuestions[curQ.questionNumber];
    const isPassageBased = selectedPart === "part6" || selectedPart === "part7" || (selectedPart === "full" && curQ.sectionPart !== "Part 5");
    const activePassage = currentPassages[activePassageIndex] || null;

    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5 animate-fade-in">
        {/* Top Sticky Header */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky top-4 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm("Bạn có chắc muốn thoát và quay lại màn hình chọn đề?")) {
                  setIsTimerRunning(false);
                  setViewState("lobby");
                }
              }}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Thoát bài làm"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
                  {curQ.sectionPart || selectedPart}
                </span>
                <span className="font-black text-slate-800 dark:text-slate-100 text-sm md:text-base">
                  {selectedTopic?.topic_name}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">• {selectedSessionName}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Đã hoàn thành: <strong className="text-blue-600 dark:text-blue-400">{answeredCount}/{totalQCount}</strong> câu ({progressPercent}%)
              </div>
            </div>
          </div>

          {/* Timer, Flag, and Submit */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => toggleFlag(curQ.questionNumber)}
              className={`p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
                isCurrentFlagged
                  ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}
              title="Gắn cờ để xem lại sau"
            >
              <Flag size={15} fill={isCurrentFlagged ? "currentColor" : "none"} />
              <span className="hidden sm:inline">{isCurrentFlagged ? "Đã gắn cờ" : "Gắn cờ"}</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-sm">
              <Clock size={16} className="text-blue-600 dark:text-blue-400" />
              <span>{formatTime(timerSeconds)}</span>
            </div>

            <button
              onClick={handleSubmitPractice}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs md:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 size={16} />
              <span>Nộp bài</span>
            </button>
          </div>
        </div>

        {/* Question Palette Matrix (Collapsible or scrollable) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3.5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span>Danh sách câu hỏi ({totalQCount} câu):</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Đang làm</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Đã chọn</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Gắn cờ 🚩</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 inline-block" /> Chưa làm</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {flattenedQuestions.map((q, idx) => {
              const isCurrent = idx === activeQuestionIndex;
              const isAnswered = !!userAnswers[q.questionNumber];
              const isFlagged = !!flaggedQuestions[q.questionNumber];

              let colorClass = "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200";
              if (isCurrent) {
                colorClass = "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105 z-10 font-black";
              } else if (isFlagged) {
                colorClass = "bg-amber-100 text-amber-800 border border-amber-400 dark:bg-amber-950/70 dark:text-amber-200 font-bold";
              } else if (isAnswered) {
                colorClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800";
              }

              return (
                <button
                  key={q.questionNumber}
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`w-9 h-7 rounded-lg text-xs font-semibold transition-all ${colorClass}`}
                  title={`Câu ${q.questionNumber}`}
                >
                  {q.questionNumber}
                </button>
              );
            })}
          </div>
        </div>

        {/* QUESTION DISPLAY AREA */}
        {isPassageBased ? (
          /* ================= SPLIT SCREEN FOR PART 6 & PART 7 ================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Reading Passage (6 cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {activePassage?.passageType || "Đoạn văn bài đọc"}
                  </span>
                </div>
                {activePassage?.passageTranslation && (
                  <button
                    onClick={() => setShowPassageTranslation(prev => !prev)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {showPassageTranslation ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPassageTranslation ? "Ẩn dịch" : "Xem dịch tiếng Việt"}</span>
                  </button>
                )}
              </div>

              {activePassage?.title && (
                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  {activePassage.title}
                </div>
              )}

              {/* Passage Text */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 text-sm md:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-serif max-h-[500px] overflow-y-auto">
                {activePassage?.passage}
              </div>

              {/* Optional Vietnamese Translation */}
              {showPassageTranslation && activePassage?.passageTranslation && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs md:text-sm text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                  <div className="font-bold mb-1 text-amber-800 dark:text-amber-300">Bản dịch tiếng Việt tham khảo:</div>
                  {activePassage.passageTranslation}
                </div>
              )}
            </div>

            {/* Right: Question Card (6 cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                    {curQ.questionNumber}
                  </span>
                  <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    {curQ.blankId ? `Chỗ trống ${curQ.blankId}` : `Câu hỏi ${curQ.questionNumber}`}
                  </span>
                </div>
                {userAnswers[curQ.questionNumber] && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Check size={14} /> Đã chọn [{userAnswers[curQ.questionNumber]}]
                  </span>
                )}
              </div>

              {/* Question Text */}
              {curQ.question && (
                <div className="text-base md:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                  {curQ.question}
                </div>
              )}

              {/* Options */}
              <div className="space-y-3 pt-1">
                {curQ.options.map(opt => {
                  const isSelected = userAnswers[curQ.questionNumber] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectAnswer(curQ.questionNumber, opt.key)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5 group ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-300 shadow-md shadow-blue-500/10 scale-[1.01]"
                          : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-600"
                        }`}
                      >
                        {opt.key}
                      </div>
                      <span className="font-semibold text-sm md:text-base flex-1">{opt.text}</span>
                      {isSelected && <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Prev / Next */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5">
                <button
                  onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQuestionIndex === 0}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  <span>Câu trước</span>
                </button>

                <span className="text-[11px] text-slate-400">
                  Phím <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">1</kbd> - <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">4</kbd> để chọn A - D
                </span>

                <button
                  onClick={() => setActiveQuestionIndex(prev => Math.min(flattenedQuestions.length - 1, prev + 1))}
                  disabled={activeQuestionIndex === flattenedQuestions.length - 1}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <span>Câu tiếp</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= SINGLE QUESTION CARD (PART 5) ================= */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                  {curQ.questionNumber}
                </span>
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Question {curQ.questionNumber} of {totalQCount}
                </span>
              </div>
              
            </div>

            {/* Sentence with blank */}
            <div className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
              {curQ.question.split("_______").map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="inline-block px-3 py-1 mx-1.5 rounded-lg border-2 border-dashed border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold min-w-[70px] text-center">
                      {userAnswers[curQ.questionNumber] || "_______"}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* 4 Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              {curQ.options.map(opt => {
                const isSelected = userAnswers[curQ.questionNumber] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectAnswer(curQ.questionNumber, opt.key)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5 group ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-300 shadow-md shadow-blue-500/10 scale-[1.01]"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-600"
                      }`}
                    >
                      {opt.key}
                    </div>
                    <span className="font-semibold text-base flex-1">{opt.text}</span>
                    {isSelected && <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons Prev / Next */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5">
              <button
                onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={activeQuestionIndex === 0}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                <span>Câu trước</span>
              </button>

              <span className="text-xs text-slate-400">
                Phím tắt: bấm <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">1</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">2</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">3</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">4</kbd> để chọn A/B/C/D
              </span>

              <button
                onClick={() => setActiveQuestionIndex(prev => Math.min(flattenedQuestions.length - 1, prev + 1))}
                disabled={activeQuestionIndex === flattenedQuestions.length - 1}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white transition-colors flex items-center gap-1.5 disabled:opacity-40"
              >
                <span>Câu tiếp</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER 3: RESULT & DETAILED REVIEW
  // ==========================================
  if (viewState === "result" && submittedResult) {
    const filteredDetails = submittedResult.details.filter(q => {
      if (reviewFilter === "wrong") return !q.isCorrect;
      if (reviewFilter === "flagged") return q.isFlagged;
      return true;
    });

    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 animate-slide-up">
        {/* Banner Score Card */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 text-center relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-white/20 backdrop-blur-md mb-1">
              <Award size={36} className="text-yellow-300" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black">Kết Quả Bài Luyện Đọc</h2>
            <p className="text-blue-100 text-sm">
              Sheet: <span className="font-bold underline">{selectedTopic?.topic_name}</span> ({selectedSessionName}) • Phần: <span className="font-bold uppercase">{selectedPart}</span>
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto pt-4">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="text-2xl md:text-3xl font-black">{submittedResult.score}/{submittedResult.total}</div>
                <div className="text-xs text-blue-100">Số câu đúng</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="text-2xl md:text-3xl font-black text-yellow-300">{submittedResult.percentage}%</div>
                <div className="text-xs text-blue-100">Độ chính xác</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="text-2xl md:text-3xl font-black text-emerald-300">{submittedResult.estimatedToeicScore}/495</div>
                <div className="text-xs text-blue-100">Điểm TOEIC ước tính</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="text-2xl md:text-3xl font-black text-cyan-300">+{submittedResult.xpGained}</div>
                <div className="text-xs text-blue-100">XP thưởng</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <button
            onClick={() => setViewState("lobby")}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            <span>Chọn bài khác</span>
          </button>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setReviewFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reviewFilter === "all" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm font-bold" : "text-slate-500"}`}
            >
              Tất cả ({submittedResult.details.length})
            </button>
            <button
              onClick={() => setReviewFilter("wrong")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reviewFilter === "wrong" ? "bg-white dark:bg-slate-700 text-red-600 dark:text-red-300 shadow-sm font-bold" : "text-slate-500"}`}
            >
              Chỉ câu sai ({submittedResult.details.filter(q => !q.isCorrect).length})
            </button>
            <button
              onClick={() => setReviewFilter("flagged")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${reviewFilter === "flagged" ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-sm font-bold" : "text-slate-500"}`}
            >
              Gắn cờ ({submittedResult.details.filter(q => q.isFlagged).length})
            </button>
          </div>

          <button
            onClick={handleStartPractice}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <RotateCcw size={16} />
            <span>Làm lại bài này</span>
          </button>
        </div>

        {/* Question Review List */}
        <div className="space-y-4">
          {filteredDetails.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Không có câu hỏi nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredDetails.map((q) => {
              const isCorrect = q.isCorrect;
              return (
                <div
                  key={q.questionNumber}
                  className={`bg-white dark:bg-slate-900 border-2 rounded-3xl p-5 md:p-6 shadow-sm space-y-4 transition-all ${
                    isCorrect
                      ? "border-emerald-500/50 dark:border-emerald-500/30 bg-emerald-50/10"
                      : "border-red-500/50 dark:border-red-500/30 bg-red-50/10"
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          isCorrect
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                        }`}
                      >
                        {q.questionNumber}
                      </div>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {q.blankId ? `Chỗ trống ${q.blankId}` : `Câu hỏi ${q.questionNumber}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          <CheckCircle2 size={14} /> Chính xác
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold">
                          <XCircle size={14} /> Chưa đúng
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Content */}
                  {q.question && (
                    <div className="font-medium text-slate-800 dark:text-slate-100 text-base">
                      {q.question}
                    </div>
                  )}

                  {/* Options Review */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {q.options.map(opt => {
                      const isKeyCorrect = opt.key === q.correctAnswer;
                      const isKeyUser = opt.key === q.userAnswer;

                      let btnStyle = "bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300";
                      if (isKeyCorrect) {
                        btnStyle = "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold ring-1 ring-emerald-500";
                      } else if (isKeyUser && !isKeyCorrect) {
                        btnStyle = "bg-red-50 dark:bg-red-950/50 border-red-500 text-red-800 dark:text-red-200 font-bold line-through";
                      }

                      return (
                        <div
                          key={opt.key}
                          className={`p-3 rounded-2xl border text-sm flex items-center justify-between ${btnStyle}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-white/70 dark:bg-slate-700 flex items-center justify-center text-xs font-black">
                              {opt.key}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {isKeyCorrect && <Check size={16} className="text-emerald-600 dark:text-emerald-400" />}
                          {isKeyUser && !isKeyCorrect && <XCircle size={16} className="text-red-500" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Box */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 space-y-2 text-xs md:text-sm">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300">
                      <HelpCircle size={15} />
                      <span>Giải thích chi tiết:</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {q.explanation}
                    </p>
                    {q.evidence && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        <strong>Dẫn chứng từ bài:</strong> <em>"{q.evidence}"</em>
                      </div>
                    )}
                    {q.translation && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-blue-100 dark:border-blue-900/40">
                        <strong>Dịch nghĩa:</strong> {q.translation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return null;
}
