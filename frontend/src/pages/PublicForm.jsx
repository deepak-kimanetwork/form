import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getFormById, saveResponseLocal } from '../utils/storage';
import { Check, ArrowRight, ArrowLeft, Loader2, Star, UploadCloud, FileText, X } from 'lucide-react';
import { supabase } from '../utils/supabase';

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export default function PublicForm() {
    const { formId } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [history, setHistory] = useState([0]); // Stack of visited indices
    const [answers, setAnswers] = useState({});
    const [activeCategory, setActiveCategory] = useState(null);
    const [activeItem, setActiveItem] = useState(null);
    const [direction, setDirection] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const [isDone, setIsDone] = useState(false);
    const [summary, setSummary] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isPasswordCorrect, setIsPasswordCorrect] = useState(false);
    const [enteredPassword, setEnteredPassword] = useState('');
    const [score, setScore] = useState(0);
    const [isClosed, setIsClosed] = useState(false);
    const [closeReason, setCloseReason] = useState('');

    useEffect(() => {
        const fetchForm = async () => {
            const f = await getFormById(formId);
            if (f) {
                setForm(f);
                // Hidden Fields: auto-fill from URL params
                const params = new URLSearchParams(window.location.search);
                const hiddenAnswers = {};
                f.questions.forEach(q => {
                    const val = params.get(q.label) || params.get(q.id);
                    if (val) hiddenAnswers[q.label] = val;
                });
                setAnswers(prev => ({ ...prev, ...hiddenAnswers }));
                
                if (!f.theme?.password) {
                    setIsPasswordCorrect(true);
                }

                // Check Deadline & Limits
                if (f.theme?.deadline && new Date() > new Date(f.theme.deadline)) {
                    setIsClosed(true);
                    setCloseReason('This form has reached its deadline and is no longer accepting submissions.');
                }

                if (f.theme?.maxResponses) {
                    const { count, error } = await supabase
                        .from('responses')
                        .select('*', { count: 'exact', head: true })
                        .eq('form_id', formId);
                    
                    if (!error && count >= parseInt(f.theme.maxResponses)) {
                        setIsClosed(true);
                        setCloseReason('This form has reached its maximum response limit.');
                    }
                }

                // Partial Saving: Load from localStorage
                const saved = localStorage.getItem(`draft_${formId}`);
                if (saved) {
                    if (confirm('Find your previous progress. Would you like to continue from where you left off?')) {
                        const { answers: savedAnswers, index: savedIndex } = JSON.parse(saved);
                        setAnswers(savedAnswers);
                        setCurrentIndex(savedIndex);
                        setHistory(Array.from({length: savedIndex + 1}, (_, i) => i));
                    }
                }
            } else {
                alert('Form not found');
                navigate('/');
            }
        };
        fetchForm();
    }, [formId, navigate]);

    const handleLanguageChange = async (lang) => {
        if (!lang) return;
        setIsAiLoading(true);
        try {
            const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
            
            const res = await fetch(`${apiUrl}/api/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questions: form.questions,
                    title: form.title,
                    targetLanguage: lang
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                setForm({ ...form, title: data.title, questions: data.questions });
            } else {
                alert('Translation failed.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAiLoading(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !isSubmitting && !isDone && form) {
                const currentQ = form.questions[currentIndex];
                if (currentQ?.type !== 'textarea') {
                    e.preventDefault();
                    handleNext();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, isSubmitting, isDone, form, answers]);

    useEffect(() => {
        if (form && form.theme) {
            const isDarkLocal = form.theme.mode === 'dark';
            document.body.style.backgroundColor = isDarkLocal ? '#111827' : (form.theme.backgroundColor || '#ffffff');
            document.body.style.color = isDarkLocal ? '#f9fafb' : (form.theme.textColor || '#111827');
            document.body.style.fontFamily = form.theme.fontFamily || 'Inter, sans-serif';
            document.title = form.title || 'Form';
        }
        return () => {
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
            document.body.style.fontFamily = '';
            document.title = 'AI Form Builder';
        }
    }, [form]);

    if (!form) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

    const currentQ = form.questions[currentIndex];
    const progress = ((currentIndex) / form.questions.length) * 100;
    const theme = form.theme || { primaryColor: '#22c55e', backgroundColor: '#ffffff', textColor: '#111827' };
    const isDark = theme.mode === 'dark';

    const handleNext = async () => {
        if (!currentQ) return;
        const currentAnswer = answers[currentQ.label];

        // Reset active category/item for nested choices
        setActiveCategory(null);
        setActiveItem(null);

        // Validation 
        if (currentQ.required) {
            const isEmpty = !currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0);
            if (isEmpty) {
                alert('This field is required!');
                return;
            }
        }

        // Check for AI Follow-up (only for text types and only if not already an AI question)
        const isTextType = ['text', 'textarea'].includes(currentQ.type);
        const aiDisabled = theme.disableAiFollowUp === true;

        if (isTextType && !currentQ.isAiFollowUp && !aiDisabled && currentAnswer?.length > 3) {
            await handleAiFollowUp(currentQ, currentAnswer);
            return;
        }

        // Merge "Other" text if applicable
        if (currentQ.hasOther) {
            const otherVal = answers[`${currentQ.label}_other`];
            if (otherVal) {
                if (Array.isArray(currentAnswer)) {
                    if (currentAnswer.includes('Other')) {
                        const merged = currentAnswer.map(v => v === 'Other' ? otherVal : v);
                        setAnswers(a => ({ ...a, [currentQ.label]: merged }));
                    }
                } else if (currentAnswer === 'Other') {
                    setAnswers(a => ({ ...a, [currentQ.label]: otherVal }));
                }
            }
        }

        if (currentIndex === form.questions.length - 1) {
            // End of form: check Quiz Mode
            if (form.theme?.isQuizMode) {
                let currentScore = 0;
                form.questions.forEach(q => {
                    const ans = answers[q.label];
                    if (ans && q.correctAnswer && String(ans).toLowerCase().trim() === String(q.correctAnswer).toLowerCase().trim()) {
                        currentScore++;
                    }
                });
                setScore(currentScore);
            }
        }

        processNextStep();
    };

    const processNextStep = () => {
        const currentAnswer = answers[currentQ.label];
        // Evaluate Logic Jumps
        let targetIndex = currentIndex + 1; // Default next
        if (currentQ.logic && currentQ.logic.length > 0) {
            for (const rule of currentQ.logic) {
                if (!rule.target) continue;

                let match = false;
                const answerValue = currentAnswer;
                const ruleValue = rule.value;

                if (Array.isArray(answerValue)) {
                    if (rule.condition === 'contains' && answerValue.some(v => String(v).toLowerCase().includes(String(ruleValue).toLowerCase()))) match = true;
                    if (rule.condition === 'equals' && answerValue.includes(ruleValue)) match = true;
                } else {
                    const ansStr = String(answerValue || '').toLowerCase();
                    const valStr = String(ruleValue || '').toLowerCase();
                    const ansNum = Number(answerValue);
                    const valNum = Number(ruleValue);

                    if (rule.condition === 'equals' && ansStr === valStr) match = true;
                    if (rule.condition === 'not_equals' && ansStr !== valStr) match = true;
                    if (rule.condition === 'contains' && ansStr.includes(valStr) && valStr.length > 0) match = true;
                    if (rule.condition === 'greater_than' && !isNaN(ansNum) && !isNaN(valNum) && ansNum > valNum) match = true;
                    if (rule.condition === 'less_than' && !isNaN(ansNum) && !isNaN(valNum) && ansNum < valNum) match = true;
                }

                if (match) {
                    const foundIndex = form.questions.findIndex(q => q.id === rule.target);
                    if (foundIndex !== -1) {
                        targetIndex = foundIndex;
                        break;
                    }
                }
            }
        }

        if (targetIndex < form.questions.length) {
            setDirection(1);
            setCurrentIndex(targetIndex);
            setHistory(h => [...h, targetIndex]);
        } else {
            submitForm();
        }
    };

    const handleAiFollowUp = async (q, answer) => {
        setIsAiLoading(true);
        try {
            const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

            const res = await fetch(`${apiUrl}/api/generate-next`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q.label, answer })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.followUp) {
                    const followUpQ = {
                        id: `ai-${Date.now()}`,
                        label: data.followUp,
                        type: 'text',
                        required: false,
                        isAiFollowUp: true
                    };

                    const newQuestions = [...form.questions];
                    newQuestions.splice(currentIndex + 1, 0, followUpQ);
                    setForm({ ...form, questions: newQuestions });
                }
            }
        } catch (err) {
            console.error("AI Follow-up failed", err);
        } finally {
            setIsAiLoading(false);
            setDirection(1);
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            setHistory(h => [...h, nextIdx]);
        }
    };

    const handlePrev = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop();
            const prevIndex = newHistory[newHistory.length - 1];

            setDirection(-1);
            setCurrentIndex(prevIndex);
            setHistory(newHistory);
        }
    };

    const submitForm = async () => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

            const res = await fetch(`${apiUrl}/api/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formId: form.id,
                    answers,
                    quizScore: form.theme?.isQuizMode ? score : null,
                    webhookUrl: form.theme?.googleSheetWebhookUrl,
                    googleSheetId: form.theme?.googleSheetId,
                    googleTokens: form.theme?.googleTokens
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to submit form.');
            }

            const summaryRes = await fetch(`${apiUrl}/api/summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers })
            });
            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setSummary(summaryData);
            }

            saveResponseLocal({ formId: form.id, answers, timestamp: new Date().toISOString() });
            setIsDone(true);
        } catch (err) {
            console.error(err);
            alert('Failed to submit form.');
            submittingRef.current = false;
        } finally {
            setIsSubmitting(false);
            // We do NOT reset submittingRef to false on success, because we want to stay blocked while showing the "Done" screen
        }
    };

    if (isDone) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500 ${isDark ? 'bg-gray-900 text-white' : ''}`} style={{ backgroundColor: !isDark ? theme.backgroundColor : undefined, color: !isDark ? theme.textColor : undefined }}>
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-2xl">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl" style={{ backgroundColor: theme.primaryColor }}>
                        <Check className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4">{form.thankYouTitle || "You're all set!"}</h1>
                    <p className="text-lg opacity-70 mb-8">{form.thankYouMessage || "Your responses have been recorded successfully. Thank you for your time."}</p>

                    {summary && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className={`p-8 rounded-2xl text-left border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs">AI Response Summary</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${summary.score === 'High Value' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{summary.score}</span>
                            </div>
                            <p className="text-lg leading-relaxed">{summary.summary}</p>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        );
    }

    const variants = {
        enter: (dir) => ({ y: dir > 0 ? 50 : -50, opacity: 0 }),
        center: { zIndex: 1, y: 0, opacity: 1 },
        exit: (dir) => ({ zIndex: 0, y: dir < 0 ? 50 : -50, opacity: 0 })
    };

    return (
        <div className={`min-h-screen flex flex-col overflow-hidden transition-colors duration-500 relative ${isDark ? 'bg-gray-950 text-white' : ''}`} style={{ backgroundColor: !isDark ? theme.backgroundColor : undefined, color: !isDark ? theme.textColor : undefined, fontFamily: theme.fontFamily }}>
            {theme.backgroundImageUrl && (
                <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                    <img src={theme.backgroundImageUrl} className="w-full h-full object-cover" alt="" />
                </div>
            )}
            
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
                <select 
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className={`p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-sm font-bold outline-none cursor-pointer ${isDark ? 'text-white hover:bg-white/20' : 'text-gray-900 hover:bg-black/5'}`}
                >
                    <option value="" className="text-black">Translate...</option>
                    {['English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese', 'Arabic', 'Japanese'].map(lang => (
                        <option key={lang} value={lang} className="text-black">{lang}</option>
                    ))}
                </select>
                {isAiLoading && <div className="p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20"><Loader2 className="w-4 h-4 animate-spin text-white" /></div>}
            </div>

            {isClosed ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-8">
                        <XCircle className="w-12 h-12" />
                    </div>
                    <h1 className="text-4xl font-black mb-4">Form Closed</h1>
                    <p className="text-xl text-gray-500 leading-relaxed">{closeReason}</p>
                    <button onClick={() => navigate('/')} className="mt-12 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold">
                        Go Home
                    </button>
                </div>
            ) : (
                <>
                <div className="fixed top-0 left-0 w-full h-1 bg-black/5 z-50">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full transition-all duration-300"
                    style={{ backgroundColor: theme.primaryColor }}
                />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 w-full max-w-3xl mx-auto relative z-10">
                {theme.logoUrl && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
                        <img src={theme.logoUrl} className="max-h-12 w-auto object-contain" alt="Brand Logo" />
                    </motion.div>
                )}

                {!isPasswordCorrect ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-xl text-center">
                        <Settings className="w-12 h-12 mx-auto mb-6 text-primary-500" />
                        <h2 className="text-2xl font-black mb-2">Protected Form</h2>
                        <p className="text-gray-400 mb-8">This form requires a password to access.</p>
                        <input 
                            type="password"
                            autoFocus
                            placeholder="Enter password..."
                            value={enteredPassword}
                            onChange={(e) => setEnteredPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && enteredPassword === form.theme.password && setIsPasswordCorrect(true)}
                            className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary-500 transition-all text-center mb-4"
                        />
                        <button 
                            onClick={() => {
                                if (enteredPassword === form.theme.password) {
                                    setIsPasswordCorrect(true);
                                } else {
                                    alert('Incorrect password');
                                }
                            }}
                            className="w-full py-4 bg-primary-600 rounded-2xl font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20"
                        >
                            Unlock Form
                        </button>
                    </motion.div>
                ) : isDone && form.theme?.isQuizMode ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full text-center space-y-8">
                        <div className="relative inline-block">
                            <motion.div 
                                initial={{ scale: 0 }} 
                                animate={{ scale: 1 }} 
                                transition={{ type: 'spring', bounce: 0.5 }}
                                className="w-48 h-48 rounded-full border-8 border-primary-500/20 flex flex-col items-center justify-center bg-white/5 backdrop-blur-3xl"
                            >
                                <p className="text-lg font-bold text-primary-500 uppercase tracking-widest">Your Score</p>
                                <h3 className="text-7xl font-black">{score}</h3>
                                <p className="text-sm font-bold text-gray-500">out of {form.questions.length}</p>
                            </motion.div>
                            <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-yellow-400 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-4xl font-black">Quiz Completed!</h2>
                            <p className="text-xl text-gray-400 max-w-md mx-auto">Great job! You've finished the quiz. Your results have been recorded.</p>
                        </div>
                        <button onClick={() => navigate('/')} className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:scale-105 transition-all">
                            Done
                        </button>
                    </motion.div>
                ) : (
                    <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ translateY: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                        className="w-full"
                    >
                        <div className="flex items-center gap-4 font-medium mb-4" style={{ color: theme.primaryColor }}>
                            <span className="flex items-center justify-center w-8 h-8 rounded-md text-sm" style={{ backgroundColor: `${theme.primaryColor}20` }}>
                                {currentIndex + 1}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-bold mb-8 leading-tight">
                            {currentQ?.label}
                        </h2>

                        {currentQ?.imageUrl && (
                            <div className="mb-8 w-full max-w-xl">
                                <img 
                                    src={currentQ.imageUrl} 
                                    className="w-full rounded-2xl shadow-lg border border-gray-100 object-contain max-h-[400px]" 
                                    alt="Question Visual" 
                                />
                            </div>
                        )}

                        <div className="mb-8 w-full max-w-xl">
                            {isAiLoading ? (
                                <div className="flex items-center gap-3 text-gray-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>AI is thinking...</span>
                                </div>
                            ) : (
                                <>
                                    {currentQ?.type === 'text' || currentQ?.type === 'email' || currentQ?.type === 'number' ? (
                                        <input
                                            autoFocus
                                            type={currentQ.type}
                                            value={answers[currentQ.label] || ''}
                                            onChange={(e) => setAnswers(a => ({ ...a, [currentQ.label]: e.target.value }))}
                                            placeholder="Type your answer here..."
                                            className={`w-full text-2xl sm:text-3xl font-medium bg-transparent border-b-2 border-opacity-20 outline-none pb-2 transition-colors placeholder:opacity-30 ${isDark ? 'border-white' : 'border-black'}`}
                                            style={{ borderColor: answers[currentQ.label] ? theme.primaryColor : undefined }}
                                        />
                                    ) : currentQ?.type === 'textarea' ? (
                                        <textarea
                                            autoFocus
                                            value={answers[currentQ.label] || ''}
                                            onChange={(e) => setAnswers(a => ({ ...a, [currentQ.label]: e.target.value }))}
                                            placeholder="Type your answer here..."
                                            className={`w-full h-40 text-xl font-medium bg-transparent border-b-2 border-opacity-20 outline-none pb-2 transition-colors resize-none placeholder:opacity-30 ${isDark ? 'border-white' : 'border-black'}`}
                                            style={{ borderColor: answers[currentQ.label] ? theme.primaryColor : undefined }}
                                        />
                                    ) : currentQ?.type === 'file-upload' ? (
                                        <div className="space-y-4">
                                            {!answers[currentQ.label] ? (
                                                <label className={`block w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-gray-50/50 ${isDark ? 'border-white/10 hover:border-primary-500/50' : 'border-gray-200 hover:border-primary-500/50'}`}>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            
                                                            setIsAiLoading(true); // Reuse loader for simplicity
                                                            try {
                                                                const fileExt = file.name.split('.').pop();
                                                                const fileName = `resp_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                                                                const filePath = `responses/${formId}/${fileName}`;
                                                                
                                                                const { error } = await supabase.storage
                                                                    .from('logos') // Use existing bucket
                                                                    .upload(filePath, file);
                                                                
                                                                if (error) throw error;
                                                                
                                                                const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
                                                                setAnswers(a => ({ ...a, [currentQ.label]: data.publicUrl }));
                                                            } catch (err) {
                                                                alert('Upload failed: ' + err.message);
                                                            } finally {
                                                                setIsAiLoading(false);
                                                            }
                                                        }}
                                                    />
                                                    <UploadCloud className="w-10 h-10 mx-auto mb-4 text-gray-400" />
                                                    <p className="text-lg font-medium">Click to upload or drag and drop</p>
                                                    <p className="text-sm text-gray-400 mt-1">Any file up to 10MB</p>
                                                </label>
                                            ) : (
                                                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary-500 bg-primary-50/50">
                                                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                                                        <FileText />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold truncate">File Uploaded</p>
                                                        <a href={answers[currentQ.label]} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">View Upload</a>
                                                    </div>
                                                    <button 
                                                        onClick={() => setAnswers(a => ({ ...a, [currentQ.label]: null }))}
                                                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (currentQ?.type === 'select' || currentQ?.type === 'multiple-choice') ? (
                                        <div className="space-y-3">
                                            {[...(currentQ.options || []), ...(currentQ.hasOther ? ['Other'] : [])].map((opt, i) => {
                                                const isMulti = currentQ.allowMultiple === true;
                                                const currentAnswers = answers[currentQ.label] || (isMulti ? [] : '');
                                                const isSelected = isMulti ? currentAnswers.includes(opt) : currentAnswers === opt;
                                                const isOther = opt === 'Other';

                                                return (
                                                    <div key={i} className="space-y-2">
                                                        <button
                                                            onClick={() => {
                                                                if (isMulti) {
                                                                    const arr = Array.isArray(currentAnswers) ? currentAnswers : [];
                                                                    if (arr.includes(opt)) {
                                                                        setAnswers(a => ({ ...a, [currentQ.label]: arr.filter(x => x !== opt) }));
                                                                    } else {
                                                                        setAnswers(a => ({ ...a, [currentQ.label]: [...arr, opt] }));
                                                                    }
                                                                } else {
                                                                    setAnswers(a => ({ ...a, [currentQ.label]: opt }));
                                                                    if (!isOther) {
                                                                        setTimeout(handleNext, 300);
                                                                    }
                                                                }
                                                            }}
                                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${isSelected ? '' : 'border-opacity-20 hover:border-opacity-50'} ${isDark ? 'bg-white/5' : ''}`}
                                                            style={{
                                                                borderColor: isSelected ? theme.primaryColor : undefined,
                                                                backgroundColor: isSelected ? `${theme.primaryColor}20` : undefined,
                                                                color: isSelected ? (isDark ? '#fff' : theme.primaryColor) : undefined
                                                            }}
                                                        >
                                                            <span className="text-lg font-medium">{opt}</span>
                                                            {isMulti ? (
                                                                <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? '' : 'border-opacity-30'}`}
                                                                    style={{
                                                                        borderColor: isSelected ? theme.primaryColor : undefined,
                                                                        backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                                                                        color: isSelected ? '#fff' : 'transparent'
                                                                    }}>
                                                                    {isSelected && <Check className="w-4 h-4" />}
                                                                </div>
                                                            ) : (
                                                                isSelected && <Check className="w-6 h-6" style={{ color: theme.primaryColor }} />
                                                            )}
                                                        </button>

                                                        {isOther && isSelected && (
                                                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pb-2">
                                                                <textarea
                                                                    autoFocus
                                                                    placeholder="Please specify..."
                                                                    value={answers[`${currentQ.label}_other`] || ''}
                                                                    onChange={(e) => setAnswers(a => ({ ...a, [`${currentQ.label}_other`]: e.target.value }))}
                                                                    className={`w-full p-3 bg-transparent border-b-2 outline-none transition-colors border-opacity-20 ${isDark ? 'border-white' : 'border-black'}`}
                                                                    style={{ borderColor: answers[`${currentQ.label}_other`] ? theme.primaryColor : undefined }}
                                                                />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : currentQ?.type === 'dropdown' ? (
                                        <div className="relative group">
                                            <select
                                                value={answers[currentQ.label] || ''}
                                                onChange={(e) => {
                                                    setAnswers(a => ({ ...a, [currentQ.label]: e.target.value }));
                                                    setTimeout(handleNext, 400);
                                                }}
                                                className={`w-full p-4 text-xl font-medium bg-transparent border-b-2 outline-none appearance-none cursor-pointer transition-all ${isDark ? 'border-white/20 hover:border-white/40' : 'border-black/20 hover:border-black/40'}`}
                                                style={{ borderBottomColor: answers[currentQ.label] ? theme.primaryColor : undefined }}
                                            >
                                                <option value="" disabled className={isDark ? 'bg-gray-900 text-gray-500' : 'bg-white text-gray-400'}>Select an option...</option>
                                                {currentQ.options?.map((opt, i) => (
                                                    <option
                                                        key={i}
                                                        value={opt}
                                                        className={isDark ? 'bg-gray-900 text-white' : 'bg-white text-black'}
                                                    >
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                                                <div className={`w-3 h-3 border-b-2 border-r-2 rotate-45 ${isDark ? 'border-white' : 'border-black'}`} />
                                            </div>
                                        </div>
                                    ) : currentQ?.type === 'nested-choice' ? (
                                        <div className="space-y-6">
                                            {(currentQ.nestedOptions || []).map((cat, i) => {
                                                const isCatActive = activeCategory === i;
                                                const currentAnswers = answers[currentQ.label] || '';

                                                // Check if this category has any selection in the string: "[CatLabel]"
                                                const catMarker = `[${cat.label}]`;
                                                const isCatSelected = currentAnswers.includes(catMarker);

                                                return (
                                                    <div key={i} className={`rounded-3xl border-2 transition-all overflow-hidden ${isDark ? 'border-white/10' : 'border-black/5'} ${isCatActive ? 'bg-white/5 border-primary-500/50' : 'hover:border-primary-500/30'} ${isCatSelected ? 'ring-2 ring-primary-500/20' : ''}`}>
                                                        <button
                                                            onClick={() => {
                                                                if (currentQ.allowMultipleCategories) {
                                                                    setActiveCategory(isCatActive ? null : i);
                                                                } else {
                                                                    setActiveCategory(isCatActive ? null : i);
                                                                    setActiveItem(null);
                                                                }
                                                            }}
                                                            className="w-full p-6 flex items-center justify-between text-left group"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${isCatActive ? 'bg-primary-500 text-white' : (isCatSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-500')}`}>
                                                                    {isCatSelected ? <Check className="w-5 h-5" /> : i + 1}
                                                                </div>
                                                                <span className="text-2xl font-black opacity-80 group-hover:opacity-100 transition-opacity">{cat.label}</span>
                                                            </div>
                                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isCatActive ? 'border-primary-500 bg-primary-500 text-white rotate-180' : 'border-gray-400 opacity-50'}`}>
                                                                <div className={`w-2.5 h-2.5 border-b-2 border-r-2 rotate-45 transform -translate-y-0.5`} />
                                                            </div>
                                                        </button>

                                                        <AnimatePresence>
                                                            {isCatActive && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="px-6 pb-6 space-y-4"
                                                                >
                                                                    {(cat.items || []).map((item, j) => {
                                                                        const isItemActive = activeItem === j;

                                                                        // Check if item is selected in the current category's part of the answer string
                                                                        const itemSelected = currentAnswers.includes(`${catMarker} ${item.label}`) || currentAnswers.includes(`, ${item.label}`);

                                                                        return (
                                                                            <div key={j} className={`rounded-2xl border-2 transition-all ${isItemActive ? 'border-blue-500/30 bg-blue-500/5' : 'border-gray-100'}`}>
                                                                                <button
                                                                                    onClick={() => setActiveItem(isItemActive ? null : j)}
                                                                                    className="w-full p-4 flex items-start justify-between text-left group"
                                                                                >
                                                                                    <div className="flex-1">
                                                                                        <span className={`font-bold text-lg transition-colors ${itemSelected ? 'text-primary-600' : 'text-gray-700 group-hover:text-blue-600'}`}>{item.label}</span>
                                                                                        {item.description && <p className="text-xs text-gray-400 mt-0.5 font-medium">{item.description}</p>}
                                                                                    </div>
                                                                                    <Plus className={`w-5 h-5 transition-transform shrink-0 mt-1 ${isItemActive ? 'rotate-45 text-blue-500' : 'text-gray-400'}`} />
                                                                                </button>

                                                                                <AnimatePresence>
                                                                                    {isItemActive && (
                                                                                        <motion.div
                                                                                            initial={{ height: 0, opacity: 0 }}
                                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                                            exit={{ height: 0, opacity: 0 }}
                                                                                            className="px-4 pb-4 space-y-3"
                                                                                        >
                                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                                {(item.variants || []).map((v, k) => {
                                                                                                    const vLabel = typeof v === 'string' ? v : v.label;
                                                                                                    const vDesc = typeof v === 'string' ? '' : v.description;

                                                                                                    // More robust selection logic for variants in the answer string
                                                                                                    const isSelected = currentAnswers.includes(`${item.label} (${vLabel})`) || currentAnswers.includes(`, ${vLabel}`);

                                                                                                    return (
                                                                                                        <button
                                                                                                            key={k}
                                                                                                            onClick={() => {
                                                                                                                let currentAns = answers[currentQ.label] || '';
                                                                                                                // Complex parsing/updating of the hierarchical answer string
                                                                                                                // String format: "[Cat] Item (V1, V2), Item2; [Cat2] Item3"

                                                                                                                const escapedV = escapeRegExp(vLabel);
                                                                                                                const escapedItem = escapeRegExp(item.label);
                                                                                                                const escapedCat = escapeRegExp(cat.label);

                                                                                                                let newAns = '';
                                                                                                                if (currentAns.includes(`[${cat.label}]`)) {
                                                                                                                    // Already has category, update it
                                                                                                                    if (currentAns.includes(`${item.label}`)) {
                                                                                                                        // Already has item, toggle variant
                                                                                                                        if (isSelected) {
                                                                                                                            // Remove variant
                                                                                                                            if (currentQ.allowMultipleVariants) {
                                                                                                                                newAns = currentAns.replace(new RegExp(`, ${escapedV}(?=[\\),])|\\(${escapedV}, |\\(${escapedV}\\)`, 'g'), (m) => m.includes('(') && m.includes(')') ? '' : (m.startsWith('(') ? '(' : ''));
                                                                                                                                // Clean up empty parens
                                                                                                                                newAns = newAns.replace(/ \(\)/g, '').replace(/, ,/g, ',');
                                                                                                                            } else {
                                                                                                                                newAns = currentAns.replace(`${item.label} (${vLabel})`, '').replace(/; ;/g, ';').trim();
                                                                                                                            }
                                                                                                                        } else {
                                                                                                                            // Add variant
                                                                                                                            if (currentQ.allowMultipleVariants) {
                                                                                                                                if (currentAns.includes(`${item.label} (`)) {
                                                                                                                                    newAns = currentAns.replace(`${item.label} (`, `${item.label} (${vLabel}, `);
                                                                                                                                } else {
                                                                                                                                    newAns = currentAns.replace(`${item.label}`, `${item.label} (${vLabel})`);
                                                                                                                                }
                                                                                                                            } else {
                                                                                                                                // Replace variant (single select)
                                                                                                                                newAns = currentAns.replace(new RegExp(`${escapedItem} \\(.*?\\)`, 'g'), `${item.label} (${vLabel})`);
                                                                                                                                if (!newAns.includes(`${item.label} (`)) newAns = currentAns.replace(`${item.label}`, `${item.label} (${vLabel})`);
                                                                                                                            }
                                                                                                                        }
                                                                                                                    } else {
                                                                                                                        // New item in existing category
                                                                                                                        if (currentQ.allowMultipleItems) {
                                                                                                                            newAns = currentAns.replace(`${catMarker}`, `${catMarker} ${item.label} (${vLabel}),`);
                                                                                                                        } else {
                                                                                                                            // Replace items in this category
                                                                                                                            newAns = currentAns.replace(new RegExp(`\\[${escapedCat}\\].*?(?=;|$)`, 'g'), `${catMarker} ${item.label} (${vLabel})`);
                                                                                                                        }
                                                                                                                    }
                                                                                                                } else {
                                                                                                                    // New category
                                                                                                                    if (currentQ.allowMultipleCategories) {
                                                                                                                        newAns = currentAns + (currentAns ? '; ' : '') + `${catMarker} ${item.label} (${vLabel})`;
                                                                                                                    } else {
                                                                                                                        newAns = `${catMarker} ${item.label} (${vLabel})`;
                                                                                                                    }
                                                                                                                }

                                                                                                                // Clean up commas/semicolons
                                                                                                                newAns = newAns.replace(/, ,/g, ', ').replace(/, \)/g, ')').replace(/,;/g, ';').replace(/; ;/g, '; ').replace(/,$/g, '').trim();

                                                                                                                setAnswers(a => ({ ...a, [currentQ.label]: newAns }));

                                                                                                                // Auto advance if NO multi-select is enabled anywhere
                                                                                                                if (!currentQ.allowMultipleCategories && !currentQ.allowMultipleItems && !currentQ.allowMultipleVariants) {
                                                                                                                    setTimeout(handleNext, 400);
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`p-3 rounded-xl flex flex-col items-start text-left transition-all ${isSelected ? 'bg-primary-500 text-white font-bold shadow-lg shadow-primary-500/20' : 'bg-white border-2 border-gray-100 hover:border-primary-500/30'}`}
                                                                                                        >
                                                                                                            <div className="w-full flex items-center justify-between">
                                                                                                                <span className="text-sm font-black">{vLabel}</span>
                                                                                                                {isSelected && <Check className="w-4 h-4" />}
                                                                                                            </div>
                                                                                                            {vDesc && <p className={`text-[10px] mt-1 font-medium leading-tight ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{vDesc}</p>}
                                                                                                        </button>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}

                                            {(currentQ.allowMultipleCategories || currentQ.allowMultipleItems || currentQ.allowMultipleVariants) && (
                                                <motion.button
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    onClick={handleNext}
                                                    disabled={!answers[currentQ.label]}
                                                    className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black text-xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50 disabled:grayscale"
                                                >
                                                    Next / OK
                                                </motion.button>
                                            )}
                                        </div>
                                    ) : currentQ?.type === 'yes-no' ? (
                                        <div className="flex gap-4">
                                            {['Yes', 'No'].map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => {
                                                        setAnswers(a => ({ ...a, [currentQ.label]: opt }));
                                                        setTimeout(handleNext, 300);
                                                    }}
                                                    className={`flex-1 p-6 rounded-xl border-2 transition-all text-center text-xl font-bold ${answers[currentQ.label] === opt ? '' : 'border-opacity-20 hover:border-opacity-50'} ${isDark ? 'bg-white/5' : ''}`}
                                                    style={{
                                                        borderColor: answers[currentQ.label] === opt ? theme.primaryColor : undefined,
                                                        backgroundColor: answers[currentQ.label] === opt ? `${theme.primaryColor}20` : undefined,
                                                        color: answers[currentQ.label] === opt ? (isDark ? '#fff' : theme.primaryColor) : undefined
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    ) : currentQ?.type === 'rating' ? (
                                        <div className="flex gap-2 sm:gap-4 justify-center">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    onClick={() => {
                                                        setAnswers(a => ({ ...a, [currentQ.label]: star }));
                                                        setTimeout(handleNext, 300);
                                                    }}
                                                    className="focus:outline-none transition-transform hover:scale-110"
                                                >
                                                    <Star
                                                        className={`w-12 h-12 sm:w-16 sm:h-16 ${answers[currentQ.label] >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 hover:text-yellow-200'}`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    ) : currentQ?.type === 'opinion-scale' ? (
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => {
                                                        setAnswers(a => ({ ...a, [currentQ.label]: num }));
                                                        setTimeout(handleNext, 300);
                                                    }}
                                                    className={`w-10 h-12 sm:w-14 sm:h-16 rounded-lg border-2 text-lg sm:text-xl font-bold transition-all ${answers[currentQ.label] === num ? '' : 'border-opacity-20 hover:border-opacity-50'} ${isDark ? 'bg-white/5' : ''}`}
                                                    style={{
                                                        borderColor: answers[currentQ.label] === num ? theme.primaryColor : undefined,
                                                        backgroundColor: answers[currentQ.label] === num ? theme.primaryColor : 'transparent',
                                                        color: answers[currentQ.label] === num ? '#fff' : undefined
                                                    }}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                            <div className="w-full flex justify-between px-2 text-sm text-gray-400 font-medium mt-2">
                                                <span>Not likely at all</span>
                                                <span>Extremely likely</span>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {['text', 'email', 'number', 'textarea', 'multiple-choice', 'select', 'dropdown', 'nested-choice', 'welcome-screen'].includes(currentQ?.type) && (
                                <button
                                    onClick={handleNext}
                                    disabled={isSubmitting || isAiLoading}
                                    className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                                    style={{ backgroundColor: theme.primaryColor }}
                                >
                                    {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> :
                                        currentQ.type === 'welcome-screen' ? 'Start' :
                                            (currentIndex === form.questions.length - 1 ? 'Submit' : 'OK')}
                                    {!isSubmitting && currentIndex < form.questions.length - 1 && currentQ.type !== 'welcome-screen' && <Check className="w-5 h-5" />}
                                </button>
                            )}
                            <span className="text-xs text-gray-400 font-medium tracking-wider flex items-center gap-1">
                                press <strong className={`font-bold px-2 py-1 rounded ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-600'}`}>Enter ↵</strong>
                            </span>
                        </div>
                    </motion.div>
                </AnimatePresence>
                )}
            </div>

            <div className="fixed bottom-0 right-0 p-4 sm:p-8 flex gap-2 z-50">
                <button onClick={handlePrev} disabled={history.length <= 1 || isSubmitting} className={`p-3 rounded-lg transition-colors disabled:opacity-30 ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button onClick={handleNext} disabled={isSubmitting || isAiLoading} className={`p-3 rounded-lg transition-colors disabled:opacity-30 ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
            </>
            )}
        </div>
    );
}
