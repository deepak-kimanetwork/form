import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getFormById, saveResponseLocal } from '../utils/storage';
import { Check, ArrowRight, ArrowLeft, Loader2, Star } from 'lucide-react';

export default function PublicForm() {
    const { formId } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [history, setHistory] = useState([0]); // Stack of visited indices
    const [answers, setAnswers] = useState({});
    const [direction, setDirection] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const [isDone, setIsDone] = useState(false);
    const [summary, setSummary] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const fetchForm = async () => {
            const f = await getFormById(formId);
            if (f) {
                setForm(f);
            } else {
                alert('Form not found');
                navigate('/');
            }
        };
        fetchForm();
    }, [formId, navigate]);

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

            await fetch(`${apiUrl}/api/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formId: form.id,
                    answers,
                    webhookUrl: form.theme?.googleSheetWebhookUrl
                })
            });

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
                                    ) : (currentQ?.type === 'select' || currentQ?.type === 'multiple-choice') ? (
                                        <div className="space-y-3">
                                            {currentQ.options?.map((opt, i) => {
                                                const isMulti = currentQ.allowMultiple === true;
                                                const currentAnswers = answers[currentQ.label] || (isMulti ? [] : '');
                                                const isSelected = isMulti ? currentAnswers.includes(opt) : currentAnswers === opt;

                                                return (
                                                    <button
                                                        key={i}
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
                                                                setTimeout(handleNext, 300);
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
                                                );
                                            })}
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
                            {['text', 'email', 'number', 'textarea', 'multiple-choice', 'welcome-screen'].includes(currentQ?.type) && (
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
            </div>

            <div className="fixed bottom-0 right-0 p-4 sm:p-8 flex gap-2 z-50">
                <button onClick={handlePrev} disabled={history.length <= 1 || isSubmitting} className={`p-3 rounded-lg transition-colors disabled:opacity-30 ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button onClick={handleNext} disabled={isSubmitting || isAiLoading} className={`p-3 rounded-lg transition-colors disabled:opacity-30 ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
