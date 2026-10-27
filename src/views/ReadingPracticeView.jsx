import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios, { API_BASE } from "../utils/api.js";
import {
  BookOpen, Sparkles, Clock, CheckCircle2, XCircle, RotateCcw,
  ArrowLeft, ChevronRight, ChevronLeft, Award, FileText, Check,
  Eye, EyeOff, Zap, Play, BookMarked, Loader2, AlertCircle,
  HelpCircle, ChevronDown, ListFilter, RefreshCw, BarChart2
} from "lucide-react";

export default function ReadingPracticeView({ topics = [], user, addXP }) {
  // Navigation & view states
  // 'lobby' | 'practice' | 'result'
  const [viewState, setViewState] = useState("lobby");

  // Selection states
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.topic_id || null);
  const [selectedPart, setSelectedPart] = useState("part5"); // 'part5' | 'part6' | 'part7'
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedExercises, setSavedExercises] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Exercise & Practice states
  const [currentExercise, setCurrentExercise] = useState(null);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: "A" | "B" | "C" | "D" }
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0); // for Part 5 stepper
  const [showPassageTranslation, setShowPassageTranslation] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  // Update selectedTopicId if topics change and current is null
  useEffect(() => {
    if (!selectedTopicId && topics.length > 0) {
      setSelectedTopicId(topics[0].topic_id);
    }
  }, [topics, selectedTopicId]);

  // Fetch saved exercises for current topic
  const fetchSavedExercises = useCallback(async (topicId) => {
    if (!topicId) return;
    setIsLoadingSaved(true);
    try {
      const res = await axios.get(`${API_BASE}/reading/topic/${topicId}`);
      if (res.data.success) {
        setSavedExercises(res.data.data || []);
      }
    } catch (err) {
      console.error("Lỗi tải bài đã lưu:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTopicId) {
      fetchSavedExercises(selectedTopicId);
    }
  }, [selectedTopicId, fetchSavedExercises]);

  // Timer effect during practice
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Generate or Load Exercise
  const handleStartPractice = async (forceNew = false, specificExerciseId = null) => {
    setErrorMsg("");
    setIsGenerating(true);

    try {
      if (specificExerciseId) {
        const res = await axios.get(`${API_BASE}/reading/${specificExerciseId}`);
        if (res.data.success && res.data.data?.exercise) {
          initPracticeSession(res.data.data.exercise);
          return;
        }
      }

      const res = await axios.post(`${API_BASE}/reading/generate`, {
        topicId: selectedTopicId,
        part: selectedPart,
        count: selectedPart === "part5" ? 10 : 4,
        forceNew: forceNew
      });

      if (res.data.success && res.data.data) {
        initPracticeSession(res.data.data);
        fetchSavedExercises(selectedTopicId);
      } else {
        setErrorMsg(res.data.message || "Không thể tải bài luyện tập.");
      }
    } catch (err) {
      console.error("Lỗi tạo bài đọc:", err);
      setErrorMsg(err.response?.data?.message || "Lỗi kết nối máy chủ tạo bài đọc.");
    } finally {
      setIsGenerating(false);
    }
  };

  const initPracticeSession = (exercise) => {
    setCurrentExercise(exercise);
    setUserAnswers({});
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setActiveQuestionIndex(0);
    setShowPassageTranslation(false);
    setSubmittedResult(null);
    setViewState("practice");
  };

  // Handle Answer Selection
  const handleSelectAnswer = (qId, optionKey) => {
    if (viewState !== "practice") return;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionKey
    }));
  };

  // Keyboard shortcut for Part 5 (1,2,3,4 or A,B,C,D)
  useEffect(() => {
    if (viewState !== "practice") return;
    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      const numMap = { "1": "A", "2": "B", "3": "C", "4": "D" };
      const selectedKey = numMap[key] || (["A", "B", "C", "D"].includes(key) ? key : null);

      if (selectedKey && currentExercise?.questions) {
        if (selectedPart === "part5") {
          const currentQ = currentExercise.questions[activeQuestionIndex];
          if (currentQ) handleSelectAnswer(currentQ.id, selectedKey);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewState, selectedPart, activeQuestionIndex, currentExercise]);

  // Submit and Grade
  const handleSubmitPractice = () => {
    if (!currentExercise || !currentExercise.questions) return;
    const questions = currentExercise.questions;
    const unansweredCount = questions.filter(q => !userAnswers[q.id]).length;

    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `Bạn vẫn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài?`
      );
      if (!confirmSubmit) return;
    }

    setIsTimerRunning(false);

    let correctCount = 0;
    const reviewDetails = questions.map(q => {
      const userAns = userAnswers[q.id] || null;
      const isCorrect = userAns === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        ...q,
        userAnswer: userAns,
        isCorrect
      };
    });

    const totalQuestions = questions.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const xpGained = correctCount * 10 + 20; // 10 XP per correct question + 20 bonus completion

    if (addXP) {
      addXP(xpGained);
    }

    setSubmittedResult({
      score: correctCount,
      total: totalQuestions,
      percentage: scorePercentage,
      timeSpent: timerSeconds,
      xpGained,
      details: reviewDetails
    });

    setViewState("result");
  };

  const selectedTopic = useMemo(() => {
    return topics.find(t => t.topic_id === Number(selectedTopicId)) || topics[0];
  }, [topics, selectedTopicId]);

  // ==========================================
  // RENDER: 1. LOBBY VIEW
  // ==========================================
  if (viewState === "lobby") {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
                <Sparkles size={14} className="text-yellow-300" />
                AI TOEIC Reading Master
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Luyện Đọc TOEIC Theo Sheet Từ Vựng
              </h1>
              <p className="text-blue-100 text-sm md:text-base max-w-2xl leading-relaxed">
                Tạo câu hỏi ngữ cảnh doanh nghiệp chuẩn Part 5 (câu đơn), Part 6 (điền đoạn văn) và Part 7 (đọc hiểu) bám sát 100% từ mới trong từng sheet.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 min-w-[120px]">
                <div className="text-2xl font-black">{topics.length}</div>
                <div className="text-xs text-blue-100 font-medium">Sheet từ vựng</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 min-w-[120px]">
                <div className="text-2xl font-black">3 Parts</div>
                <div className="text-xs text-blue-100 font-medium">Part 5 • 6 • 7</div>
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 flex items-center gap-3">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1: Select Sheet (Topic) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                1
              </div>
              <span>Chọn Sheet từ vựng</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bài đọc sẽ bám sát 100% từ mới có trong sheet bạn chọn:
            </p>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {topics.map(t => {
                const isSelected = Number(selectedTopicId) === t.topic_id;
                return (
                  <button
                    key={t.topic_id}
                    onClick={() => setSelectedTopicId(t.topic_id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group ${
                      isSelected
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="truncate">
                      <div className="font-semibold text-sm truncate">{t.topic_name}</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">{t.vocab_count || 0} từ vựng</div>
                    </div>
                    {isSelected && <Check size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Part */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                2
              </div>
              <span>Chọn dạng bài TOEIC</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chọn một trong 3 phần thi Reading của bài thi TOEIC:
            </p>
            <div className="space-y-3">
              {/* Part 5 */}
              <button
                onClick={() => setSelectedPart("part5")}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedPart === "part5"
                    ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-500"
                    : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Part 5: Incomplete Sentences</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    10 Câu đơn
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Điền từ/ngữ pháp vào câu đơn lẻ trong môi trường công sở.
                </p>
              </button>

              {/* Part 6 */}
              <button
                onClick={() => setSelectedPart("part6")}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedPart === "part6"
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-500"
                    : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Part 6: Text Completion</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    4 Chỗ trống
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Điền vào 4 vị trí khuyết trong một đoạn văn (Email, Thông báo).
                </p>
              </button>

              {/* Part 7 */}
              <button
                onClick={() => setSelectedPart("part7")}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedPart === "part7"
                    ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm ring-1 ring-purple-500"
                    : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Part 7: Reading Comprehension</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    4 Câu hỏi
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Đọc hiểu văn bản thương mại, suy luận và trích xuất thông tin.
                </p>
              </button>
            </div>
          </div>

          {/* Step 3: Launch & Past Exercises */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                  3
                </div>
                <span>Bắt đầu luyện tập</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sheet đã chọn:</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedTopic?.topic_name || "Chưa chọn"}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Phần thi: <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">{selectedPart}</span></div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleStartPractice(false)}
                  disabled={isGenerating || !selectedTopicId}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Đang tạo bài đọc AI...</span>
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      <span>Làm bài ngay</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleStartPractice(true)}
                  disabled={isGenerating || !selectedTopicId}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={14} className="text-yellow-500" />
                  <span>Tạo bài mới hoàn toàn (Force AI)</span>
                </button>
              </div>
            </div>

            {/* Past saved exercises */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <span>Bài đã tạo gần đây ({savedExercises.length}):</span>
                {isLoadingSaved && <Loader2 size={12} className="animate-spin" />}
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {savedExercises.length === 0 ? (
                  <div className="text-[11px] text-slate-400 text-center py-2 italic">
                    Chưa có bài nào được lưu cho sheet này.
                  </div>
                ) : (
                  savedExercises.slice(0, 4).map(ex => (
                    <button
                      key={ex.exercise_id}
                      onClick={() => handleStartPractice(false, ex.exercise_id)}
                      className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/40 dark:hover:bg-blue-950/30 text-xs flex items-center justify-between transition-colors border border-slate-200/40 dark:border-slate-800 group"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-blue-600 dark:text-blue-400 uppercase mr-1.5">[{ex.part}]</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{ex.title}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 2. PRACTICE VIEW
  // ==========================================
  if (viewState === "practice" && currentExercise) {
    const questions = currentExercise.questions || [];
    const answeredCount = Object.keys(userAnswers).length;
    const progressPercent = Math.round((answeredCount / questions.length) * 100);

    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 md:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-white/95 dark:bg-slate-900/95">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm("Bạn có chắc muốn thoát bài làm và quay về danh sách?")) {
                  setIsTimerRunning(false);
                  setViewState("lobby");
                }
              }}
              className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Quay lại"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
                  {currentExercise.part || selectedPart}
                </span>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base line-clamp-1">
                  {currentExercise.title || "Luyện đọc TOEIC"}
                </h2>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Sheet: <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedTopic?.topic_name}</span>
              </div>
            </div>
          </div>

          {/* Timer & Submit */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-sm">
              <Clock size={16} className="text-blue-600 dark:text-blue-400" />
              <span>{formatTime(timerSeconds)}</span>
            </div>

            <button
              onClick={handleSubmitPractice}
              className="px-5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 size={16} />
              <span>Nộp bài</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* PART 5: STEPPER / SINGLE QUESTION INTERFACE */}
        {selectedPart === "part5" && (
          <div className="space-y-6">
            {/* Question Quick Palette */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <span className="text-xs font-semibold text-slate-400 mr-1">Câu hỏi:</span>
              {questions.map((q, idx) => {
                const isCurrent = idx === activeQuestionIndex;
                const isAnswered = !!userAnswers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`w-8 h-8 rounded-xl font-bold text-xs transition-all ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                        : isAnswered
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Active Question Box */}
            {questions[activeQuestionIndex] && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm">
                      {activeQuestionIndex + 1}
                    </span>
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                      Question {activeQuestionIndex + 1} of {questions.length}
                    </span>
                  </div>
                  {questions[activeQuestionIndex].targetWord && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                      Từ vựng mục tiêu: <strong className="text-blue-600 dark:text-blue-400">{questions[activeQuestionIndex].targetWord}</strong>
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <div className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                  {questions[activeQuestionIndex].question.split("_______").map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="inline-block px-3 py-1 mx-1.5 rounded-lg border-2 border-dashed border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold min-w-[70px] text-center">
                          {userAnswers[questions[activeQuestionIndex].id] || "_______"}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  {questions[activeQuestionIndex].options.map(opt => {
                    const isSelected = userAnswers[questions[activeQuestionIndex].id] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleSelectAnswer(questions[activeQuestionIndex].id, opt.key)}
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
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                    <span>Câu trước</span>
                  </button>

                  <span className="text-xs text-slate-400">
                    Phím tắt: bấm <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">1</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">2</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">3</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">4</kbd> để chọn A/B/C/D
                  </span>

                  <button
                    onClick={() => setActiveQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={activeQuestionIndex === questions.length - 1}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Câu tiếp</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PART 6 & PART 7: SPLIT-SCREEN PASSAGE + QUESTIONS */}
        {(selectedPart === "part6" || selectedPart === "part7") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: PASSAGE (5 or 6 cols) */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 lg:sticky lg:top-28">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {currentExercise.passageType || "Reading Passage"}
                  </span>
                </div>
                {currentExercise.passageTranslation && (
                  <button
                    onClick={() => setShowPassageTranslation(prev => !prev)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {showPassageTranslation ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPassageTranslation ? "Ẩn dịch" : "Xem dịch tiếng Việt"}</span>
                  </button>
                )}
              </div>

              {/* Passage text */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl p-5 text-sm md:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-serif">
                {currentExercise.passage}
              </div>

              {/* Optional Vietnamese Translation Toggle */}
              {showPassageTranslation && currentExercise.passageTranslation && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs md:text-sm text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line">
                  <div className="font-bold mb-1 text-amber-800 dark:text-amber-300">Bản dịch tiếng Việt tham khảo:</div>
                  {currentExercise.passageTranslation}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: QUESTIONS LIST (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                      {q.blankId ? `Chỗ trống ${q.blankId}` : `Câu hỏi ${idx + 1}`}
                    </span>
                    {userAnswers[q.id] && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check size={14} /> Đã chọn {userAnswers[q.id]}
                      </span>
                    )}
                  </div>

                  {q.question && (
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm md:text-base">
                      {q.question}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map(opt => {
                      const isSelected = userAnswers[q.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelectAnswer(q.id, opt.key)}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 group ${
                            isSelected
                              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600"
                              : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                            }`}
                          >
                            {opt.key}
                          </div>
                          <span className="text-xs md:text-sm font-medium flex-1 truncate">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: 3. RESULT & REVIEW VIEW
  // ==========================================
  if (viewState === "result" && submittedResult && currentExercise) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-slide-up">
        {/* Score Card Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 text-center relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-white/20 backdrop-blur-md mb-1">
              <Award size={36} className="text-yellow-300" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold">Kết Quả Luyện Đọc</h2>
            <p className="text-blue-100 text-sm">
              Bộ từ: <span className="font-bold underline">{selectedTopic?.topic_name}</span> • Phần: <span className="font-bold uppercase">{currentExercise.part}</span>
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-4">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="text-2xl md:text-3xl font-black">
                  {submittedResult.score}/{submittedResult.total}
                </div>
                <div className="text-xs text-blue-100">Số câu đúng</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="text-2xl md:text-3xl font-black text-yellow-300">
                  {submittedResult.percentage}%
                </div>
                <div className="text-xs text-blue-100">Độ chính xác</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="text-2xl md:text-3xl font-black text-emerald-300">
                  +{submittedResult.xpGained}
                </div>
                <div className="text-xs text-blue-100">XP thưởng</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <button
            onClick={() => setViewState("lobby")}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            <span>Về danh sách bài</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => initPracticeSession(currentExercise)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={16} />
              <span>Làm lại bài này</span>
            </button>

            <button
              onClick={() => handleStartPractice(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles size={16} />
              <span>Tạo đề AI mới</span>
            </button>
          </div>
        </div>

        {/* Passage review if Part 6 / 7 */}
        {(currentExercise.part === "part6" || currentExercise.part === "part7") && currentExercise.passage && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Văn bản bài đọc ({currentExercise.passageType || "Reading Passage"})
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-sm font-serif leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
              {currentExercise.passage}
            </div>
            {currentExercise.passageTranslation && (
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs md:text-sm text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line">
                <div className="font-bold mb-1 text-amber-800 dark:text-amber-300">Bản dịch toàn bài:</div>
                {currentExercise.passageTranslation}
              </div>
            )}
          </div>
        )}

        {/* Detailed Question Review List */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
            <ListFilter size={18} className="text-blue-600" />
            Chi tiết từng câu hỏi & Lời giải
          </h3>

          {submittedResult.details.map((q, idx) => {
            const isCorrect = q.isCorrect;
            return (
              <div
                key={q.id}
                className={`bg-white dark:bg-slate-900 border-2 rounded-3xl p-5 md:p-6 shadow-sm space-y-4 transition-all ${
                  isCorrect
                    ? "border-emerald-500/50 dark:border-emerald-500/30 bg-emerald-50/10"
                    : "border-red-500/50 dark:border-red-500/30 bg-red-50/10"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {q.blankId ? `Chỗ trống ${q.blankId}` : `Câu hỏi ${idx + 1}`}
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
          })}
        </div>
      </div>
    );
  }

  return null;
}
