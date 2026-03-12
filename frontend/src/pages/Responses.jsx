import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllResponses, getForms } from '../utils/storage';

export default function Responses() {
    const [responses, setResponses] = useState([]);
    const [forms, setForms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [resps, loadedForms] = await Promise.all([
                    getAllResponses(),
                    getForms()
                ]);
                setResponses(resps || []);
                setForms(loadedForms || []);
            } catch (err) {
                console.error("Failed to load responses:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getFormTitle = (formId) => {
        const form = forms.find(f => f.id === formId);
        return form ? form.title : formId;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/admin')} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 bg-white">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">Form Responses</h1>
                </div>

                {isLoading ? (
                    <div className="bg-white p-12 rounded-xl border border-gray-200 text-center flex justify-center items-center">
                        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                ) : responses.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                        <p className="text-gray-500">No responses collected yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium text-sm text-left">
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Form</th>
                                    <th className="p-4">Answers Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {responses.map((resp, i) => (
                                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-4 text-sm text-gray-600 whitespace-nowrap align-top">
                                            {new Date(resp.created_at || resp.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-900 align-top">
                                            {getFormTitle(resp.form_id || resp.formId)}
                                        </td>
                                        <td className="p-4 align-top">
                                            {resp.quiz_score !== undefined && resp.quiz_score !== null && (
                                                <div className="mb-3 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg inline-flex items-center gap-2 text-xs font-bold border border-primary-100">
                                                    Score: {resp.quiz_score}
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                {Object.entries(resp.answers || {}).map(([key, val]) => (
                                                    <div key={key} className="text-sm">
                                                        <span className="font-semibold text-gray-700">{key}: </span>
                                                        <span className="text-gray-600">
                                                            {typeof val === 'string' && val.startsWith('http') ? (
                                                                <a href={val} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">View File</a>
                                                            ) : Array.isArray(val) ? val.join(', ') : String(val)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
