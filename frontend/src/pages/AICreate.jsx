import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react';

export default function AICreate() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setError('');

        try {
            const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const apiUrl = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
            const response = await fetch(`${apiUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || 'Failed to generate form. Ensure backend is running and Gemini key is set.';
                throw new Error(errorMessage);
            }

            const generatedSchema = await response.json();

            // Navigate to the builder with the generated schema in state
            navigate('/admin/builder', { state: { generatedSchema, prompt } });
        } catch (err) {
            console.error(err);
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-800 mb-6 flex items-center gap-2 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-primary-100 text-primary-600 rounded-xl">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Generate with AI</h1>
                    </div>
                    <p className="text-gray-500 mb-8 ml-14">Describe the form you want to create and let AI build it instantly. Or <button onClick={() => navigate('/templates')} className="text-primary-600 font-bold hover:underline">browse templates</button></p>

                    <form onSubmit={handleGenerate}>
                        <div className="mb-6">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. Create a customer feedback survey for my new Italian restaurant emphasizing food quality and service."
                                className="w-full h-40 p-5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 outline-none resize-none text-lg transition-all"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !prompt.trim()}
                            className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Generating Magic...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-6 h-6" />
                                    Generate Form
                                </>
                            )}
                        </button>
                    </form>
                </div>
                <div className="bg-gray-50 p-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 text-center">
                        Powered by Google Gemini API
                    </p>
                </div>
            </div>
        </div>
    );
}
