'use client'; // Make it a Client Component

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
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
                const res = await fetch(`${backendUrl}/submissions/${params.submission_id}/report`, {
                    cache: 'no-store',
                    // headers: { 'Authorization': `Bearer ${token}` } // Add if endpoint becomes protected
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
        // ... (Your existing JSX for displaying the report remains the same) ...
        <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-50">
           {/* ... */}
        </main>
    );
}