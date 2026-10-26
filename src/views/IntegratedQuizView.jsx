import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  BookOpen, Layers, GraduationCap, Upload, ChevronLeft, ChevronRight,
  RotateCcw, CheckCircle2, XCircle, Sparkles, Loader2, Volume2,
  Lightbulb, Trash2, FolderOpen, ArrowLeft, Database, Sun, Moon,
  FileSpreadsheet, LayoutDashboard, BookMarked, BrainCircuit, Zap,
  ChevronDown, ChevronUp, FileText, LogOut, User, Flame, CalendarClock, MessageSquare, Users, Headphones, Trophy, Keyboard
} from "lucide-react";
import confetti from "canvas-confetti";
import localforage from "localforage";
import axios, { API_BASE } from "../utils/api.js";
import { playSound, speakWord } from "../utils/audio.js";
import { showToast, ToastContainer } from "../utils/toast.jsx";
import useDarkMode from "../hooks/useDarkMode.js";

// Chuẩn hóa chuỗi: lowercase, xóa dấu tiếng Việt, ký tự đặc biệt
const normalizeStr = (s) => s ? String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim() : '';

// So khớp linh hoạt 2 nghĩa tiếng Việt
const isMeaningMatch = (targetMeaning, optMeaning) => {
  if (!targetMeaning || !optMeaning) return false;
  const cleanTarget = String(targetMeaning).trim().toLowerCase();
  const cleanOpt = String(optMeaning).trim().toLowerCase();
  if (cleanTarget === cleanOpt) return true;

  const nTarget = normalizeStr(cleanTarget);
  const nOpt = normalizeStr(cleanOpt);
  if (nTarget === nOpt) return true;

  // Tách các phần theo dấu phẩy, chấm phẩy, gạch chéo hoặc ngoặc
  const targetParts = cleanTarget.split(/[,|;/()]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const optParts = cleanOpt.split(/[,|;/()]/).map(s => s.trim().toLowerCase()).filter(Boolean);

  if (targetParts.includes(cleanOpt) || optParts.includes(cleanTarget)) return true;

  const nTargetParts = targetParts.map(normalizeStr);
  const nOptParts = optParts.map(normalizeStr);
  if (nTargetParts.includes(nOpt) || nOptParts.includes(nTarget)) return true;

  return false;
};

export default function IntegratedQuizView({ vocabList, setIsQuizOngoing, onBack, addXP, updateSRS, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('start'); // start, playing, result
  const [mistakes, setMistakes] = useState([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  
  // For multiple-choice
  const [selected, setSelected] = useState(null);
  
  // For typing / listening
  const [input, setInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  
  // Shared feedback state
  const [feedback, setFeedback] = useState(null); // { isCorrect, reason }
  const inputRef = useRef(null);

  const allModes = [
    { id: 'multiple-choice', label: 'Trắc nghiệm' },
    { id: 'typing-en-vi', label: 'Gõ tiếng Việt' },
    { id: 'typing-vi-en', label: 'Gõ tiếng Anh' },
    { id: 'listen-en', label: 'Nghe TA - Gõ TV' },
    { id: 'listen-vi', label: 'Nghe TV - Gõ TA' }
  ];
  const [selectedMode, setSelectedMode] = useState('multiple-choice');

  // Map tất cả các nghĩa của từ tiếng Anh trong vocabList hiện tại
  const localMeaningsMap = useMemo(() => {
    const map = {};
    if (!vocabList || !Array.isArray(vocabList)) return map;
    vocabList.forEach(v => {
      const w = (v.word || "").trim().toLowerCase();
      if (!w) return;
      if (!map[w]) map[w] = [];
      const m = (v.meaning || "").trim();
      if (m && !map[w].includes(m)) {
        map[w].push(m);
      }
    });
    return map;
  }, [vocabList]);

  // Tải bảng tra cứu nghĩa từ toàn bộ database (nếu có kết nối API)
  const [globalMeaningsMap, setGlobalMeaningsMap] = useState({});
  useEffect(() => {
    let isMounted = true;
    axios.get(`${API_BASE}/vocabularies/meanings-map`)
      .then(res => {
        if (isMounted && res.data?.success && res.data?.data) {
          setGlobalMeaningsMap(res.data.data);
        }
      })
      .catch(() => {
        // Tự động dùng localMeaningsMap nếu offline hoặc lỗi mạng
      });
    return () => { isMounted = false; };
  }, []);

  // Hàm tra cứu toàn bộ các nghĩa hợp lệ của một từ tiếng Anh
  const getValidMeaningsForWord = useCallback((wordStr, currentMeaning) => {
    const w = (wordStr || "").trim().toLowerCase();
    const set = new Set();
    if (currentMeaning && String(currentMeaning).trim()) {
      set.add(String(currentMeaning).trim());
    }
    (localMeaningsMap[w] || []).forEach(m => set.add(m));
    (globalMeaningsMap[w] || []).forEach(m => set.add(m));
    return Array.from(set);
  }, [localMeaningsMap, globalMeaningsMap]);

  const startQuiz = () => {
    const mixed = [...vocabList].sort(() => 0.5 - Math.random()).map(w => {
      const qType = selectedMode;
      const validMeanings = getValidMeaningsForWord(w.word, w.meaning);
      
      let options = [];
      if (qType === 'multiple-choice') {
        // Lấy danh sách các đáp án sai (thuộc từ khác và không phải nghĩa hợp lệ của từ này)
        const wrongPool = vocabList
          .filter(x => {
            const isSameWord = (x.word || "").trim().toLowerCase() === (w.word || "").trim().toLowerCase();
            const isValid = validMeanings.some(vm => isMeaningMatch(vm, x.meaning));
            return !isSameWord && !isValid;
          })
          .map(x => (x.meaning || "").trim())
          .filter(Boolean);

        const uniqueWrong = Array.from(new Set(wrongPool)).sort(() => 0.5 - Math.random());
        const chosenOptions = [(w.meaning || "").trim()];

        // Nếu trong danh sách từ có mục khác cùng từ tiếng Anh nhưng khác nghĩa tiếng Việt:
        // Đôi khi cho xuất hiện cùng câu trắc nghiệm (theo yêu cầu của user)
        const otherEntriesSameWord = vocabList.filter(x => 
          x.vocabulary_id !== w.vocabulary_id && 
          (x.word || "").trim().toLowerCase() === (w.word || "").trim().toLowerCase() &&
          (x.meaning || "").trim().toLowerCase() !== (w.meaning || "").trim().toLowerCase()
        );

        if (otherEntriesSameWord.length > 0 && Math.random() < 0.6) {
          const randOther = otherEntriesSameWord[Math.floor(Math.random() * otherEntriesSameWord.length)];
          const m = (randOther.meaning || "").trim();
          if (m && !chosenOptions.includes(m)) {
            chosenOptions.push(m);
          }
        }

        // Điền các phương án sai cho đủ 4 lựa chọn không trùng lặp
        for (const wr of uniqueWrong) {
          if (chosenOptions.length >= 4) break;
          if (!chosenOptions.includes(wr)) {
            chosenOptions.push(wr);
          }
        }

        options = chosenOptions.sort(() => 0.5 - Math.random());
      }
      return { ...w, qType, options, validMeanings };
    });
    setQuestions(mixed); setIndex(0); setScore(0); setGameState('playing'); 
    setSelected(null); setFeedback(null); setInput(""); setMistakes([]);
    setStreak(0); setMaxStreak(0);
  };

  useEffect(() => { if (setIsQuizOngoing) setIsQuizOngoing(gameState === 'playing'); }, [gameState, setIsQuizOngoing]);

  useEffect(() => {
    if (gameState === 'playing' && !feedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, index, feedback]);

  // Auto play audio for listening modes
  useEffect(() => {
    if (gameState === 'playing' && !feedback && questions[index]) {
      const q = questions[index];
      if (q.qType === 'listen-en') {
        speakWord(q.word, 'en-US');
      } else if (q.qType === 'listen-vi') {
        speakWord(q.meaning, 'vi-VN');
      }
    }
  }, [gameState, index, questions, feedback]);

  // Keyboard Shortcuts (1, 2, 3, 4) for multiple choice
  useEffect(() => {
    const handleKey = (e) => {
      if (gameState !== 'playing' || feedback || selected) return;
      const q = questions[index];
      if (q?.qType === 'multiple-choice') {
        const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3 };
        if (keyMap[e.key] !== undefined && q.options[keyMap[e.key]]) {
          handleMCQAnswer(q.options[keyMap[e.key]]);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, feedback, selected, index, questions]);

  const processResult = async (isCorrect, resultFeedback, q) => {
    setFeedback(resultFeedback);
    setIsChecking(false);

    if (isCorrect) {
      playSound('correct');
      if (!q.hasFailed) setScore(s => s + 1);
      setStreak(prev => {
        const next = prev + 1;
        setMaxStreak(m => Math.max(m, next));
        return next;
      });
    } else {
      playSound('wrong');
      setStreak(0);
      setMistakes(prev => {
        if (prev.find(m => m.vocabulary_id === q.vocabulary_id)) return prev;
        return [...prev, { 
          ...q, 
          userAnswer: resultFeedback.userAnswer || "Không rõ", 
          reason: resultFeedback.reason,
          validMeanings: resultFeedback.validOptions || q.validMeanings 
        }];
      });
    }

    if (updateSRS && !q.hasFailed) {
      try {
        await axios.post(`${API_BASE}/reviews/update`, { vocabulary_id: q.vocabulary_id, rating: isCorrect ? 4 : 0 });
      } catch (e) { console.error("Lỗi gửi điểm SRS"); }
    }
  };

  // Tự động chuyển câu sau khi có kết quả
  const autoNextRef = useRef(null);
  useEffect(() => {
    autoNextRef.current = () => nextQuestion();
  });

  useEffect(() => {
    let timer;
    if (feedback && gameState === 'playing') {
      timer = setTimeout(() => {
        if (autoNextRef.current) autoNextRef.current();
      }, feedback.isCorrect ? 1000 : 1200);
    }
    return () => clearTimeout(timer);
  }, [feedback, gameState]);

  const handleMCQAnswer = async (opt) => {
    if (selected || feedback) return;
    setSelected(opt);
    const q = questions[index];
    
    // Tìm tất cả các nghĩa hợp lệ của từ tiếng Anh này (kết hợp cả local và database)
    const allValidMeanings = q.validMeanings || getValidMeaningsForWord(q.word, q.meaning);
    
    // Tìm các lựa chọn đang xuất hiện trong câu hỏi này mà là nghĩa hợp lệ
    const validOptionsInQuestion = (q.options || []).filter(o => 
      allValidMeanings.some(vm => isMeaningMatch(vm, o))
    );
    if (validOptionsInQuestion.length === 0 && q.meaning) {
      validOptionsInQuestion.push(q.meaning);
    }

    // Chọn bất kỳ nghĩa nào trong danh sách nghĩa hợp lệ của từ đều được tính là ĐÚNG
    const isCorrect = allValidMeanings.some(vm => isMeaningMatch(vm, opt));

    let reason = "";
    if (isCorrect) {
      if (validOptionsInQuestion.length > 1) {
        reason = `Chính xác! (Từ "${q.word}" có ${validOptionsInQuestion.length} nghĩa đúng trong câu này)`;
      } else {
        reason = "Chính xác!";
      }
    } else {
      if (validOptionsInQuestion.length > 1) {
        reason = `Sai rồi. Đáp án đúng là: ${validOptionsInQuestion.join(" HOẶC ")}`;
      } else {
        reason = `Sai rồi. Đáp án đúng là: ${q.meaning}`;
      }
    }

    const resultFeedback = { 
      isCorrect, 
      reason, 
      userAnswer: opt,
      validOptions: validOptionsInQuestion 
    };

    await processResult(isCorrect, resultFeedback, q);
  };

  const handleTypingAnswer = async () => {
    if (!input.trim() || isChecking || feedback) return;
    setIsChecking(true);
    
    const q = questions[index];
    let isCorrect = false;
    let resultFeedback = null;
    
    const isEnglishInput = (q.qType === 'typing-vi-en' || q.qType === 'listen-vi');
    const targetStr = isEnglishInput ? q.word : q.meaning;
    
    // Tìm các đáp án hợp lệ từ danh sách từ vựng (từ đồng nghĩa / các nghĩa khác của cùng 1 từ)
    let validTargets = [];
    if (isEnglishInput) {
      validTargets = vocabList.filter(v => normalizeStr(v.meaning) === normalizeStr(q.meaning)).map(v => v.word);
    } else {
      validTargets = getValidMeaningsForWord(q.word, q.meaning);
    }
    if (!validTargets.includes(targetStr)) validTargets.push(targetStr);

    const normInput = normalizeStr(input);

    const checkWordsMatch = (str1, str2) => {
      if (!str1 || !str2) return false;
      return str1.split(' ').sort().join(' ') === str2.split(' ').sort().join(' ');
    };

    const checkAgainstTarget = (tStr) => {
      const nTarget = normalizeStr(tStr);
      const tParts = tStr.split(/[,|;]/).map(normalizeStr);
      return (normInput === nTarget || tParts.includes(normInput) || checkWordsMatch(normInput, nTarget) || tParts.some(part => checkWordsMatch(normInput, part)));
    };

    let matchFound = false;
    for (const tStr of validTargets) {
      if (checkAgainstTarget(tStr)) {
        isCorrect = true;
        resultFeedback = { isCorrect: true, reason: "Đúng (Khớp chính xác)", userAnswer: input.trim() };
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      try {
        // Dùng AI chấm cho các trường hợp từ đồng nghĩa/nghĩa khác (nếu API hoạt động)
        const res = await axios.post(`${API_BASE}/check-answer`, {
          word: q.word,
          correctMeaning: q.meaning,
          userAnswer: input.trim(),
          isEnglishInput: isEnglishInput
        });
        if (res.data.success) {
          isCorrect = res.data.data.isCorrect;
          resultFeedback = res.data.data;
          resultFeedback.userAnswer = input.trim();
        } else {
          throw new Error("API returned error");
        }
      } catch (e) {
        // Fallback: Kiểm tra xem input có nằm trong bất kỳ target hợp lệ nào không
        let fallbackCorrect = false;
        for (const tStr of validTargets) {
          const nTarget = normalizeStr(tStr);
          if (nTarget.includes(normInput) && normInput.length >= 3) {
            fallbackCorrect = true;
            break;
          }
        }
        isCorrect = fallbackCorrect;
        resultFeedback = { isCorrect, reason: isCorrect ? "Chấp nhận (Gần đúng)" : `Sai. Đáp án đúng: ${targetStr}`, userAnswer: input.trim() };
      }
    }
    
    await processResult(isCorrect, resultFeedback, q);
  };

  const nextQuestion = (forceCorrect = false) => {
    const q = questions[index];
    const isCorrect = forceCorrect || (feedback && feedback.isCorrect);
    
    let nextIndex = index + 1;
    let newQuestions = [...questions];
    
    if (!isCorrect) {
      // Đẩy câu hỏi sai xuống cuối để làm lại
      newQuestions.push({ ...q, hasFailed: true });
      setQuestions(newQuestions);
    }

    if (index === newQuestions.length - 1) {
      setGameState('result');
      const finalScore = score + (isCorrect && !q.hasFailed ? 1 : 0);
      if (finalScore === vocabList.length) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
      addXP(finalScore * 10); // 10 XP per correct answer
    } else {
      setIndex(nextIndex);
      setFeedback(null);
      setSelected(null);
      setInput("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (feedback) {
        nextQuestion();
      } else {
        const q = questions[index];
        if (q?.qType !== 'multiple-choice') {
           handleTypingAnswer();
        }
      }
    }
  };

  if (gameState === 'start') {
    return (
      <div className="text-center bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 max-w-2xl mx-auto shadow-2xl shadow-brand-500/5 animate-scale-in">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-brand-50 dark:bg-brand-900/30 rounded-3xl mx-auto flex items-center justify-center mb-4 sm:mb-6">
          <BrainCircuit size={36} className="text-brand-500 animate-pulse-slow sm:w-12 sm:h-12" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black mb-2 text-slate-900 dark:text-white">Kiểm tra Tổng hợp</h2>
        <p className="text-slate-500 mb-6 font-medium text-sm sm:text-base">Chọn chế độ bạn muốn thử sức hôm nay:</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 text-left">
          {allModes.map(m => {
            const isSelected = selectedMode === m.id;
            let icon = <CheckCircle2 />;
            if (m.id.includes('typing')) icon = <Keyboard />;
            if (m.id.includes('listen')) icon = <Headphones />;
            if (m.id === 'multiple-choice') icon = <Layers />;

            return (
              <button key={m.id} onClick={() => setSelectedMode(m.id)}
                className={`p-3 sm:p-4 rounded-2xl border-2 flex items-center gap-3 sm:gap-4 font-medium transition-all group ${
                  isSelected 
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 shadow-md transform -translate-y-1" 
                    : "border-slate-200 text-slate-500 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 hover:-translate-y-1"
                }`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-500'
                }`}>
                  {React.cloneElement(icon, { size: 18 })}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-base ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>{m.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={startQuiz} className="vip-btn w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-brand-500/30 transition-all transform hover:-translate-y-1 uppercase tracking-wide">
          Bắt đầu ngay
        </button>
      </div>
    );
  }

  if (gameState === 'result') {
    return (
      <div className="text-center bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 max-w-xl mx-auto shadow-2xl shadow-brand-500/10 animate-bounce-soft">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl sm:text-3xl font-black mb-4 text-slate-900 dark:text-white">Hoàn thành xuất sắc!</h2>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Điểm số</p>
            <p className="text-xl text-slate-600 dark:text-slate-300 font-medium">
              <span className="text-brand-500 font-black text-4xl mr-1">{score}</span> / {vocabList.length}
            </p>
          </div>
          {maxStreak >= 3 && (
            <div className="hidden sm:block w-px h-16 bg-slate-200 dark:bg-slate-700"></div>
          )}
          {maxStreak >= 3 && (
            <div className="text-center">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Chuỗi dài nhất</p>
               <p className="text-4xl text-orange-500 font-black flex items-center justify-center gap-2" title="Chuỗi đúng liên tiếp dài nhất">
                <Flame size={32} className="fill-orange-500" /> {maxStreak}
              </p>
            </div>
          )}
        </div>

        {mistakes.length > 0 && (
          <div className="mb-8 text-left">
            <h3 className="font-black text-xl mb-4 text-slate-800 dark:text-white flex items-center gap-2">
              <XCircle className="text-red-500" size={24} /> Cần ôn tập lại ({mistakes.length})
            </h3>
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
              {mistakes.map((m, i) => {
                const displayCorrect = m.validMeanings && m.validMeanings.length > 1
                  ? m.validMeanings.join(" / ")
                  : (m.qType.includes('vi-en') || m.qType === 'listen-vi' ? m.word : m.meaning);

                return (
                  <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-400"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pl-2">
                      <span className="font-black text-xl text-slate-900 dark:text-white">{m.word}</span>
                      <span className="text-sm font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 px-4 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        Đúng: {displayCorrect}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 pl-2 font-medium">
                      Bạn chọn: <span className="line-through text-red-500 font-bold ml-1">{m.userAnswer}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button onClick={onComplete || onBack} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 font-bold text-lg rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border-2 border-transparent">Về trang chủ</button>
          <button onClick={startQuiz} className="vip-btn flex-1 py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-lg rounded-2xl shadow-xl shadow-brand-500/30 uppercase tracking-wide">Chơi lại ngay</button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  
  let headerText = "";
  let displayWord = "";
  let isListenMode = false;
  
  if (q.qType === 'multiple-choice') {
    headerText = "Chọn nghĩa đúng";
    displayWord = q.word;
  } else if (q.qType === 'typing-en-vi') {
    headerText = "Dịch sang Tiếng Việt";
    displayWord = q.word;
  } else if (q.qType === 'typing-vi-en') {
    headerText = "Dịch sang Tiếng Anh";
    displayWord = q.meaning;
  } else if (q.qType === 'listen-en') {
    headerText = "Nghe Tiếng Anh & Gõ nghĩa Tiếng Việt";
    isListenMode = true;
  } else if (q.qType === 'listen-vi') {
    headerText = "Nghe Tiếng Việt & Gõ từ Tiếng Anh";
    isListenMode = true;
  }

  const progress = (index / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-24">
      <div className="mb-4 flex justify-between items-center">
        <button onClick={onBack} className="text-slate-500 hover:text-brand-500 flex items-center gap-1 font-medium"><ArrowLeft size={16}/> Thoát</button>
        <div className="flex items-center gap-4">
          {streak > 1 && (
            <span className="font-bold text-orange-500 flex items-center gap-1 animate-pulse" title="Chuỗi đúng liên tiếp">
              <Flame size={18} className="fill-orange-500" /> {streak}
            </span>
          )}
          <span className="font-bold text-slate-400">Câu {index + 1} / {questions.length}</span>
        </div>
      </div>
      
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mb-6 overflow-hidden shadow-inner">
        <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500 ease-out" style={{width: `${progress}%`}}/>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 sm:p-8 text-center shadow-lg shadow-brand-500/5 mb-6 relative">
        <p className="text-xs sm:text-sm font-bold text-brand-500 uppercase tracking-widest mb-4">
          {headerText}
        </p>
        
        {isListenMode ? (
          <div className="flex justify-center items-center gap-3 mb-2">
            <button onClick={() => speakWord(q.qType === 'listen-en' ? q.word : q.meaning, q.qType === 'listen-en' ? 'en-US' : 'vi-VN')} className="w-16 h-16 rounded-full bg-brand-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:bg-brand-200 transition-colors shadow-md animate-pulse">
              <Headphones size={32} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-center gap-3 mb-2">
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{displayWord}</h3>
            {(q.qType === 'multiple-choice' || q.qType === 'typing-en-vi') && (
              <button onClick={(e) => { e.stopPropagation(); speakWord(q.word); }} className="w-10 h-10 rounded-full bg-brand-50 dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:bg-brand-100 transition-colors shadow-sm" title="Nghe phát âm">
                <Volume2 size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      {q.qType === 'multiple-choice' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {q.options.map((opt, i) => {
            const allValidMeanings = q.validMeanings || getValidMeaningsForWord(q.word, q.meaning);
            const isOptCorrect = allValidMeanings.some(vm => isMeaningMatch(vm, opt));

            let cls = "bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-brand-400 hover:shadow-lg hover:-translate-y-1 shadow-sm";
            if (selected) {
              if (isOptCorrect) {
                cls = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-md transform -translate-y-1 scale-105 z-10 animate-bounce-soft";
              } else if (opt === selected) {
                cls = "bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700 dark:text-red-300 animate-shake";
              } else {
                cls = "opacity-40 scale-95";
              }
            }
            return (
              <button 
                key={i} 
                onClick={() => handleMCQAnswer(opt)} 
                disabled={!!selected} 
                className={`p-3 sm:p-4 rounded-xl text-base sm:text-lg font-bold transition-all duration-300 text-left flex items-center ${cls}`}
              >
                <span className={`w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center mr-3 flex-shrink-0 ${selected && isOptCorrect ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' : ''}`}>
                  {i+1}
                </span> 
                <span className="flex-1">{opt}</span>
                {selected && isOptCorrect && (
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0" />
                )}
                {selected && !isOptCorrect && opt === selected && (
                  <XCircle size={18} className="text-red-500 ml-2 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="relative max-w-lg mx-auto">
          <input 
            ref={inputRef}
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            disabled={!!feedback || isChecking}
            placeholder="Gõ đáp án vào đây..." 
            className={`w-full py-2 sm:py-3 text-center bg-transparent text-xl sm:text-2xl font-bold border-b-2 focus:outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 ${
              feedback 
                ? feedback.isCorrect ? "border-emerald-500 text-emerald-600" : "border-red-500 text-red-600"
                : "border-slate-200 dark:border-slate-700 focus:border-brand-500 text-slate-800 dark:text-white"
            }`}
          />
          {isChecking && <Loader2 className="absolute right-0 top-3 animate-spin text-brand-500" size={24} />}
        </div>
      )}

      {feedback && !feedback.isCorrect && q.qType !== 'multiple-choice' && (
        <div className="mt-4 text-center animate-fade-in">
          <p className="text-sm font-semibold text-red-500 dark:text-red-400">
            Đáp án đúng: <span className="font-bold underline ml-1">{(q.qType === 'typing-vi-en' || q.qType === 'listen-vi') ? q.word : q.meaning}</span>
          </p>
        </div>
      )}
    </div>
  );
}
