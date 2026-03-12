import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Book, Sparkles, Shield, Users, Mail, 
    BarChart, Layout, Link as LinkIcon, Download, 
    Lock, Clock, Zap, FileText, Globe, CheckCircle
} from 'lucide-react';

const DOCUMENTATION = [
    {
        id: 'overview',
        title: 'Overview',
        icon: <Book className="w-6 h-6" />,
        color: 'bg-blue-100 text-blue-600',
        content: `AI Form Builder is a powerful, next-generation form creation tool that combines Artificial Intelligence with deep data insights. 
        Whether you're collecting simple feedback or managing high-stakes recruitment, our tool provides the security, flexibility, and automation you need.`
    },
    {
        id: 'ai-features',
        title: 'AI Intelligence',
        icon: <Sparkles className="w-6 h-6" />,
        color: 'bg-purple-100 text-purple-600',
        features: [
            {
                name: 'AI Form Generation',
                desc: 'Simply describe your goal (e.g., "A pizza order form") and let Gemini build the entire structure instantly.'
            },
            {
                name: 'Dynamic Translation',
                desc: 'Respondents can translate forms into 20+ languages in real-time without you manually translating a single word.'
            },
            {
                name: 'Intelligent Logic',
                desc: 'AI helps suggest logic jumps and question types based on your form\'s intent.'
            }
        ]
    },
    {
        id: 'security',
        title: 'Security & Control',
        icon: <Shield className="w-6 h-6" />,
        color: 'bg-red-100 text-red-600',
        features: [
            {
                name: 'Password Protection',
                desc: 'Gate sensitive forms behind a password to ensure only authorized individuals can respond.'
            },
            {
                name: 'Deadlines & Limits',
                desc: 'Automatically close forms on a specific date or after a certain number of responses are collected.'
            },
            {
                name: 'Hidden Fields',
                desc: 'Pass data through URL parameters (like ?ref=ad) to track lead sources without asking the user.'
            }
        ]
    },
    {
        id: 'team',
        title: 'Collaboration',
        icon: <Users className="w-6 h-6" />,
        color: 'bg-green-100 text-green-600',
        features: [
            {
                name: 'Team Sharing',
                desc: 'Invite colleagues via email to view responses or edit form structures collaboratively.'
            },
            {
                name: 'Multi-Dashboard',
                desc: 'Clearly distinguish between forms you own and those shared with you for better organization.'
            }
        ]
    },
    {
        id: 'analytics',
        title: 'Analytics & Insights',
        icon: <BarChart className="w-6 h-6" />,
        color: 'bg-orange-100 text-orange-600',
        features: [
            {
                name: 'Quiz Mode & Scoring',
                desc: 'Automate grading for exams or surveys with correct answers and instant score reporting.'
            },
            {
                name: 'Rich File Support',
                desc: 'View and download respondent-uploaded files directly from your dashboard.'
            },
            {
                name: 'CSV/PDF Exports',
                desc: 'Export your data for external analysis with one click.'
            }
        ]
    }
];

export default function Documentation() {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = useState('overview');

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors border">
                            <ArrowLeft className="w-4 h-4 text-gray-500" />
                        </button>
                        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                             <FileText className="w-5 h-5 text-primary-600" /> App Guide
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Sidebar navigation */}
                    <div className="lg:col-span-1 space-y-2">
                        {DOCUMENTATION.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                                    selectedTab === item.id 
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 border'
                                }`}
                            >
                                <span className={selectedTab === item.id ? 'text-white' : item.color.split(' ')[1]}>
                                    {item.icon}
                                </span>
                                {item.title}
                            </button>
                        ))}
                    </div>

                    {/* Content area */}
                    <div className="lg:col-span-3">
                        {DOCUMENTATION.map(item => item.id === selectedTab && (
                            <div key={item.id} className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm mb-8">
                                    <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                        <span className={`p-2 rounded-xl ${item.color.split(' ')[0]}`}>{item.icon}</span>
                                        {item.title}
                                    </h2>
                                    
                                    {item.content && (
                                        <p className="text-lg text-gray-600 leading-relaxed mb-8">
                                            {item.content}
                                        </p>
                                    )}

                                    {item.features && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {item.features.map((f, i) => (
                                                <div key={i} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary-200 transition-colors group">
                                                    <h3 className="font-black text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                                                        {f.name}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 leading-relaxed">
                                                        {f.desc}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* "How to use" Interactive Section */}
                                <div className="bg-primary-900 text-white p-10 rounded-3xl shadow-xl overflow-hidden relative">
                                    <Zap className="absolute -right-10 -bottom-10 w-64 h-64 text-primary-400 opacity-10 rotate-12" />
                                    <h3 className="text-2xl font-black mb-8">Quick Start: Build your first form</h3>
                                    <div className="space-y-6 relative z-10">
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-white text-primary-900 flex items-center justify-center font-black flex-shrink-0">1</div>
                                            <div>
                                                <p className="font-bold mb-1 text-lg">Go to "Create AI Form"</p>
                                                <p className="text-primary-100">Describe your needs in the prompt box and click generate.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-white text-primary-900 flex items-center justify-center font-black flex-shrink-0">2</div>
                                            <div>
                                                <p className="font-bold mb-1 text-lg">Refine in Editor</p>
                                                <p className="text-primary-100">Add logic jumps, images, or set a password in the Settings tab.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-full bg-white text-primary-900 flex items-center justify-center font-black flex-shrink-0">3</div>
                                            <div>
                                                <p className="font-bold mb-1 text-lg">Share & Collect</p>
                                                <p className="text-primary-100">Click "Save" and share your public link or custom URL.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
