import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFormById, saveForm } from '../utils/storage';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, GripVertical, Plus, Trash2, Save, Play, GitMerge, Settings, Download } from 'lucide-react';

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

                    {/* Logic Jumps Section */}
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
    const [form, setForm] = useState({
        id: `form_${Date.now()}`,
        title: 'Untitled Form',
        theme: {
            primaryColor: '#22c55e',
            backgroundColor: '#ffffff',
            textColor: '#111827',
            fontFamily: 'Inter'
        },
        questions: []
    });
    const [showThemeSettings, setShowThemeSettings] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        if (location.state?.formId) {
            const existing = getFormById(location.state.formId);
            if (existing) setForm(existing);
        } else if (location.state?.generatedSchema) {
            const schema = location.state.generatedSchema;
            setForm({
                id: `form_${Date.now()}`,
                title: schema.title || 'Generated Form',
                theme: schema.theme || { primaryColor: '#22c55e', backgroundColor: '#ffffff', textColor: '#111827', fontFamily: 'Inter' },
                questions: schema.questions.map(q => ({
                    id: q.id || `q_${Math.random().toString(36).substr(2, 9)}`,
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
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                            className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 text-gray-900 w-full"
                            placeholder="Form Title"
                        />
                    </div>
                    <div className="flex gap-3 relative">
                        <button onClick={() => setShowThemeSettings(!showThemeSettings)} className="p-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium">
                            <Settings className="w-5 h-5" />
                        </button>
                        <button onClick={handleExport} title="Download JSON Backup" className="p-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium">
                            <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => navigate(`/forms/${form.id}`)} className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium">
                            <Play className="w-4 h-4" /> Preview
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 font-medium">
                            <Save className="w-4 h-4" /> Save Form
                        </button>
                    </div>
                </div>

                {/* Theme Settings Dropdown Panel */}
                {showThemeSettings && (
                    <div className="absolute right-4 top-20 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-20">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Settings className="w-4 h-4" /> Theme Settings</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.theme?.primaryColor || '#22c55e'} onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, primaryColor: e.target.value } }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                                    <input type="text" value={form.theme?.primaryColor || '#22c55e'} onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, primaryColor: e.target.value } }))} className="uppercase text-sm border-b border-gray-300 outline-none w-24" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.theme?.backgroundColor || '#ffffff'} onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, backgroundColor: e.target.value } }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                                    <input type="text" value={form.theme?.backgroundColor || '#ffffff'} onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, backgroundColor: e.target.value } }))} className="uppercase text-sm border-b border-gray-300 outline-none w-24" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.theme?.textColor || '#111827'} onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, textColor: e.target.value } }))} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                                    <input type="text" value={form.theme?.textColor || '#111827'} onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, textColor: e.target.value } }))} className="uppercase text-sm border-b border-gray-300 outline-none w-24" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                                <select
                                    value={form.theme?.fontFamily || 'Inter'}
                                    onChange={e => setForm(f => ({ ...f, theme: { ...f.theme, fontFamily: e.target.value } }))}
                                    className="w-full border border-gray-300 rounded p-2 text-sm outline-none bg-white"
                                >
                                    <option value="Inter">Inter (Sans Serif)</option>
                                    <option value="Roboto">Roboto (Sans Serif)</option>
                                    <option value="Playfair Display">Playfair Display (Serif)</option>
                                    <option value="Merriweather">Merriweather (Serif)</option>
                                    <option value="Courier New">Courier New (Monospace)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <main className="max-w-3xl mx-auto px-4 mt-8" onClick={() => showThemeSettings && setShowThemeSettings(false)}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={form.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                        {form.questions.map((q) => (
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
                    onClick={addQuestion}
                    className="w-full py-4 mt-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-medium flex items-center justify-center gap-2 transition-all"
                >
                    <Plus className="w-5 h-5" /> Add Question
                </button>
            </main>
        </div>
    );
}
