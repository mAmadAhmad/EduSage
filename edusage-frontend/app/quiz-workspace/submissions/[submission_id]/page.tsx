'use client'; // Make it a Client Component

import { useState, useEffect } from 'react';
import GradingInterface from './GradingInterface';

// Keep the interface
interface SubmissionDetails { submission_id: number; student_name: string; quiz_id: number; quiz_title: string; questions: any[]; }

export default function GradingPage({ params }: { params: { submission_id: string } }) {
    const [details, setDetails] = useState<SubmissionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setError('Not logged in.'); setLoading(false); return;
            }
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
                const res = await fetch(`${backendUrl}/submissions/${params.submission_id}`, {
                    cache: 'no-store',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) {
                    if (res.status === 401) throw new Error('Unauthorized');
                    throw new Error('Failed to fetch submission details');
                }
                setDetails(await res.json());
            } catch (err) {
                 setError(err instanceof Error ? err.message : 'Failed to load submission');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [params.submission_id]);

    if (loading) return <p className="text-center mt-20">Loading Submission...</p>;
    if (error) return <p className="text-center mt-20 text-red-500">Error: {error}</p>;
    if (!details) return <p className="text-center mt-20">Submission Not Found</p>;

    return (
        <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-50">
            <GradingInterface initialDetails={details} />
        </main>
    );
}