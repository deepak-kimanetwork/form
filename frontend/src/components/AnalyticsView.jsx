import { useState, useMemo, cloneElement } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, CheckCircle, Clock, TrendingUp, AlertCircle, Download } from 'lucide-react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsView({ formId, responses = [] }) {
    const stats = useMemo(() => {
        if (!responses.length) return { total: 0, completion: 0, avgTime: '0s' };

        const total = responses.length;
        // Mock completion logic (assuming all responses in 'responses' are completed for now)
        const completion = 100;
        const avgTime = "1m 24s";

        return { total, completion, avgTime };
    }, [responses]);

    const chartData = useMemo(() => {
        // Group responses by date
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last7Days.map(date => ({
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            submissions: responses.filter(r => r.timestamp?.startsWith(date)).length
        }));
    }, [responses]);

    const leadDistribution = useMemo(() => {
        // This would normally come from actual analysis, but we'll mock based on local data if any
        // For now, let's just count some dummy categories
        return [
            { name: 'High Value', value: 40 },
            { name: 'Medium Value', value: 35 },
            { name: 'Low Value', value: 25 },
        ];
    }, []);

    const exportToCSV = () => {
        if (!responses.length) return;

        // Get all unique question labels
        const headersSet = new Set(['Timestamp']);
        responses.forEach(r => Object.keys(r.answers).forEach(k => headersSet.add(k)));
        const headers = Array.from(headersSet);

        // Build CSV rows
        const rows = responses.map(r => {
            const rowData = headers.map(header => {
                if (header === 'Timestamp') return new Date(r.created_at || r.timestamp).toLocaleString();
                let val = r.answers[header] || '';
                // Escape quotes and wrap in quotes if there's a comma
                val = String(val).replace(/"/g, '""');
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = `"${val}"`;
                }
                return val;
            });
            return rowData.join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `responses_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!responses.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-xl font-medium">No responses yet</p>
                <p className="text-sm">Share your form to start collecting data.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-bold text-sm transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Responses" value={stats.total} icon={<Users />} color="blue" />
                <StatCard title="Completion Rate" value={`${stats.completion}%`} icon={<CheckCircle />} color="green" />
                <StatCard title="Avg. Time to Complete" value={stats.avgTime} icon={<Clock />} color="yellow" />
                <StatCard title="Total Leads" value={stats.total} icon={<TrendingUp />} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Submissions Over Time */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Submissions (Last 7 Days)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSub)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Lead Quality Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Lead Quality Distribution</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={leadDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {leadDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {leadDistribution.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-xs font-medium text-gray-500">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Responses Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold">Recent Submissions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Time</th>
                                <th className="px-6 py-4 font-semibold">Answers</th>
                                <th className="px-6 py-4 font-semibold">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {responses.slice().reverse().map((res, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(res.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(res.answers).slice(0, 3).map(([key, val]) => (
                                                <span key={key} className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 truncate max-w-[150px]">
                                                    {key}: {String(val)}
                                                </span>
                                            ))}
                                            {Object.keys(res.answers).length > 3 && (
                                                <span className="text-xs text-gray-400">+{Object.keys(res.answers).length - 3} more</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            High
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    {cloneElement(icon, { size: 24 })}
                </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <h4 className="text-3xl font-bold text-gray-900">{value}</h4>
        </div>
    );
}
