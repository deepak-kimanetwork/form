import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getForms, getResponsesLocal, deleteForm } from '../utils/storage';
import { PlusCircle, Edit, Trash2, Link as LinkIcon, FileText } from 'lucide-react';

export default function AdminDashboard() {
    const [forms, setForms] = useState([]);
    const [responsesCount, setResponsesCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        setForms(getForms());
        setResponsesCount(getResponsesLocal().length);
    }, []);

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this form?')) {
            deleteForm(id);
            setForms(getForms());
        }
    };

    return (
        <div className="min-h-screen p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Form Builder Dashboard</h1>
                <div className="flex gap-4">
                    <Link to="/responses" className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> View Responses ({responsesCount})
                    </Link>
                    <Link to="/create" className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" /> Create AI Form
                    </Link>
                    <button onClick={() => navigate('/admin/builder')} className="px-4 py-2 bg-gray-800 text-white rounded-lg shadow-sm hover:bg-gray-900 flex items-center gap-2">
                        <Edit className="w-5 h-5" /> Empty Builder
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Total Forms</p>
                    <p className="text-3xl font-bold">{forms.length}</p>
                </div>
                <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Total Responses</p>
                    <p className="text-3xl font-bold">{responsesCount}</p>
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Forms</h2>

            {forms.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">No forms created yet.</p>
                    <Link to="/create" className="text-primary-600 font-medium hover:underline">
                        Generate your first form with AI &rarr;
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {forms.map(form => (
                        <div key={form.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative">
                            <h3 className="font-bold text-lg mb-2 truncate">{form.title || 'Untitled Form'}</h3>
                            <p className="text-sm text-gray-500 mb-4">{form.questions?.length || 0} questions</p>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <button onClick={() => navigate(`/forms/${form.id}`)} className="text-gray-600 hover:text-primary-600 flex items-center gap-1 text-sm font-medium">
                                    <LinkIcon className="w-4 h-4" /> Public Link
                                </button>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => navigate('/admin/builder', { state: { formId: form.id } })} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(form.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
