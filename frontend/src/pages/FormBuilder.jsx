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
    Share2, Copy, Loader2, Link as LinkIcon, CheckCircle2, XCircle,
    Database, Sparkles, Info
} from 'lucide-react';
import AnalyticsView from '../components/AnalyticsView';
import WorkflowEditor from '../components/WorkflowEditor';
import { supabase } from '../utils/supabase';
import { checkCustomUrl } from '../utils/storage';

const questionTypes = ['text', 'email', 'number', 'select', 'textarea', 'multiple-choice', 'rating', 'opinion-scale', 'welcome-screen', 'yes-no'];

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

                        {['select', 'multiple-choice'].includes(question.type) && (
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

                    {(question.type === 'select' || question.type === 'multiple-choice') && (
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
                                                Paste a Google Apps Script Webhook URL to send responses directly to your sheet.
                                            </p>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest flex items-center gap-2">
                                                <LinkIcon className="w-3 h-3" /> Webhook URL
                                            </label>
                                            <input
                                                type="text"
                                                value={form.theme?.googleSheetWebhookUrl || ''}
                                                onChange={(e) => setForm(f => ({ ...f, theme: { ...f.theme, googleSheetWebhookUrl: e.target.value } }))}
                                                placeholder="https://script.google.com/macros/s/.../exec"
                                                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
                                            />
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
                    <div className="flex gap-4 mb-6">
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
                        <div className="hidden lg:block w-80 sticky top-28 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-[600px] flex flex-col">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</span>
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
                            <div className="flex-1 overflow-y-auto w-full flex justify-center bg-gray-100 py-6">
                                <div
                                    className={`bg-white shadow-xl overflow-y-auto transition-all duration-300 relative ${devicePreview === 'mobile' ? 'w-[320px] rounded-3xl border-[8px] border-gray-200 h-[568px]' : 'w-full max-w-2xl rounded-xl h-full'}`}
                                    style={{ backgroundColor: form.theme?.backgroundColor || '#ffffff' }}
                                >
                                    {form.theme?.backgroundImageUrl && (
                                        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
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
                                                    <label className="block text-sm font-semibold mb-2" style={{ color: form.theme?.textColor || '#374151', fontFamily: form.theme?.fontFamily || 'Inter' }}>
                                                        {idx + 1}. {q.label || 'Untitled Question'}
                                                        {q.required && <span className="text-red-500 ml-1">*</span>}
                                                    </label>

                                                    {q.type === 'text' || q.type === 'email' || q.type === 'number' ? (
                                                        <input disabled type={q.type} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white opacity-70" placeholder="Your answer..." />
                                                    ) : q.type === 'textarea' ? (
                                                        <textarea disabled className="w-full p-2.5 rounded-lg border border-gray-300 bg-white opacity-70" rows="3" placeholder="Your answer..."></textarea>
                                                    ) : q.type === 'select' || q.type === 'multiple-choice' ? (
                                                        <div className="space-y-2">
                                                            {q.options?.map((opt, i) => (
                                                                <div key={i} className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-white opacity-70">
                                                                    <input disabled type={q.type === 'select' ? 'radio' : 'checkbox'} className="w-4 h-4" />
                                                                    <span className="text-sm">{opt}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : q.type === 'rating' ? (
                                                        <div className="flex gap-2">
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <div key={star} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold opacity-70">{star}</div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="w-full p-2.5 rounded-lg border border-gray-200 bg-gray-100 text-sm text-gray-500 italic opacity-70">
                                                            Interactive preview for {q.type}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {form.questions.length > 0 && (
                                            <button disabled className="mt-8 px-6 py-2.5 rounded-lg text-white font-bold w-full opacity-50" style={{ backgroundColor: form.theme?.primaryColor || '#22c55e', fontFamily: form.theme?.fontFamily || 'Inter' }}>
                                                Submit
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
                    <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
                        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <BarChart3 className="w-12 h-12 text-primary-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Analytics Dashboard</h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">Detailed insights into your form performance will appear here as responses come in.</p>
                        <AnalyticsView responses={responses} />
                    </div>
                )}
            </main>
        </div>
    );
}

