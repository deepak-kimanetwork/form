import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getFormById, saveForm, getResponses } from '../utils/storage';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ArrowLeft, GripVertical, Plus, Trash2, Save, Play,
    GitMerge, Settings, Download, Layout, BarChart3,
    Image as ImageIcon, Type, Palette, Smartphone, Laptop,
    Share2, Copy, Loader2, Link as LinkIcon, CheckCircle2, XCircle, Search,
    Database, Sparkles, Info, FileText, ExternalLink
} from 'lucide-react';
import AnalyticsView from '../components/AnalyticsView';
import WorkflowEditor from '../components/WorkflowEditor';
import { supabase } from '../utils/supabase';
import { checkCustomUrl } from '../utils/storage';
import { motion, AnimatePresence } from 'framer-motion';

const questionTypes = ['text', 'email', 'number', 'select', 'dropdown', 'textarea', 'multiple-choice', 'rating', 'opinion-scale', 'welcome-screen', 'yes-no', 'nested-choice'];

function SortableItem({ id, question, allQuestions, updateQuestion, removeQuestion }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="bg-white border text-left border-gray-200 rounded-xl p-5 mb-4 shadow-sm group">
            <div className="flex gap-4 items-start">
                <div {...attributes} {...listeners} className="mt-2 text-gray-400 cursor-grab hover:text-gray-600">
                    <GripVertical className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-4">
                    <input
                        type="text"
                        value={question.label}
                        onChange={(e) => updateQuestion(id, 'label', e.target.value)}
                        placeholder="Question Text"
                        className="w-full text-lg font-medium outline-none border-b border-transparent hover:border-gray-300 focus:border-primary-500 pb-1"
                    />

                    <div className="flex flex-wrap items-center gap-4 mb-3">
                        <select
                            value={question.type}
                            onChange={(e) => updateQuestion(id, 'type', e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-100 transition-all capitalize"
                        >
                            {questionTypes.map(t => (
                                <option key={t} value={t}>{t.replace('-', ' ')}</option>
                            ))}
                        </select>

                        {['select', 'multiple-choice', 'dropdown'].includes(question.type) && (
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={question.allowMultiple || false}
                                        onChange={(e) => updateQuestion(id, 'allowMultiple', e.target.checked)}
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${question.allowMultiple ? 'bg-primary-600' : 'bg-gray-300'}`} />
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${question.allowMultiple ? 'translate-x-5' : ''}`} />
                                </div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">Multiple Selection</span>
                            </label>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={question.required}
                                onChange={(e) => updateQuestion(id, 'required', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-gray-600">Required</span>
                        </label>

                        {['select', 'multiple-choice'].includes(question.type) && (
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={question.hasOther || false}
                                        onChange={(e) => updateQuestion(id, 'hasOther', e.target.checked)}
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${question.hasOther ? 'bg-orange-500' : 'bg-gray-300'}`} />
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${question.hasOther ? 'translate-x-5' : ''}`} />
                                </div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">Include "Other"</span>
                            </label>
                        )}
                    </div>

                    {(question.type === 'select' || question.type === 'multiple-choice' || question.type === 'dropdown') && (
                        <div className="pt-2">
                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Options</p>
                            {question.options?.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...question.options];
                                            newOpts[idx] = e.target.value;
                                            updateQuestion(id, 'options', newOpts);
                                        }}
                                        className="flex-1 text-sm border-b border-transparent hover:border-gray-300 focus:border-primary-500 pb-1 outline-none"
                                    />
                                    <button onClick={() => {
                                        const newOpts = question.options.filter((_, i) => i !== idx);
                                        updateQuestion(id, 'options', newOpts);
                                    }} className="text-gray-400 hover:text-red-500">
                                        &times;
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => {
                                const newOpts = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
                                updateQuestion(id, 'options', newOpts);
                            }} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                + Add Option
                            </button>
                        </div>
                    )}

                    {question.type === 'nested-choice' && (
                        <div className="pt-2 space-y-6">
                            <div className="flex flex-wrap items-center gap-6 pb-2 border-b border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Multi-Select Toggles</p>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={question.allowMultipleCategories || false}
                                        onChange={(e) => updateQuestion(id, 'allowMultipleCategories', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                                    />
                                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-primary-600 transition-colors uppercase tracking-tight">Categories</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={question.allowMultipleItems || false}
                                        onChange={(e) => updateQuestion(id, 'allowMultipleItems', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                                    />
                                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-primary-600 transition-colors uppercase tracking-tight">Items</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={question.allowMultipleVariants || false}
                                        onChange={(e) => updateQuestion(id, 'allowMultipleVariants', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                                    />
                                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-primary-600 transition-colors uppercase tracking-tight">Variants</span>
                                </label>
                            </div>

                            {(question.nestedOptions || []).map((cat, catIdx) => (
                                <div key={catIdx} className="p-4 border-2 border-gray-100 rounded-2xl bg-white shadow-sm space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xs">{catIdx + 1}</div>
                                        <input
                                            type="text"
                                            value={cat.label}
                                            onChange={(e) => {
                                                const newNested = [...question.nestedOptions];
                                                newNested[catIdx].label = e.target.value;
                                                updateQuestion(id, 'nestedOptions', newNested);
                                            }}
                                            placeholder="Category (e.g. Fruits)"
                                            className="flex-1 text-sm font-black bg-transparent border-b-2 border-transparent focus:border-primary-500 outline-none pb-1 transition-all"
                                        />
                                        <button onClick={() => {
                                            const newNested = question.nestedOptions.filter((_, i) => i !== catIdx);
                                            updateQuestion(id, 'nestedOptions', newNested);
                                        }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remove Category">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="pl-10 space-y-4 border-l-2 border-gray-50">
                                        {(cat.items || []).map((item, itemIdx) => (
                                            <div key={itemIdx} className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 space-y-1">
                                                        <input
                                                            type="text"
                                                            value={item.label}
                                                            onChange={(e) => {
                                                                const newNested = [...question.nestedOptions];
                                                                newNested[catIdx].items[itemIdx].label = e.target.value;
                                                                updateQuestion(id, 'nestedOptions', newNested);
                                                            }}
                                                            placeholder="Item Label (e.g. Apple)"
                                                            className="w-full text-xs font-bold bg-transparent border-b border-gray-200 focus:border-primary-500 outline-none transition-all"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={item.description || ''}
                                                            onChange={(e) => {
                                                                const newNested = [...question.nestedOptions];
                                                                newNested[catIdx].items[itemIdx].description = e.target.value;
                                                                updateQuestion(id, 'nestedOptions', newNested);
                                                            }}
                                                            placeholder="Item Description (Optional)"
                                                            className="w-full text-[10px] text-gray-400 bg-transparent border-b border-transparent focus:border-primary-300 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <button onClick={() => {
                                                        const newNested = [...question.nestedOptions];
                                                        newNested[catIdx].items = newNested[catIdx].items.filter((_, i) => i !== itemIdx);
                                                        updateQuestion(id, 'nestedOptions', newNested);
                                                    }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remove Item">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div className="pl-4 space-y-2">
                                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Variants</div>
                                                    {(item.variants || []).map((variant, vIdx) => (
                                                        <div key={vIdx} className="space-y-1 p-2 bg-white/50 rounded-lg border border-gray-100 flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary-300 mt-1.5 shrink-0"></div>
                                                            <div className="flex-1 space-y-1">
                                                                <input
                                                                    type="text"
                                                                    value={typeof variant === 'string' ? variant : variant.label}
                                                                    onChange={(e) => {
                                                                        const newNested = [...question.nestedOptions];
                                                                        if (typeof newNested[catIdx].items[itemIdx].variants[vIdx] === 'string') {
                                                                            newNested[catIdx].items[itemIdx].variants[vIdx] = { label: e.target.value, description: '' };
                                                                        } else {
                                                                            newNested[catIdx].items[itemIdx].variants[vIdx].label = e.target.value;
                                                                        }
                                                                        updateQuestion(id, 'nestedOptions', newNested);
                                                                    }}
                                                                    placeholder="Variant Label (e.g. Kashmiri)"
                                                                    className="w-full text-xs bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary-500 outline-none pb-0.5 transition-all font-bold"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={variant.description || ''}
                                                                    onChange={(e) => {
                                                                        const newNested = [...question.nestedOptions];
                                                                        if (typeof newNested[catIdx].items[itemIdx].variants[vIdx] === 'string') {
                                                                            newNested[catIdx].items[itemIdx].variants[vIdx] = { label: newNested[catIdx].items[itemIdx].variants[vIdx], description: e.target.value };
                                                                        } else {
                                                                            newNested[catIdx].items[itemIdx].variants[vIdx].description = e.target.value;
                                                                        }
                                                                        updateQuestion(id, 'nestedOptions', newNested);
                                                                    }}
                                                                    placeholder="Variant Description (Optional)"
                                                                    className="w-full text-[9px] text-gray-400 bg-transparent border-b border-transparent focus:border-primary-200 outline-none transition-all"
                                                                />
                                                            </div>
                                                            <button onClick={() => {
                                                                const newNested = [...question.nestedOptions];
                                                                newNested[catIdx].items[itemIdx].variants = newNested[catIdx].items[itemIdx].variants.filter((_, i) => i !== vIdx);
                                                                updateQuestion(id, 'nestedOptions', newNested);
                                                            }} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-md transition-all shrink-0" title="Remove Variant">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newNested = [...question.nestedOptions];
                                                            const variants = newNested[catIdx].items[itemIdx].variants || [];
                                                            newNested[catIdx].items[itemIdx].variants = [...variants, { label: `Variant ${variants.length + 1}`, description: '' }];
                                                            updateQuestion(id, 'nestedOptions', newNested);
                                                        }}
                                                        className="text-[10px] font-bold text-primary-500 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded-md"
                                                    >
                                                        + Add Variant
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const newNested = [...question.nestedOptions];
                                                newNested[catIdx].items = [...(newNested[catIdx].items || []), { label: `Item ${(newNested[catIdx].items?.length || 0) + 1}`, description: '', variants: [] }];
                                                updateQuestion(id, 'nestedOptions', newNested);
                                            }}
                                            className="text-xs font-bold text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => {
                                const newNested = [...(question.nestedOptions || []), { label: `Category ${(question.nestedOptions?.length || 0) + 1}`, items: [] }];
                                updateQuestion(id, 'nestedOptions', newNested);
                            }} className="w-full py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold hover:bg-gray-100 hover:border-gray-300 transition-all">
                                + Add Category
                            </button>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <GitMerge className="w-4 h-4 text-gray-500" />
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Logic Jumps</p>
                        </div>
                        {question.logic?.map((rule, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="text-sm text-gray-500">If answer</span>
                                <select
                                    value={rule.condition}
                                    onChange={(e) => {
                                        const newLogic = [...question.logic];
                                        newLogic[idx].condition = e.target.value;
                                        updateQuestion(id, 'logic', newLogic);
                                    }}
                                    className="text-sm bg-white border border-gray-200 rounded p-1 outline-none"
                                >
                                    <option value="equals">equals</option>
                                    <option value="not_equals">does not equal</option>
                                    <option value="contains">contains</option>
                                    <option value="greater_than">greater than</option>
                                    <option value="less_than">less than</option>
                                </select>
                                <input
                                    type="text"
                                    value={rule.value}
                                    onChange={(e) => {
                                        const newLogic = [...question.logic];
                                        newLogic[idx].value = e.target.value;
                                        updateQuestion(id, 'logic', newLogic);
                                    }}
                                    placeholder="value"
                                    className="text-sm bg-white border border-gray-200 rounded p-1 outline-none w-24 sm:w-32"
                                />
                                <span className="text-sm text-gray-500">jump to</span>
                                <select
                                    value={rule.target || ''}
                                    onChange={(e) => {
                                        const newLogic = [...question.logic];
                                        newLogic[idx].target = e.target.value;
                                        updateQuestion(id, 'logic', newLogic);
                                    }}
                                    className="text-sm bg-white border border-gray-200 rounded p-1 outline-none flex-1"
                                >
                                    <option value="">Select Question...</option>
                                    {allQuestions.filter(q => q.id !== id).map(q => (
                                        <option key={q.id} value={q.id}>{q.label || '(Untitled)'}</option>
                                    ))}
                                </select>
                                <button onClick={() => {
                                    const newLogic = question.logic.filter((_, i) => i !== idx);
                                    updateQuestion(id, 'logic', newLogic);
                                }} className="text-gray-400 hover:text-red-500 p-1">
                                    &times;
                                </button>
                            </div>
                        ))}
                        <button onClick={() => {
                            const newLogic = [...(question.logic || []), { condition: 'equals', value: '', target: '' }];
                            updateQuestion(id, 'logic', newLogic);
                        }} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                            + Add Logic Jump
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => duplicateQuestion(id)} className="text-gray-400 hover:text-primary-600" title="Duplicate Question">
                        <Copy className="w-5 h-5" />
                    </button>
                    <button onClick={() => removeQuestion(id)} className="text-gray-400 hover:text-red-500" title="Remove Question">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export default function FormBuilder() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('editor'); // editor, workflow, analytics
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        id: `form_${Date.now()}`,
        title: 'Untitled Form',
        custom_url: '',
        theme: {
            primaryColor: '#22c55e',
            backgroundColor: '#ffffff',
            textColor: '#111827',
            fontFamily: 'Inter',
            logoUrl: '',
            backgroundImageUrl: '',
            mode: 'light'
        },
        sections: [{ id: 'sec_1', title: 'Main Section' }],
        questions: []
    });
    const [responses, setResponses] = useState([]);
    const [showThemeSettings, setShowThemeSettings] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareLevel, setShareLevel] = useState('none');
    const [shareId, setShareId] = useState('');
    const [devicePreview, setDevicePreview] = useState('desktop');
    const [isUploading, setIsUploading] = useState(false);
    const [urlAvailable, setUrlAvailable] = useState(null);
    const [checkingUrl, setCheckingUrl] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [previewAnswers, setPreviewAnswers] = useState({});
    const [previewExpandedCat, setPreviewExpandedCat] = useState(null);
    const [availableSheets, setAvailableSheets] = useState([]);
    const [loadingSheets, setLoadingSheets] = useState(false);
    const [showSheetPicker, setShowSheetPicker] = useState(false);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
                const { tokens } = event.data;
                setForm(f => ({ ...f, theme: { ...f.theme, googleTokens: tokens } }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const fetchAvailableSheets = async () => {
        if (!form.theme?.googleTokens) return;
        setLoadingSheets(true);
        try {
            const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
            const res = await fetch(`${apiUrl}/api/list-sheets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens: form.theme.googleTokens })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAvailableSheets(data || []);
            setShowSheetPicker(true);
        } catch (error) {
            console.error('Error fetching sheets:', error);
            alert('Failed to load sheets: ' + error.message);
        } finally {
            setLoadingSheets(false);
        }
    };

    const handleCreateSheet = async () => {
        if (!form.theme?.googleTokens) return;
        setLoadingSheets(true);
        try {
            const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
            const headers = (form.questions || []).map(q => q.label || q.title || 'Untitled Question');
            const res = await fetch(`${apiUrl}/api/create-sheet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokens: form.theme.googleTokens,
                    title: form.title || 'Untitled Form',
                    headers
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setForm(f => ({ ...f, theme: { ...f.theme, googleSheetId: data.spreadsheetId } }));
            alert('Successfully created and linked new sheet!');
        } catch (error) {
            console.error('Error creating sheet:', error);
            alert('Failed to create sheet: ' + error.message);
        } finally {
            setLoadingSheets(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (form.id) {
            const fetchResponses = async () => {
                const res = await getResponses(form.id);
                setResponses(res || []);
            };
            fetchResponses();
        }
    }, [form.id, activeTab]);

    useEffect(() => {
        const shareToken = searchParams.get('share');

        if (shareToken) {
            const fetchShared = async () => {
                const existing = await getFormById(shareToken, true);
                if (existing) {
                    const normalizedSections = (existing.sections && existing.sections.length > 0)
                        ? existing.sections
                        : [{ id: 'sec_1', title: 'Main Section' }];

                    setForm({
                        ...existing,
                        sections: normalizedSections,
                        questions: (existing.questions || []).map(q => ({
                            ...q,
                            sectionId: normalizedSections.some(s => s.id === q.sectionId)
                                ? q.sectionId
                                : normalizedSections[0].id
                        }))
                    });
                    setShareId(existing.edit_token);
                    setShareLevel(existing.sharing_level);
                } else {
                    alert('Invalid or expired share link');
                    navigate('/');
                }
            };
            fetchShared();
        } else if (location.state?.formId) {
            const fetchExisting = async () => {
                const existing = await getFormById(location.state.formId);
                if (existing) {
                    const normalizedSections = (existing.sections && existing.sections.length > 0)
                        ? existing.sections
                        : [{ id: 'sec_1', title: 'Main Section' }];

                    setForm({
                        ...existing,
                        sections: normalizedSections,
                        questions: (existing.questions || []).map(q => ({
                            ...q,
                            sectionId: normalizedSections.some(s => s.id === q.sectionId)
                                ? q.sectionId
                                : normalizedSections[0].id
                        }))
                    });
                    setShareId(existing.sharing_id || '');
                    setShareLevel(existing.sharing_level || 'none');
                }
            };
            fetchExisting();
        } else if (location.state?.generatedSchema) {
            const schema = location.state.generatedSchema;
            const normalizedSections = schema.sections || [{ id: 'sec_1', title: 'Main Section' }];
            setForm({
                id: `form_${Date.now()}`,
                title: schema.title || 'Generated Form',
                theme: { ...form.theme, ...schema.theme },
                sections: normalizedSections,
                questions: schema.questions.map(q => ({
                    id: q.id || `q_${Math.random().toString(36).substr(2, 9)}`,
                    sectionId: q.sectionId || normalizedSections[0].id,
                    label: q.label || '',
                    type: q.type || 'text',
                    required: q.required || false,
                    options: q.options || ((q.type === 'select' || q.type === 'multiple-choice') ? ['Option 1'] : undefined),
                    logic: q.logic || []
                }))
            });
        }
    }, [location]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setForm((form) => {
                const oldIndex = form.questions.findIndex((q) => q.id === active.id);
                const newIndex = form.questions.findIndex((q) => q.id === over.id);
                const newQuestions = arrayMove(form.questions, oldIndex, newIndex);
                return { ...form, questions: newQuestions };
            });
        }
    };

    const updateQuestion = (id, field, value) => {
        setForm(f => ({
            ...f,
            questions: f.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
        }));
    };

    const removeQuestion = (id) => {
        setForm(f => ({
            ...f,
            questions: f.questions.filter(q => q.id !== id)
        }));
    };

    const addQuestion = (sectionId = 'sec_1', atTop = false) => {
        const newQ = {
            id: `q_${Math.random().toString(36).substr(2, 9)}`,
            sectionId,
            label: 'New Question',
            type: 'text',
            required: false,
            logic: []
        };
        setForm(f => ({
            ...f,
            questions: atTop ? [newQ, ...f.questions] : [...f.questions, newQ]
        }));

        if (!atTop) {
            setTimeout(() => {
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }, 100);
        }
    };

    const generateAiQuestions = async () => {
        if (!aiPrompt.trim()) return;
        setIsGeneratingAi(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/generate-more`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    currentQuestions: form.questions,
                    formTitle: form.title
                })
            });
            const data = await response.json();
            if (data.questions) {
                const newQs = data.questions.map(q => ({
                    ...q,
                    id: `q_${Math.random().toString(36).substr(2, 9)}`,
                    sectionId: form.sections[0].id,
                    logic: []
                }));
                setForm(f => ({ ...f, questions: [...f.questions, ...newQs] }));
                setAiPrompt('');
                setTimeout(() => {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }, 100);
            }
        } catch (error) {
            console.error('AI Generation error:', error);
            alert('Failed to generate questions. Please try again.');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const duplicateQuestion = (id) => {
        const qIndex = form.questions.findIndex(q => q.id === id);
        if (qIndex === -1) return;

        const original = form.questions[qIndex];
        const clone = {
            ...JSON.parse(JSON.stringify(original)),
            id: `q_${Math.random().toString(36).substr(2, 9)}`,
            label: `${original.label} (Copy)`
        };

        const newQuestions = [...form.questions];
        newQuestions.splice(qIndex + 1, 0, clone);
        setForm(f => ({ ...f, questions: newQuestions }));
    };

    const addSection = () => {
        const newSec = {
            id: `sec_${Date.now()}`,
            title: 'New Section'
        };
        setForm(f => ({
            ...f,
            sections: [...f.sections, newSec]
        }));
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(form, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${form.title.replace(/\s+/g, '_')}_backup.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImageUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `${form.id}/${fileName}`;

            // Upload to Supabase Storage 'logos' bucket
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data } = supabase.storage.from('logos').getPublicUrl(filePath);

            setForm(f => ({ ...f, theme: { ...f.theme, [field]: data.publicUrl } }));
        } catch (error) {
            alert('Error uploading image: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (form.custom_url && urlAvailable === false) {
                alert('The custom URL is already taken. Please choose another one.');
                setIsSaving(false);
                return;
            }

            // Include sharing info if changed
            const updatedForm = { ...form };
            if (shareId) updatedForm.sharing_id = shareId;
            updatedForm.sharing_level = shareLevel;

            await saveForm(updatedForm, form.edit_token);
            alert('Form saved successfully!');
            if (!searchParams.get('share')) {
                navigate('/admin');
            }
        } catch (error) {
            alert(error.message || 'Failed to save form');
        } finally {
            setIsSaving(false);
        }
    };

    const generateShareLink = async () => {
        const newShareId = shareId || `share_${Math.random().toString(36).substr(2, 9)}`;
        setShareId(newShareId);

        try {
            await saveForm({ ...form, sharing_id: newShareId, sharing_level: shareLevel }, form.edit_token);
            const link = `${window.location.origin}/admin/builder?share=${newShareId}`;
            await navigator.clipboard.writeText(link);
            alert('Share link copied to clipboard!');
        } catch (error) {
            alert('Failed to generate share link');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900 border p-2 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                            className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0 text-gray-900"
                            placeholder="Form Title"
                        />

                        <nav className="flex bg-gray-100 p-1 rounded-xl ml-4">
                            <button
                                onClick={() => setActiveTab('editor')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'editor' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Layout className="w-4 h-4 inline-block mr-2" /> Editor
                            </button>
                            <button
                                onClick={() => setActiveTab('workflow')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'workflow' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <GitMerge className="w-4 h-4 inline-block mr-2" /> Workflow
                            </button>
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'analytics' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <BarChart3 className="w-4 h-4 inline-block mr-2" /> Analytics
                            </button>
                            <button
                                onClick={() => setActiveTab('integrations')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'integrations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Share2 className="w-4 h-4 inline-block mr-2" /> Integrations
                            </button>
                        </nav>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowThemeSettings(!showThemeSettings)} className="p-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 relative">
                            <Settings className="w-5 h-5" />
                            {showThemeSettings && (
                                <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl p-6 z-50 text-left" onClick={e => e.stopPropagation()}>
                                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg"><Palette className="w-5 h-5 text-primary-600" /> Settings & Theme</h3>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                                                <LinkIcon className="w-3 h-3" /> Custom Public Link
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center border-r border-gray-200 pr-2 pointer-events-none">
                                                    <span className="text-gray-500 sm:text-sm">/forms/</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={form.custom_url || ''}
                                                    onChange={async (e) => {
                                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                        setForm(f => ({ ...f, custom_url: val }));
                                                        if (val.length > 2) {
                                                            setCheckingUrl(true);
                                                            const available = await checkCustomUrl(val, form.id);
                                                            setUrlAvailable(available);
                                                            setCheckingUrl(false);
                                                        } else if (val.length === 0) {
                                                            setUrlAvailable(null);
                                                            setCheckingUrl(false);
                                                        }
                                                    }}
                                                    placeholder="my-cool-form"
                                                    className={`w-full pl-20 pr-10 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-100 transition-colors ${form.custom_url ? (urlAvailable ? 'border-green-300' : (urlAvailable === false ? 'border-red-300' : 'border-gray-200')) : 'border-gray-200'}`}
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    {checkingUrl ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> :
                                                        form.custom_url?.length > 2 ? (
                                                            urlAvailable ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />
                                                        ) : null}
                                                </div>
                                            </div>
                                            {urlAvailable === false && <p className="text-xs text-red-500 mt-1">This URL is already taken.</p>}
                                        </div>

                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Database className="w-4 h-4 text-green-600" />
                                                <h4 className="font-bold text-gray-900 text-sm">Google Sheets Integration</h4>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-3">
                                                Direct integration allows creating and syncing responses to Google Sheets on the spot.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setActiveTab('integrations');
                                                    setShowThemeSettings(false);
                                                }}
                                                className="w-full py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-all flex items-center justify-center gap-2"
                                            >
                                                Configure Integration →
                                            </button>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100">
                                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest flex items-center justify-between">
                                                <span className="flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Brand Logo</span>
                                                {isUploading && <Loader2 className="w-3 h-3 animate-spin text-primary-500" />}
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, 'logoUrl')}
                                                className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                            />
                                            {form.theme?.logoUrl && (
                                                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Image uploaded
                                                    <button onClick={() => setForm(f => ({ ...f, theme: { ...f.theme, logoUrl: '' } }))} className="text-red-500 hover:underline ml-auto">Remove</button>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest flex items-center justify-between">
                                                <span className="flex items-center gap-2"><ImageIcon className="w-3 h-3" /> Background Image</span>
                                                {isUploading && <Loader2 className="w-3 h-3 animate-spin text-primary-500" />}
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, 'backgroundImageUrl')}
                                                className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50 focus:bg-white outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                            />
                                            {form.theme?.backgroundImageUrl && (
                                                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Image uploaded
                                                    <button onClick={() => setForm(f => ({ ...f, theme: { ...f.theme, backgroundImageUrl: '' } }))} className="text-red-500 hover:underline ml-auto">Remove</button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Primary Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={form.theme?.primaryColor || '#22c55e'} onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, primaryColor: e.target.value } }))} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden" />
                                                    <input type="text" value={form.theme?.primaryColor || '#22c55e'} onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, primaryColor: e.target.value } }))} className="uppercase text-xs font-mono border-b border-gray-200 outline-none w-16 text-center" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest text-right">Mode</label>
                                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                                    <button onClick={() => setForm(f => ({ ...f, theme: { ...f.theme, mode: 'light' } }))} className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${form.theme?.mode !== 'dark' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Light</button>
                                                    <button onClick={() => setForm(f => ({ ...f, theme: { ...f.theme, mode: 'dark' } }))} className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${form.theme?.mode === 'dark' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>Dark</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                                                <Type className="w-3 h-3" /> Typography
                                            </label>
                                            <select
                                                value={form.theme?.fontFamily || 'Inter'}
                                                onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, fontFamily: e.target.value } }))}
                                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-100 transition-all font-medium"
                                            >
                                                <option value="Inter">Inter (Clean)</option>
                                                <option value="Outfit">Outfit (Modern)</option>
                                                <option value="Plus Jakarta Sans">Jakarta (Premium)</option>
                                                <option value="Playfair Display">Playfair (Serif)</option>
                                                <option value="Space Mono">Space Mono (Tech)</option>
                                            </select>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-500 rounded-lg text-white">
                                                        <Sparkles className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-indigo-900">AI Follow-ups</p>
                                                        <p className="text-[10px] text-indigo-600 font-medium">Auto-generate conversational questions</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setForm(f => ({ ...f, theme: { ...f.theme, disableAiFollowUp: !f.theme?.disableAiFollowUp } }))}
                                                    className={`w-12 h-6 rounded-full transition-all relative ${!form.theme?.disableAiFollowUp ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${!form.theme?.disableAiFollowUp ? 'right-1' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            {form.theme?.disableAiFollowUp && (
                                                <p className="text-[10px] text-gray-500 mt-2 px-1">
                                                    <Info className="w-3 h-3 inline mr-1" /> AI follow-up questions are currently disabled.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </button>

                        <div className="relative">
                            <button onClick={() => setShowShareModal(!showShareModal)} className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 flex items-center gap-2 font-bold transition-all">
                                <Share2 className="w-4 h-4" /> Share
                            </button>
                            {showShareModal && (
                                <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl p-6 z-50 text-left" onClick={e => e.stopPropagation()}>
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Share2 className="w-5 h-5 text-primary-600" /> Share Form Access</h3>
                                    <p className="text-xs text-gray-500 mb-6">Allow others to view analytics or edit this form builder.</p>

                                    <div className="space-y-4 mb-6">
                                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input type="radio" checked={shareLevel === 'none'} onChange={() => setShareLevel('none')} className="text-primary-600" />
                                            <div>
                                                <p className="font-bold text-sm text-gray-900">Private</p>
                                                <p className="text-xs text-gray-500">Only you can access</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input type="radio" checked={shareLevel === 'view'} onChange={() => setShareLevel('view')} className="text-primary-600" />
                                            <div>
                                                <p className="font-bold text-sm text-gray-900">Viewer</p>
                                                <p className="text-xs text-gray-500">Can view analytics and form structure</p>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input type="radio" checked={shareLevel === 'edit'} onChange={() => setShareLevel('edit')} className="text-primary-600" />
                                            <div>
                                                <p className="font-bold text-sm text-gray-900">Editor</p>
                                                <p className="text-xs text-gray-500">Can edit form and view analytics</p>
                                            </div>
                                        </label>
                                    </div>

                                    {shareLevel !== 'none' && (
                                        <button onClick={generateShareLink} className="w-full py-2 bg-gray-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
                                            <Copy className="w-4 h-4" /> Copy Share Link
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <button onClick={handleExport} title="Download JSON Backup" className="p-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50">
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                const target = form.custom_url ? form.custom_url : form.id;
                                const link = `${window.location.origin}/forms/${target}`;
                                navigator.clipboard.writeText(link);
                                alert('Public form link copied!');
                            }}
                            className="px-4 py-2 border border-green-200 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 flex items-center gap-2 font-bold transition-all"
                        >
                            <LinkIcon className="w-4 h-4" /> Copy Link
                        </button>
                        <button onClick={() => navigate(`/forms/${form.custom_url || form.id}`)} className="px-5 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 flex items-center gap-2 font-bold transition-all">
                            <Play className="w-4 h-4" /> Preview
                        </button>
                        {form.sharing_level !== 'view' && (
                            <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold shadow-lg shadow-primary-500/20 transition-all">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 mt-8">
                {activeTab === 'editor' && (
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex gap-4">
                            <button
                                onClick={() => addQuestion(form.sections[0]?.id, true)}
                                className="flex-1 py-3 bg-white border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all group"
                            >
                                <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" /> Add Question at Top
                            </button>
                            <button
                                onClick={addSection}
                                className="flex-1 py-3 bg-white border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all group"
                            >
                                <Layout className="w-5 h-5 group-hover:scale-110 transition-transform" /> Add Section
                            </button>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && generateAiQuestions()}
                                placeholder="Tell AI to add more questions... (e.g. 'Add 3 questions about their experience')"
                                className="w-full pl-12 pr-32 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-100 rounded-2xl text-gray-700 placeholder:text-purple-300 focus:ring-4 focus:ring-purple-100 focus:border-purple-300 outline-none transition-all"
                            />
                            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-purple-400 animate-pulse" />
                            <button
                                onClick={generateAiQuestions}
                                disabled={isGeneratingAi || !aiPrompt.trim()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-200 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {isGeneratingAi ? 'Generating...' : 'AI Generate'}
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'editor' && (
                    <div className="flex gap-8 items-start">
                        {/* Questions List */}
                        <div className="flex-1 max-w-3xl mx-auto">
                            {(form.sections || [{ id: 'sec_1', title: 'Main Section' }]).map((section) => (
                                <div key={section.id} className="mb-12">
                                    <div className="flex items-center gap-4 mb-6 group">
                                        <Layout className="w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={section.title}
                                            onChange={(e) => {
                                                const newSecs = form.sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s);
                                                setForm(f => ({ ...f, sections: newSecs }));
                                            }}
                                            className="text-lg font-bold text-gray-500 bg-transparent border-none outline-none focus:ring-0 focus:text-gray-900 w-full"
                                            placeholder="Section Title..."
                                        />
                                    </div>

                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={form.questions.filter(q => q.sectionId === section.id).map(q => q.id)} strategy={verticalListSortingStrategy}>
                                            {form.questions.filter(q => q.sectionId === section.id).map((q) => (
                                                <SortableItem
                                                    key={q.id}
                                                    id={q.id}
                                                    question={q}
                                                    allQuestions={form.questions}
                                                    updateQuestion={updateQuestion}
                                                    removeQuestion={removeQuestion}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>

                                    <button
                                        onClick={() => addQuestion(section.id)}
                                        className="w-full py-4 mt-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-200 font-bold flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Plus className="w-5 h-5" /> Add Question
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => setForm(f => ({ ...f, sections: [...f.sections, { id: `sec_${Date.now()}`, title: 'New Section' }] }))}
                                className="w-full py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 border-dashed font-medium text-sm transition-all"
                            >
                                + Add New Section
                            </button>
                        </div>

                        {/* Live Preview Sidebar */}
                        <div className={`hidden lg:block w-80 sticky top-28 border rounded-2xl shadow-sm overflow-hidden h-[600px] flex flex-col transition-colors duration-300 ${form.theme?.mode === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className={`p-4 border-b flex items-center justify-between ${form.theme?.mode === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                                <span className={`text-xs font-bold uppercase tracking-widest ${form.theme?.mode === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>LIVE PREVIEW</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDevicePreview('mobile')}
                                        className={`p-1.5 rounded-md ${devicePreview === 'mobile' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <Smartphone className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDevicePreview('desktop')}
                                        className={`p-1.5 rounded-md ${devicePreview === 'desktop' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <Laptop className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className={`flex-1 overflow-y-auto w-full flex justify-center py-6 transition-colors duration-300 ${form.theme?.mode === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                <div
                                    className={`shadow-xl overflow-y-auto transition-all duration-300 relative flex flex-col ${devicePreview === 'mobile' ? 'w-[320px] rounded-[32px] border-[8px] border-gray-900 h-[568px] sticky top-0' : 'w-full max-w-2xl rounded-xl h-fit min-h-full'}`}
                                    style={{
                                        backgroundColor: form.theme?.mode === 'dark' ? '#111827' : (form.theme?.backgroundColor || '#ffffff'),
                                        color: form.theme?.mode === 'dark' ? '#ffffff' : (form.theme?.textColor || '#111827')
                                    }}
                                >
                                    {form.theme?.backgroundImageUrl && (
                                        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                                            <img src={form.theme.backgroundImageUrl} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    )}
                                    <div className="p-6">
                                        {form.theme?.logoUrl && (
                                            <div className="w-full flex justify-center mb-6">
                                                <img src={form.theme.logoUrl} className="max-h-12" alt="Brand Logo" />
                                            </div>
                                        )}
                                        <h4 className="text-2xl font-bold mb-2" style={{ color: form.theme?.primaryColor || '#111827', fontFamily: form.theme?.fontFamily || 'Inter' }}>
                                            {form.title}
                                        </h4>

                                        <div className="space-y-6 mt-6 w-full text-left">
                                            {form.questions.map((q, idx) => (
                                                <div key={q.id} className="w-full">
                                                    <label className="block text-sm font-semibold mb-2" style={{ color: form.theme?.mode === 'dark' ? '#e5e7eb' : (form.theme?.textColor || '#374151'), fontFamily: form.theme?.fontFamily || 'Inter' }}>
                                                        {idx + 1}. {q.label || 'Untitled Question'}
                                                        {q.required && <span className="text-red-500 ml-1">*</span>}
                                                    </label>

                                                    {q.type === 'text' || q.type === 'email' || q.type === 'number' ? (
                                                        <input
                                                            type={q.type}
                                                            value={previewAnswers[q.id] || ''}
                                                            onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                            className={`w-full p-2.5 rounded-lg border bg-transparent transition-all outline-none focus:ring-2 focus:ring-primary-500/20 ${form.theme?.mode === 'dark' ? 'border-white/10 text-white placeholder:text-white/20' : 'border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                                                            placeholder="Your answer..."
                                                        />
                                                    ) : q.type === 'textarea' ? (
                                                        <textarea
                                                            className={`w-full p-2.5 rounded-lg border bg-transparent transition-all outline-none focus:ring-2 focus:ring-primary-500/20 ${form.theme?.mode === 'dark' ? 'border-white/10 text-white placeholder:text-white/20' : 'border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
                                                            rows="3"
                                                            placeholder="Your answer..."
                                                            value={previewAnswers[q.id] || ''}
                                                            onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                        ></textarea>
                                                    ) : q.type === 'dropdown' ? (
                                                        <div className="relative">
                                                            <select
                                                                value={previewAnswers[q.id] || ''}
                                                                onChange={(e) => setPreviewAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                                className={`w-full p-2 rounded-lg border transition-all outline-none appearance-none cursor-pointer ${form.theme?.mode === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                                            >
                                                                <option value="" className={form.theme?.mode === 'dark' ? 'bg-gray-900' : 'bg-white'}>Select an option...</option>
                                                                {q.options?.map((opt, i) => (
                                                                    <option key={i} value={opt} className={form.theme?.mode === 'dark' ? 'bg-gray-900' : 'bg-white'}>{opt}</option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                <div className="w-4 h-4 border-b-2 border-r-2 border-gray-400 rotate-45 mb-1" />
                                                            </div>
                                                        </div>
                                                    ) : (q.type === 'select' || q.type === 'multiple-choice') ? (
                                                        <div className="space-y-2">
                                                            {q.options?.map((opt, i) => {
                                                                const isChecked = q.type === 'select'
                                                                    ? previewAnswers[q.id] === opt
                                                                    : (previewAnswers[q.id] || '').split(', ').includes(opt);
                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        onClick={() => {
                                                                            if (q.type === 'select') {
                                                                                setPreviewAnswers(prev => ({ ...prev, [q.id]: opt }));
                                                                            } else {
                                                                                const current = (previewAnswers[q.id] || '').split(', ').filter(Boolean);
                                                                                const next = current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt];
                                                                                setPreviewAnswers(prev => ({ ...prev, [q.id]: next.join(', ') }));
                                                                            }
                                                                        }}
                                                                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all ${isChecked ? 'border-primary-500 bg-primary-50/80' : (form.theme?.mode === 'dark' ? 'border-white/10 bg-white/5 hover:border-primary-300' : 'border-gray-200 bg-white hover:border-primary-200')}`}
                                                                    >
                                                                        <input
                                                                            readOnly
                                                                            type={q.type === 'select' ? 'radio' : 'checkbox'}
                                                                            checked={isChecked}
                                                                            className="w-4 h-4 pointer-events-none"
                                                                        />
                                                                        <span className="text-sm">{opt}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : q.type === 'nested-choice' ? (
                                                        <div className="space-y-2">
                                                            {q.nestedOptions?.map((cat, i) => (
                                                                <div key={i} className="space-y-1">
                                                                    <div
                                                                        onClick={() => setPreviewExpandedCat(previewExpandedCat === i ? null : i)}
                                                                        className={`flex items-center gap-2 p-2 rounded border transition-all cursor-pointer ${previewExpandedCat === i ? 'border-primary-500 bg-primary-500/5' : (form.theme?.mode === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-white')}`}
                                                                    >
                                                                        <span className={`text-xs font-bold capitalize ${previewExpandedCat === i ? 'text-primary-600' : (form.theme?.mode === 'dark' ? 'text-white/60' : 'text-gray-500')}`}>{cat.label || 'Category'}</span>
                                                                        <div className={`ml-auto w-2 h-2 border-b-2 border-r-2 transition-transform ${previewExpandedCat === i ? '-rotate-135 border-primary-500' : 'rotate-45 border-gray-400'}`} />
                                                                    </div>
                                                                    {previewExpandedCat === i && (
                                                                        <div className="pl-4 space-y-1">
                                                                            {cat.items?.map((item, j) => (
                                                                                <div key={j} className={`p-2 rounded text-[10px] font-medium border transition-all ${form.theme?.mode === 'dark' ? 'bg-white/5 border-white/5 text-white/80' : 'bg-white border-gray-100 text-gray-600'}`}>
                                                                                    {item.label}
                                                                                </div>
                                                                            ))}
                                                                            {(!cat.items || cat.items.length === 0) && (
                                                                                <div className="text-[10px] text-gray-400 italic pl-2">No items</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : q.type === 'rating' ? (
                                                        <div className="flex gap-2">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <button
                                                                    key={star}
                                                                    onClick={() => setPreviewAnswers(prev => ({ ...prev, [q.id]: star }))}
                                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${previewAnswers[q.id] === star ? 'bg-primary-600 text-white shadow-lg' : (form.theme?.mode === 'dark' ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')}`}
                                                                >
                                                                    {star}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : q.type === 'yes-no' ? (
                                                        <div className="flex gap-4">
                                                            {['Yes', 'No'].map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    onClick={() => setPreviewAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${previewAnswers[q.id] === opt ? 'border-primary-500 bg-primary-50/80 text-primary-700' : (form.theme?.mode === 'dark' ? 'border-white/10 bg-white/5 text-white/80 hover:border-primary-300' : 'border-gray-100 bg-white hover:border-primary-200')}`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : q.type === 'opinion-scale' ? (
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between gap-1">
                                                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                                                                    <button
                                                                        key={val}
                                                                        onClick={() => setPreviewAnswers(prev => ({ ...prev, [q.id]: val }))}
                                                                        className={`flex-1 aspect-square sm:aspect-auto sm:h-12 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all ${previewAnswers[q.id] === val ? 'bg-primary-600 border-primary-600 text-white shadow-lg' : (form.theme?.mode === 'dark' ? 'bg-white/5 border-white/10 text-white/60 hover:border-primary-300' : 'bg-white border-gray-100 text-gray-500 hover:border-primary-200')}`}
                                                                    >
                                                                        {val}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 px-1 uppercase tracking-wider">
                                                                <span>{q.leftLabel || 'Not at all likely'}</span>
                                                                <span>{q.rightLabel || 'Extremely likely'}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={`w-full p-2.5 rounded-lg border text-sm italic ${form.theme?.mode === 'dark' ? 'border-white/10 bg-white/5 text-white/40' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>
                                                            Interactive preview for {q.type}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {form.questions.length > 0 && (
                                            <button
                                                onClick={() => alert(`Preview Submission:\n${JSON.stringify(previewAnswers, null, 2)}`)}
                                                className="mt-8 px-6 py-2.5 rounded-lg text-white font-bold w-full hover:shadow-lg transition-all"
                                                style={{ backgroundColor: form.theme?.primaryColor || '#22c55e', fontFamily: form.theme?.fontFamily || 'Inter' }}
                                            >
                                                Submit Test
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'workflow' && (
                    <WorkflowEditor questions={form.questions} updateQuestion={updateQuestion} />
                )}

                {activeTab === 'analytics' && (
                    <AnalyticsView form={form} responses={responses} />
                )}

                {activeTab === 'integrations' && (
                    <div className="max-w-4xl mx-auto py-12 px-6">
                        <div className="mb-10 text-left">
                            <h2 className="text-4xl font-black text-gray-900 mb-2">Integrations</h2>
                            <p className="text-gray-500 text-lg">Connect your form to your favorite apps to automate your workflow.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white border-2 border-green-100 rounded-[2rem] p-10 shadow-sm hover:shadow-2xl hover:shadow-green-100/30 transition-all group border-b-[12px] border-b-green-500">
                                <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                    <Database className="w-12 h-12 text-green-600" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-4">Google Sheets</h3>
                                <p className="text-gray-500 mb-10 leading-relaxed text-lg text-left">Automatically send every response to a Google Sheet. Create new sheets or pick existing ones directly.</p>

                                {!(form.theme?.googleTokens) ? (
                                    <button
                                        onClick={() => {
                                            const width = 600, height = 700;
                                            const left = (window.innerWidth - width) / 2;
                                            const top = (window.innerHeight - height) / 2;
                                            const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                                            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
                                            window.open(`${apiUrl}/api/auth/google?formId=${form.id}`, 'googleAuth', `width=${width},height=${height},left=${left},top=${top}`);
                                        }}
                                        className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-4 shadow-xl shadow-green-200"
                                    >
                                        <LinkIcon className="w-6 h-6" /> Connect Google Account
                                    </button>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-green-50 border-2 border-green-200 p-6 rounded-3xl flex items-center gap-4 shadow-sm">
                                            <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-green-900">Google Account Connected</p>
                                                <p className="text-sm text-green-700">You can now link form to a sheet.</p>
                                            </div>
                                            <button
                                                onClick={() => setForm(f => ({ ...f, theme: { ...f.theme, googleTokens: null, googleSheetId: null } }))}
                                                className="ml-auto text-xs font-bold text-red-600 hover:text-red-700"
                                            >
                                                Disconnect
                                            </button>
                                        </div>

                                        {!form.theme?.googleSheetId ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <button
                                                    onClick={handleCreateSheet}
                                                    disabled={loadingSheets}
                                                    className="p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-green-500 hover:shadow-xl transition-all group text-left"
                                                >
                                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-50 transition-colors">
                                                        <Plus className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 mb-1">Create New Sheet</h4>
                                                    <p className="text-xs text-gray-500">Create a fresh sheet for this form's data</p>
                                                </button>

                                                <button
                                                    onClick={fetchAvailableSheets}
                                                    disabled={loadingSheets}
                                                    className="p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-green-500 hover:shadow-xl transition-all group text-left"
                                                >
                                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-50 transition-colors">
                                                        <Search className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 mb-1">Link Existing</h4>
                                                    <p className="text-xs text-gray-500">Pick a spreadsheet from your Google Drive</p>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl shadow-sm text-left">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                        <FileText className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <span className="font-bold text-gray-900">Linked Spreadsheet</span>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-mono text-gray-600 break-all mb-4">
                                                    {form.theme.googleSheetId}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${form.theme.googleSheetId}`, '_blank')}
                                                        className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all"
                                                    >
                                                        Open Sheet
                                                    </button>
                                                    <button
                                                        onClick={() => setForm(f => ({ ...f, theme: { ...f.theme, googleSheetId: null } }))}
                                                        className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                                                    >
                                                        Change
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {showSheetPicker && (
                                            <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl shadow-sm text-left">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-bold text-gray-900">Choose a Spreadsheet</h4>
                                                    <button onClick={() => setShowSheetPicker(false)} className="text-gray-400 hover:text-gray-600">×</button>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                    {availableSheets.map(sheet => (
                                                        <button
                                                            key={sheet.id}
                                                            onClick={() => {
                                                                setForm(f => ({ ...f, theme: { ...f.theme, googleSheetId: sheet.id } }));
                                                                setShowSheetPicker(false);
                                                            }}
                                                            className="w-full p-3 rounded-xl border border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                                                        >
                                                            <div className="font-bold text-sm text-gray-900 group-hover:text-green-900">{sheet.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono">{sheet.id}</div>
                                                        </button>
                                                    ))}
                                                    {availableSheets.length === 0 && (
                                                        <div className="py-8 text-center text-sm text-gray-400 italic">No spreadsheets found.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 border-4 border-dashed border-gray-100 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-opacity">
                            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-8">
                                <Share2 className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-300 mb-4 uppercase tracking-wider">More coming</h3>
                            <p className="text-lg font-bold text-gray-300">Zapier, HubSpot, and Webhooks are being developed.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
