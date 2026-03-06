import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFormById, saveForm } from '../utils/storage';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ArrowLeft, GripVertical, Plus, Trash2, Save, Play,
    GitMerge, Settings, Download, Layout, BarChart3,
    Image as ImageIcon, Type, Palette, Smartphone, Laptop
} from 'lucide-react';
import AnalyticsView from '../components/AnalyticsView';
import WorkflowEditor from '../components/WorkflowEditor';
import { getResponsesByFormId } from '../utils/storage';

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

                    <div className="flex gap-4 items-center">
                        <select
                            value={question.type}
                            onChange={(e) => updateQuestion(id, 'type', e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-100"
                        >
                            {questionTypes.map((t) => (
                                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                        </select>
                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={question.required || false}
                                onChange={(e) => updateQuestion(id, 'required', e.target.checked)}
                                className="rounded text-primary-600 focus:ring-primary-500"
                            />
                            Required
                        </label>
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

                <button onClick={() => removeQuestion(id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export default function FormBuilder() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('editor'); // editor, workflow, analytics
    const [form, setForm] = useState({
        id: `form_${Date.now()}`,
        title: 'Untitled Form',
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
    const [showThemeSettings, setShowThemeSettings] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (location.state?.formId) {
            const fetchExisting = async () => {
                const existing = await getFormById(location.state.formId);
                if (existing) setForm(existing);
            };
            fetchExisting();
        } else if (location.state?.generatedSchema) {
            const schema = location.state.generatedSchema;
            setForm({
                id: `form_${Date.now()}`,
                title: schema.title || 'Generated Form',
                theme: { ...form.theme, ...schema.theme },
                sections: schema.sections || [{ id: 'sec_1', title: 'Main Section' }],
                questions: schema.questions.map(q => ({
                    id: q.id || `q_${Math.random().toString(36).substr(2, 9)}`,
                    sectionId: q.sectionId || 'sec_1',
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

    const addQuestion = (sectionId = 'sec_1') => {
        const newQ = {
            id: `q_${Math.random().toString(36).substr(2, 9)}`,
            sectionId,
            label: 'New Question',
            type: 'text',
            required: false,
            logic: []
        };
        setForm(f => ({ ...f, questions: [...f.questions, newQ] }));
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

    const handleSave = async () => {
        await saveForm(form);
        alert('Form saved successfully!');
        navigate('/admin');
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
                                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg"><Palette className="w-5 h-5 text-primary-600" /> Branding & Theme</h3>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                                                <ImageIcon className="w-3 h-3" /> Brand Logo URL
                                            </label>
                                            <input
                                                type="text"
                                                value={form.theme?.logoUrl || ''}
                                                onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, logoUrl: e.target.value } }))}
                                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white outline-none transition-all focus:ring-2 focus:ring-primary-100"
                                                placeholder="https://yourbrand.com/logo.png"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                                                <ImageIcon className="w-3 h-3" /> Background Image URL
                                            </label>
                                            <input
                                                type="text"
                                                value={form.theme?.backgroundImageUrl || ''}
                                                onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, backgroundImageUrl: e.target.value } }))}
                                                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white outline-none transition-all focus:ring-2 focus:ring-primary-100"
                                                placeholder="https://images.unsplash.com/..."
                                            />
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
                                    </div>
                                </div>
                            )}
                        </button>
                        <button onClick={handleExport} title="Download JSON Backup" className="p-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50">
                            <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => navigate(`/forms/${form.id}`)} className="px-5 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 flex items-center gap-2 font-bold transition-all">
                            <Play className="w-4 h-4" /> Preview
                        </button>
                        <button onClick={handleSave} className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black flex items-center gap-2 font-bold shadow-lg shadow-gray-200 transition-all">
                            <Save className="w-4 h-4" /> Save
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 mt-8">
                {activeTab === 'editor' && (
                    <div className="flex gap-8 items-start">
                        {/* Questions List */}
                        <div className="flex-1 max-w-3xl mx-auto">
                            {form.sections.map((section) => (
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
                                    <Smartphone className="w-4 h-4 text-gray-400" />
                                    <Laptop className="w-4 h-4 text-gray-900" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center p-6 text-center">
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-white rounded-full mx-auto shadow-sm flex items-center justify-center">
                                        {form.theme?.logoUrl ? <img src={form.theme.logoUrl} className="max-h-8 max-w-8" /> : <ImageIcon className="w-6 h-6 text-gray-200" />}
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900">Preview Mode</h4>
                                    <p className="text-sm text-gray-500">Preview updates instantly as you build.</p>
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

