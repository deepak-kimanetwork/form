import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layout, Sparkles, Star, Users, Briefcase, Mail, Calendar, MessageSquare, ClipboardCheck, Info, Gift } from 'lucide-react';

const templates = [
    {
        id: 'tpl_restaurant',
        title: 'Restaurant Feedback',
        description: 'Collect customer reviews on food quality, service, and ambiance.',
        icon: <Star className="w-6 h-6" />,
        color: 'bg-orange-100 text-orange-600',
        questions: [
            { id: 'q1', type: 'rating', label: 'How was the food quality?', required: true },
            { id: 'q2', type: 'rating', label: 'How was the service?', required: true },
            { id: 'q3', type: 'multiple-choice', label: 'What was your favorite dish?', options: ['Pasta', 'Pizza', 'Salad', 'Dessert'], hasOther: true },
            { id: 'q4', type: 'textarea', label: 'Any specific feedback for us?', required: false }
        ]
    },
    {
        id: 'tpl_job',
        title: 'Job Application',
        description: 'Streamline your hiring process with a clean application form.',
        icon: <Briefcase className="w-6 h-6" />,
        color: 'bg-blue-100 text-blue-600',
        questions: [
            { id: 'q1', type: 'text', label: 'Full Name', required: true },
            { id: 'q2', type: 'email', label: 'Email Address', required: true },
            { id: 'q3', type: 'select', label: 'Position applying for', options: ['Frontend Developer', 'Backend Developer', 'Product Manager', 'Designer'], required: true },
            { id: 'q4', type: 'file-upload', label: 'Upload your CV (PDF)', required: true },
            { id: 'q5', type: 'textarea', label: 'Why do you want to work with us?', required: true }
        ]
    },
    {
        id: 'tpl_contact',
        title: 'Simple Contact Form',
        description: 'A classic contact form for any website.',
        icon: <Mail className="w-6 h-6" />,
        color: 'bg-green-100 text-green-600',
        questions: [
            { id: 'q1', type: 'text', label: 'Name', required: true },
            { id: 'q2', type: 'email', label: 'Email', required: true },
            { id: 'q3', type: 'textarea', label: 'Message', required: true }
        ]
    },
    {
        id: 'tpl_event',
        title: 'Event Registration',
        description: 'Perfect for workshops, meetups, or conferences.',
        icon: <Calendar className="w-6 h-6" />,
        color: 'bg-purple-100 text-purple-600',
        questions: [
            { id: 'q1', type: 'text', label: 'Attendee Name', required: true },
            { id: 'q2', type: 'email', label: 'Email', required: true },
            { id: 'q3', type: 'multiple-choice', label: 'Workshops attending', options: ['Morning Session', 'Afternoon Session', 'Networking Event'], allowMultiple: true },
            { id: 'q4', type: 'select', label: 'Dietary requirements', options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free'] }
        ]
    },
    {
        id: 'tpl_quiz',
        title: 'General Knowledge Quiz',
        description: 'Showcase the new Quiz Mode with this template.',
        icon: <Sparkles className="w-6 h-6" />,
        color: 'bg-yellow-100 text-yellow-600',
        isQuiz: true,
        questions: [
            { id: 'q1', type: 'multiple-choice', label: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], correctAnswer: 'Paris', required: true },
            { id: 'q2', type: 'multiple-choice', label: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctAnswer: 'Mars', required: true },
            { id: 'q3', type: 'number', label: 'How many continents are there?', correctAnswer: '7', required: true }
        ]
    },
    {
        id: 'tpl_rsvp',
        title: 'Party RSVP',
        description: 'Manage guest lists for parties and gatherings.',
        icon: <Users className="w-6 h-6" />,
        color: 'bg-pink-100 text-pink-600',
        questions: [
            { id: 'q1', type: 'yes-no', label: 'Will you be attending?', required: true },
            { id: 'q2', type: 'number', label: 'Total number of guests', required: true },
            { id: 'q3', type: 'textarea', label: 'Song requests?', required: false }
        ]
    },
    {
        id: 'tpl_support',
        title: 'Customer Support',
        description: 'High-efficiency support ticket intake.',
        icon: <MessageSquare className="w-6 h-6" />,
        color: 'bg-red-100 text-red-600',
        questions: [
            { id: 'q1', type: 'select', label: 'Issue Category', options: ['Billing', 'Technical', 'General Inquiry', 'Feature Request'], required: true },
            { id: 'q2', type: 'text', label: 'Subject', required: true },
            { id: 'q3', type: 'textarea', label: 'Description of the issue', required: true },
            { id: 'q4', type: 'file-upload', label: 'Screenshot (Optional)' }
        ]
    }
];

export default function Templates() {
    const navigate = useNavigate();

    const handleSelect = (tpl) => {
        const schema = {
            title: tpl.title,
            questions: tpl.questions,
            theme: {
                primaryColor: tpl.id === 'tpl_restaurant' ? '#f97316' : '#22c55e',
                isQuizMode: tpl.isQuiz || false
            },
            sections: [{ id: 'sec_1', title: 'Start' }]
        };
        navigate('/admin/builder', { state: { generatedSchema: schema } });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 sm:p-12">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="text-left">
                        <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-800 mb-6 flex items-center gap-2 text-sm font-medium">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </button>
                        <h1 className="text-4xl font-black text-gray-900 mb-2">Form Templates</h1>
                        <p className="text-gray-500 text-lg">Choose a template to jumpstart your direct form creation.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {templates.map(tpl => (
                        <div key={tpl.id} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${tpl.color}`}>
                                {tpl.icon}
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-3">{tpl.title}</h3>
                            <p className="text-gray-500 mb-8 flex-1 leading-relaxed">{tpl.description}</p>
                            <button 
                                onClick={() => handleSelect(tpl)}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                Use Template <sparkles className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    
                    <div className="bg-primary-50 rounded-3xl p-8 border-2 border-dashed border-primary-200 flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 bg-primary-600 text-white rounded-2xl flex items-center justify-center mb-6">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-primary-900 mb-3">Custom AI Form</h3>
                        <p className="text-primary-700/70 mb-8">Can't find what you need? Let AI build a custom form for you.</p>
                        <button 
                            onClick={() => navigate('/create')}
                            className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all"
                        >
                            Generate with AI
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
