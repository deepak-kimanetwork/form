import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getResponsesLocal, getForms } from '../utils/storage';

export default function Responses() {
    const [responses, setResponses] = useState([]);
    const [forms, setForms] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        setResponses(getResponsesLocal().reverse());
        setForms(getForms());
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

                {responses.length === 0 ? (
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
                                            {new Date(resp.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-gray-900 align-top">
                                            {getFormTitle(resp.formId)}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="space-y-2">
                                                {Object.entries(resp.answers || {}).map(([key, val]) => (
                                                    <div key={key} className="text-sm">
                                                        <span className="font-semibold text-gray-700">{key}: </span>
                                                        <span className="text-gray-600">{Array.isArray(val) ? val.join(', ') : val}</span>
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
