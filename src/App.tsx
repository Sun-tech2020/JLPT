import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Volume2, 
  Search,
  X,
  Trophy,
  List,
  ChevronDown,
  ArrowLeft,
  Play
} from 'lucide-react';
import { vocabulary, Word } from './data/vocabulary';

type AppState = 'selection' | 'memorize' | 'practice';

export default function App() {
  const [state, setState] = useState<AppState>('selection');
  const [selectedUnit, setSelectedUnit] = useState<string>('全部');
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set(vocabulary.map(w => w.id)));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizWords, setQuizWords] = useState<Word[]>([]);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [correctIndex, setCorrectIndex] = useState(-1);

  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Filtered words based on unit selection
  const unitFilteredWords = useMemo(() => {
    return vocabulary.filter(w => selectedUnit === '全部' || w.unit === selectedUnit);
  }, [selectedUnit]);

  // Words actually selected by checkboxes
  const activeWords = useMemo(() => {
    return unitFilteredWords.filter(w => selectedWordIds.has(w.id));
  }, [unitFilteredWords, selectedWordIds]);

  const units = useMemo(() => {
    const u = Array.from(new Set(vocabulary.map(w => w.unit)));
    return ['全部', ...u];
  }, []);

  // Speech Synthesis
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    
    // Find a Japanese voice if possible
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find(v => v.lang.startsWith('ja'));
    if (jaVoice) utterance.voice = jaVoice;
    
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Initialize voices (some browsers need this)
  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  // Handle Selection
  const toggleWord = (id: string) => {
    const newSet = new Set(selectedWordIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedWordIds(newSet);
  };

  const toggleAll = () => {
    if (activeWords.length === unitFilteredWords.length) {
      const newSet = new Set(selectedWordIds);
      unitFilteredWords.forEach(w => newSet.delete(w.id));
      setSelectedWordIds(newSet);
    } else {
      const newSet = new Set(selectedWordIds);
      unitFilteredWords.forEach(w => newSet.add(w.id));
      setSelectedWordIds(newSet);
    }
  };

  // Start Modes
  const startMemorize = () => {
    if (activeWords.length === 0) return;
    setCurrentIndex(0);
    setState('memorize');
    // Auto-play first word
    setTimeout(() => speak(activeWords[0].japanese), 100);
  };

  const startPractice = () => {
    if (activeWords.length === 0) return;
    const shuffled = [...activeWords].sort(() => 0.5 - Math.random());
    setQuizWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setState('practice');
    generateOptions(shuffled[0], activeWords);
    // Auto-play first word
    setTimeout(() => speak(shuffled[0].japanese), 100);
  };

  // Auto-play on word change
  useEffect(() => {
    if (state === 'memorize' && activeWords[currentIndex]) {
      speak(activeWords[currentIndex].japanese);
    } else if (state === 'practice' && quizWords[currentIndex] && !answered) {
      speak(quizWords[currentIndex].japanese);
    }
  }, [currentIndex, state, speak]); // answered is intentionally omitted to only play on new word

  const generateOptions = (correctWord: Word, pool: Word[]) => {
    const otherMeanings = pool
      .filter(w => w.id !== correctWord.id)
      .map(w => w.chinese);
    
    const shuffledOthers = otherMeanings.sort(() => 0.5 - Math.random());
    const selectedOptions = [correctWord.chinese, ...shuffledOthers.slice(0, 3)];
    const finalOptions = selectedOptions.sort(() => 0.5 - Math.random());
    
    setOptions(finalOptions);
    setCorrectIndex(finalOptions.indexOf(correctWord.chinese));
    setAnswered(false);
    setSelectedIndex(null);
    setFeedback(null);
  };

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelectedIndex(idx);
    setAnswered(true);
    
    if (idx === correctIndex) {
      setFeedback('correct');
      setScore(s => s + 1);
      // Auto-next after 800ms if correct
      setTimeout(() => {
        if (currentIndex < quizWords.length - 1) {
          nextQuestion();
        } else {
          setState('selection');
        }
      }, 800);
    } else {
      setFeedback('wrong');
    }
  };

  const nextQuestion = () => {
    if (currentIndex < quizWords.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      generateOptions(quizWords[nextIdx], activeWords);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#4A4A40] font-serif selection:bg-olive-100">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5DF] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white shadow-sm">
              <BookOpen size={22} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#2A2A20]">日语单词助手</h1>
          </div>
          {state !== 'selection' && (
            <button 
              onClick={() => setState('selection')}
              className="flex items-center gap-2 text-sm font-medium hover:text-[#5A5A40] transition-colors"
            >
              <ArrowLeft size={16} />
              返回选择
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {state === 'selection' && (
            <motion.div 
              key="selection"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Filters & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-[#E5E5DF] shadow-sm flex flex-col justify-center">
                  <label className="text-xs font-bold text-[#A0A090] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ChevronDown size={14} /> 单元筛选
                  </label>
                  <div className="relative">
                    <select 
                      value={selectedUnit}
                      onChange={(e) => setSelectedUnit(e.target.value)}
                      className="w-full appearance-none bg-[#F9F9F5] border border-[#E5E5DF] rounded-2xl px-5 py-3 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all"
                    >
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A090] pointer-events-none" size={20} />
                  </div>
                </div>

                <div className="bg-[#5A5A40] p-6 rounded-3xl shadow-lg flex items-center justify-between text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">已选中单词</p>
                    <p className="text-5xl font-black italic">{activeWords.length}</p>
                  </div>
                  <div className="flex gap-2 relative z-10">
                    <button 
                      onClick={startMemorize}
                      disabled={activeWords.length === 0}
                      className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all disabled:opacity-30"
                      title="背诵模式"
                    >
                      <BookOpen size={24} />
                    </button>
                    <button 
                      onClick={startPractice}
                      disabled={activeWords.length === 0}
                      className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all disabled:opacity-30"
                      title="练习模式"
                    >
                      <Play size={24} />
                    </button>
                  </div>
                  {/* Decorative circle */}
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full"></div>
                </div>
              </div>

              {/* Word List Table */}
              <div className="bg-white rounded-3xl border border-[#E5E5DF] shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-[#F0F0EB] flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-[#2A2A20]">
                    <List size={20} className="text-[#A0A090]" /> 单词列表
                  </h2>
                  <button 
                    onClick={toggleAll}
                    className="text-sm font-bold text-[#5A5A40] hover:underline"
                  >
                    {activeWords.length === unitFilteredWords.length ? '取消全选' : '全选本单元'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[11px] font-bold text-[#A0A090] uppercase tracking-wider border-b border-[#F0F0EB]">
                        <th className="px-8 py-4 w-16">选择</th>
                        <th className="px-4 py-4">日语</th>
                        <th className="px-4 py-4">平假名</th>
                        <th className="px-4 py-4">汉语</th>
                        <th className="px-8 py-4 text-right">单元</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitFilteredWords.map((word) => (
                        <tr 
                          key={word.id} 
                          className={`group hover:bg-[#F9F9F5] transition-colors border-b border-[#F0F0EB] last:border-0 cursor-pointer ${!selectedWordIds.has(word.id) ? 'opacity-60' : ''}`}
                          onClick={() => toggleWord(word.id)}
                        >
                          <td className="px-8 py-5">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedWordIds.has(word.id) ? 'bg-[#5A5A40] border-[#5A5A40] text-white' : 'border-[#E5E5DF] bg-white'}`}>
                              {selectedWordIds.has(word.id) && <CheckCircle2 size={14} />}
                            </div>
                          </td>
                          <td className="px-4 py-5 font-bold text-lg text-[#2A2A20]">{word.japanese}</td>
                          <td className="px-4 py-5 text-[#808070] font-medium">{word.hiragana}</td>
                          <td className="px-4 py-5 text-[#606050]">{word.chinese}</td>
                          <td className="px-8 py-5 text-right text-xs font-bold text-[#A0A090]">{word.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {state === 'memorize' && (
            <motion.div 
              key="memorize"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center py-2"
            >
              <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-[#E5E5DF] shadow-lg overflow-hidden relative">
                <div className="p-8 flex flex-col items-center text-center">
                  <p className="text-[10px] font-bold text-[#A0A090] uppercase tracking-[0.5em] mb-6">
                    背诵模式 · {currentIndex + 1} / {activeWords.length}
                  </p>
                  
                  <div 
                    className="cursor-pointer group mb-2"
                    onClick={() => speak(activeWords[currentIndex].japanese)}
                  >
                    <h2 className="text-5xl font-bold text-[#2A2A20] mb-2 group-hover:text-[#5A5A40] transition-colors leading-tight">
                      {activeWords[currentIndex].japanese}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-xl text-[#808070] font-medium">
                      {activeWords[currentIndex].hiragana}
                      <Volume2 size={20} className="text-[#A0A090] group-hover:text-[#5A5A40] transition-colors" />
                    </div>
                  </div>

                  <div className="w-full h-px bg-[#F0F0EB] my-8"></div>

                  <div className="mb-8">
                    <p className="text-3xl italic text-[#5A5A40] font-serif">
                      {activeWords[currentIndex].chinese}
                    </p>
                  </div>

                  <div className="flex items-center gap-8 w-full justify-center">
                    <button 
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="w-12 h-12 rounded-full border border-[#E5E5DF] flex items-center justify-center text-[#A0A090] hover:border-[#5A5A40] hover:text-[#5A5A40] transition-all disabled:opacity-20"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    
                    <button 
                      onClick={() => setCurrentIndex(prev => Math.min(activeWords.length - 1, prev + 1))}
                      disabled={currentIndex === activeWords.length - 1}
                      className="w-12 h-12 rounded-full border border-[#E5E5DF] flex items-center justify-center text-[#A0A090] hover:border-[#5A5A40] hover:text-[#5A5A40] transition-all disabled:opacity-20"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Footer */}
              <div className="w-full max-w-2xl mt-12 px-4">
                <div className="h-1 w-full bg-[#E5E5DF] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#5A5A40]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / activeWords.length) * 100}%` }}
                  />
                </div>
                <p className="mt-12 text-center text-[10px] font-bold text-[#A0A090] uppercase tracking-[0.3em]">
                  Japanese Vocabulary Learning Assistant
                </p>
              </div>
            </motion.div>
          )}

          {state === 'practice' && (
            <motion.div 
              key="practice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center py-2"
            >
              <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-[#E5E5DF] shadow-lg overflow-hidden relative">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-[10px] font-bold text-[#A0A090] uppercase tracking-[0.5em]">
                      练习模式 · {currentIndex + 1} / {quizWords.length}
                    </p>
                    <p className="text-xs font-bold text-[#5A5A40]">
                      得分: <span className="text-lg italic">{score}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center mb-8">
                    <div 
                      className="cursor-pointer group"
                      onClick={() => speak(quizWords[currentIndex].japanese)}
                    >
                      <h2 className="text-5xl font-bold text-[#2A2A20] mb-2 leading-tight">
                        {quizWords[currentIndex].japanese}
                      </h2>
                      <div className="flex items-center justify-center gap-2 text-xl text-[#808070] font-medium">
                        {quizWords[currentIndex].hiragana}
                        <Volume2 size={20} className="text-[#A0A090] group-hover:text-[#5A5A40] transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {options.map((option, idx) => {
                      let btnStyle = "bg-[#F9F9F5] border-[#E5E5DF] text-[#4A4A40] hover:border-[#5A5A40] hover:bg-white";
                      if (answered) {
                        if (idx === correctIndex) {
                          btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-700";
                        } else if (idx === selectedIndex) {
                          btnStyle = "bg-rose-50 border-rose-500 text-rose-700";
                        } else {
                          btnStyle = "bg-gray-50 border-gray-100 text-gray-300 opacity-30";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(idx)}
                          disabled={answered}
                          className={`p-4 rounded-2xl border-2 text-lg font-bold transition-all flex items-center justify-center text-center h-20 ${btnStyle}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-16 mt-8 flex items-center justify-center">
                    <AnimatePresence>
                      {feedback === 'wrong' && (
                        <motion.button 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          onClick={currentIndex === quizWords.length - 1 ? () => setState('selection') : nextQuestion}
                          className="px-10 py-3 bg-[#5A5A40] text-white rounded-full font-bold shadow-md shadow-[#5A5A40]/10 hover:scale-105 transition-all flex items-center gap-2 text-sm"
                        >
                          {currentIndex === quizWords.length - 1 ? '完成练习' : '下一题'}
                          <ChevronRight size={18} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Footer */}
              <div className="w-full max-w-2xl mt-12 px-4">
                <div className="h-1 w-full bg-[#E5E5DF] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#5A5A40]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / quizWords.length) * 100}%` }}
                  />
                </div>
                <p className="mt-12 text-center text-[10px] font-bold text-[#A0A090] uppercase tracking-[0.3em]">
                  Japanese Vocabulary Learning Assistant
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&display=swap');
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .font-serif {
          font-family: 'Cormorant Garamond', serif;
        }
      `}</style>
    </div>
  );
}
