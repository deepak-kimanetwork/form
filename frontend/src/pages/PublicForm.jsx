import { useState, useEffect } from 'react';
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
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        const f = getFormById(formId);
        if (f) {
            setForm(f);
        } else {
            // Not found
            alert('Form not found');
            navigate('/');
        }
    }, [formId, navigate]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !isSubmitting && !isDone && form) {
                const currentQ = form.questions[currentIndex];
                if (currentQ.type !== 'textarea') {
                    e.preventDefault();
                    handleNext();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, isSubmitting, isDone, form, answers]);

    if (!form) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

    const currentQ = form.questions[currentIndex];
    const progress = ((currentIndex) / form.questions.length) * 100;

    const handleNext = () => {
        const currentAnswer = answers[currentQ.label];

        // Validation 
        if (currentQ.required) {
            const isEmpty = !currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0);
            if (isEmpty) {
                alert('This field is required!');
                return;
            }
        }

        // Evaluate Logic Jumps
        let targetIndex = currentIndex + 1; // Default next
        if (currentQ.logic && currentQ.logic.length > 0) {
            for (const rule of currentQ.logic) {
                if (!rule.target) continue;

                let match = false;
                const ansStr = String(currentAnswer || '').toLowerCase();
                const valStr = String(rule.value || '').toLowerCase();

                if (rule.condition === 'equals' && ansStr === valStr) match = true;
                if (rule.condition === 'not_equals' && ansStr !== valStr) match = true;
                if (rule.condition === 'contains' && ansStr.includes(valStr)) match = true;

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

    const handlePrev = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop(); // Remove current
            const prevIndex = newHistory[newHistory.length - 1];

            setDirection(-1);
            setCurrentIndex(prevIndex);
            setHistory(newHistory);
        }
    };

    useEffect(() => {
        if (form && form.theme) {
            document.body.style.backgroundColor = form.theme.backgroundColor || '#ffffff';
            document.body.style.color = form.theme.textColor || '#111827';
            document.body.style.fontFamily = form.theme.fontFamily || 'Inter, sans-serif';
        }
        return () => {
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
            document.body.style.fontFamily = '';
        }
    }, [form]);

    if (!form) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

    const theme = form.theme || { primaryColor: '#22c55e', backgroundColor: '#ffffff', textColor: '#111827' };

    const submitForm = async () => {
        setIsSubmitting(true);
        try {
            // Check for redirect URL
            if (form.redirectUrl) {
                window.location.href = form.redirectUrl;
                return;
            }

            // Post to Google Sheets webhook backend
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            await fetch(`${apiUrl}/api/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formId: form.id, answers })
            });

            // Save locally for dashboard
            saveResponseLocal({ formId: form.id, answers, timestamp: new Date().toISOString() });
            setIsDone(true);
        } catch (err) {
            console.error(err);
            alert('Failed to submit form.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isDone) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl" style={{ backgroundColor: theme.primaryColor }}>
                        <Check className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4">{form.thankYouTitle || "You're all set!"}</h1>
                    <p className="text-lg max-w-md mx-auto opacity-70">{form.thankYouMessage || "Your responses have been recorded successfully. Thank you for your time."}</p>
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
        <div className="min-h-screen flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor, fontFamily: theme.fontFamily }}>
            {/* Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-1 bg-black/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full transition-all duration-300"
                    style={{ backgroundColor: theme.primaryColor }}
                />
            </div>

            <div className="flex-1 flex items-center justify-center p-4 sm:p-8 w-full max-w-3xl mx-auto relative">
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
                            {currentQ.label}
                        </h2>

                        <div className="mb-8 w-full max-w-xl">
                            {currentQ.type === 'text' || currentQ.type === 'email' || currentQ.type === 'number' ? (
                                <input
                                    autoFocus
                                    type={currentQ.type}
                                    value={answers[currentQ.label] || ''}
                                    onChange={(e) => setAnswers(a => ({ ...a, [currentQ.label]: e.target.value }))}
                                    placeholder="Type your answer here..."
                                    className="w-full text-2xl sm:text-3xl font-medium bg-transparent border-b-2 border-opacity-20 outline-none pb-2 transition-colors placeholder:opacity-30"
                                    style={{ borderColor: answers[currentQ.label] ? theme.primaryColor : undefined, color: theme.textColor }}
                                />
                            ) : currentQ.type === 'textarea' ? (
                                <textarea
                                    autoFocus
                                    value={answers[currentQ.label] || ''}
                                    onChange={(e) => setAnswers(a => ({ ...a, [currentQ.label]: e.target.value }))}
                                    placeholder="Type your answer here..."
                                    className="w-full h-40 text-xl font-medium bg-transparent border-b-2 border-opacity-20 outline-none pb-2 transition-colors resize-none placeholder:opacity-30"
                                    style={{ borderColor: answers[currentQ.label] ? theme.primaryColor : undefined, color: theme.textColor }}
                                />
                            ) : currentQ.type === 'select' ? (
                                <div className="space-y-3">
                                    {currentQ.options?.map((opt, i) => {
                                        const isSelected = answers[currentQ.label] === opt;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setAnswers(a => ({ ...a, [currentQ.label]: opt }));
                                                    setTimeout(handleNext, 300); // auto-advance on select
                                                }}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${isSelected ? '' : 'border-opacity-20 hover:border-opacity-50'}`}
                                                style={{
                                                    borderColor: isSelected ? theme.primaryColor : undefined,
                                                    backgroundColor: isSelected ? `${theme.primaryColor}10` : 'transparent',
                                                    color: isSelected ? theme.primaryColor : theme.textColor
                                                }}
                                            >
                                                <span className="text-lg font-medium">{opt}</span>
                                                {isSelected && <Check className="w-6 h-6" style={{ color: theme.primaryColor }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : currentQ.type === 'multiple-choice' ? (
                                <div className="space-y-3">
                                    {currentQ.options?.map((opt, i) => {
                                        const currentAnswers = answers[currentQ.label] || [];
                                        const isSelected = currentAnswers.includes(opt);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setAnswers(a => {
                                                        const arr = a[currentQ.label] || [];
                                                        if (arr.includes(opt)) {
                                                            return { ...a, [currentQ.label]: arr.filter(x => x !== opt) };
                                                        } else {
                                                            return { ...a, [currentQ.label]: [...arr, opt] };
                                                        }
                                                    });
                                                }}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${isSelected ? '' : 'border-opacity-20 hover:border-opacity-50'}`}
                                                style={{
                                                    borderColor: isSelected ? theme.primaryColor : undefined,
                                                    backgroundColor: isSelected ? `${theme.primaryColor}10` : 'transparent',
                                                    color: isSelected ? theme.primaryColor : theme.textColor
                                                }}
                                            >
                                                <span className="text-lg font-medium">{opt}</span>
                                                <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? '' : 'border-opacity-30'}`}
                                                    style={{
                                                        borderColor: isSelected ? theme.primaryColor : undefined,
                                                        backgroundColor: isSelected ? theme.primaryColor : 'transparent',
                                                        color: isSelected ? '#fff' : 'transparent'
                                                    }}>
                                                    {isSelected && <Check className="w-4 h-4" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : currentQ.type === 'yes-no' ? (
                                <div className="flex gap-4">
                                    {['Yes', 'No'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => {
                                                setAnswers(a => ({ ...a, [currentQ.label]: opt }));
                                                setTimeout(handleNext, 300);
                                            }}
                                            className={`flex-1 p-6 rounded-xl border-2 transition-all text-center text-xl font-bold ${answers[currentQ.label] === opt ? '' : 'border-opacity-20 hover:border-opacity-50'}`}
                                            style={{
                                                borderColor: answers[currentQ.label] === opt ? theme.primaryColor : undefined,
                                                backgroundColor: answers[currentQ.label] === opt ? `${theme.primaryColor}10` : 'transparent',
                                                color: answers[currentQ.label] === opt ? theme.primaryColor : theme.textColor
                                            }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            ) : currentQ.type === 'rating' ? (
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
                            ) : currentQ.type === 'opinion-scale' ? (
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => {
                                                setAnswers(a => ({ ...a, [currentQ.label]: num }));
                                                setTimeout(handleNext, 300);
                                            }}
                                            className={`w-10 h-12 sm:w-14 sm:h-16 rounded-lg border-2 text-lg sm:text-xl font-bold transition-all ${answers[currentQ.label] === num ? '' : 'border-opacity-20 hover:border-opacity-50'}`}
                                            style={{
                                                borderColor: answers[currentQ.label] === num ? theme.primaryColor : undefined,
                                                backgroundColor: answers[currentQ.label] === num ? theme.primaryColor : 'transparent',
                                                color: answers[currentQ.label] === num ? '#fff' : theme.textColor
                                            }}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <div className="w-full flex justify-between px-2 text-sm text-gray-500 font-medium mt-2">
                                        <span>Not likely at all</span>
                                        <span>Extremely likely</span>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {['text', 'email', 'number', 'textarea', 'multiple-choice', 'welcome-screen'].includes(currentQ.type) && (
                                <button
                                    onClick={handleNext}
                                    disabled={isSubmitting}
                                    className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> :
                                        currentQ.type === 'welcome-screen' ? 'Start' :
                                            (currentIndex === form.questions.length - 1 ? 'Submit' : 'OK')}
                                    {!isSubmitting && currentIndex < form.questions.length - 1 && currentQ.type !== 'welcome-screen' && <Check className="w-5 h-5" />}
                                </button>
                            )}
                            <span className="text-xs text-gray-400 font-medium tracking-wider flex items-center gap-1">
                                press <strong className="font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">Enter ↵</strong>
                            </span>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="fixed bottom-0 right-0 p-4 sm:p-8 flex gap-2">
                <button onClick={handlePrev} disabled={history.length <= 1 || isSubmitting} className="p-3 bg-black/5 hover:bg-black/10 rounded-lg transition-colors disabled:opacity-30">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button onClick={handleNext} disabled={isSubmitting} className="p-3 bg-black/5 hover:bg-black/10 rounded-lg transition-colors disabled:opacity-30">
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
