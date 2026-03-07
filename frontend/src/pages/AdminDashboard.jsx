import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getForms, getResponsesLocal, deleteForm } from '../utils/storage';
import { PlusCircle, Edit, Trash2, Link as LinkIcon, FileText, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
    const [forms, setForms] = useState([]);
    const [responsesCount, setResponsesCount] = useState(0);
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const fetchForms = async () => {
        const fetchedForms = await getForms();
        setForms(fetchedForms);
    };

    useEffect(() => {
        fetchForms();
        setResponsesCount(getResponsesLocal().length);
    }, []);

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this form?')) {
            await deleteForm(id);
            await fetchForms();
        }
    };

    return (
        <div className="min-h-screen p-8 max-w-5xl mx-auto bg-gray-50">
            <header className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                <h1 className="text-3xl font-bold text-gray-900">Form Builder Dashboard</h1>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        <User className="w-4 h-4 text-primary-600" />
                        <span className="truncate max-w-[150px] font-medium">{user?.email}</span>
                    </div>
                    <button onClick={signOut} className="text-gray-500 hover:text-red-600 flex items-center gap-1 text-sm font-medium transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </header>

            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-900">Overview</h2>
                <div className="flex gap-4">
                    <Link to="/responses" className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all font-medium text-gray-700">
                        <FileText className="w-5 h-5" /> View Responses ({responsesCount})
                    </Link>
                    <Link to="/create" className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-sm hover:bg-primary-700 flex items-center gap-2 transition-all font-bold">
                        <PlusCircle className="w-5 h-5" /> Create AI Form
                    </Link>
                    <button onClick={() => navigate('/admin/builder')} className="px-4 py-2 bg-gray-900 text-white rounded-lg shadow-sm hover:bg-black flex items-center gap-2 transition-all font-bold">
                        <Edit className="w-5 h-5" /> Empty Builder
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Total Forms</p>
                    <p className="text-4xl font-black text-gray-900">{forms.length}</p>
                </div>
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Total Responses</p>
                    <p className="text-4xl font-black text-gray-900">{responsesCount}</p>
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Forms</h2>

            {forms.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-6 text-lg">You haven't created any forms yet.</p>
                    <Link to="/create" className="px-6 py-3 bg-primary-50 text-primary-700 font-bold rounded-xl hover:bg-primary-100 transition-colors inline-block text-lg">
                        Generate your first form with AI &rarr;
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {forms.map(form => (
                        <div key={form.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                            <div className="flex-1">
                                <h3 className="font-bold text-xl mb-3 text-gray-900 line-clamp-2 leading-tight">{form.title || 'Untitled Form'}</h3>
                                <p className="text-sm font-medium text-gray-500 bg-gray-50 inline-block px-3 py-1 rounded-full mb-6">
                                    {form.questions?.length || 0} questions
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <button onClick={() => navigate(`/forms/${form.id}`)} className="text-primary-600 hover:text-primary-700 flex items-center gap-1.5 text-sm font-bold transition-colors bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg">
                                    <LinkIcon className="w-4 h-4" /> Open
                                </button>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => navigate('/admin/builder', { state: { formId: form.id } })} className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-transparent hover:border-primary-100" title="Edit Form">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(form.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Delete Form">
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
