'use client'; 

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Keep the interfaces
interface GradedAnswerReport { question_text: string; student_answer: string; correct_answer: string; score: number; feedback: string; }
interface GradeReportResponse { student_name: string; quiz_title: string; overall_score: number | null; overall_feedback: string | null; graded_answers: GradedAnswerReport[]; }

export default function ResultsPage({ params }: { params: { submission_id: string } }) {
    const [report, setReport] = useState<GradeReportResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            // NOTE: This endpoint might become protected later depending on your access rules
            const token = localStorage.getItem('accessToken'); // Assuming student needs to be logged in
            // if (!token) { setError('Not logged in.'); setLoading(false); return; }

            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
                const res = await fetch(`${backendUrl}/submissions/${params.submission_id}/report`, {
                    cache: 'no-store',
                    credentials: 'include',
                });
                 if (!res.ok) {
                    if (res.status === 401) throw new Error('Unauthorized');
                    if (res.status === 404) throw new Error('Report not available yet.');
                    throw new Error('Failed to fetch grade report');
                }
                setReport(await res.json());
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load report');
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [params.submission_id]);

    if (loading) return <p className="text-center mt-20">Loading Grade Report...</p>;
    if (error) return <p className="text-center mt-20 text-red-500">Error: {error}</p>;
    if (!report) return <p className="text-center mt-20">Grade Report Not Found</p>;

    const totalPossibleScore = report.graded_answers.length * 10;
    const totalScored = report.graded_answers.reduce((sum, qa) => sum + qa.score, 0);

    return (
        <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-50">
            <div className="w-full max-w-4xl">
                <div className="bg-white p-6 rounded-lg shadow-md border mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Your Graded Quiz</h1>
                    <p className="text-xl text-gray-600">Student: <strong>{report.student_name}</strong></p>
                    <p className="text-md text-gray-500">Quiz: {report.quiz_title}</p>
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h2 className="text-2xl font-bold text-yellow-800">Final Score: {totalScored} / {totalPossibleScore}</h2>
                        <p className="mt-2 italic"><strong>Overall Feedback from AI:</strong> {report.overall_feedback}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {report.graded_answers.map((q, index) => (
                        <div key={index} className="bg-white p-6 rounded-lg shadow-md border">
                            <p className="font-bold text-lg text-gray-800">Question {index + 1}: {q.question_text}</p>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <p className="font-semibold text-blue-700">Your Answer</p>
                                    <p className="p-3 bg-blue-50 border border-blue-200 rounded mt-1 whitespace-pre-wrap text-gray-900">{q.student_answer}</p>
                                </div>
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="font-bold text-yellow-800">AI Score: {q.score} / 10</p>
                                    <p className="mt-1 italic text-yellow-700"><strong>Feedback:</strong> {q.feedback}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
