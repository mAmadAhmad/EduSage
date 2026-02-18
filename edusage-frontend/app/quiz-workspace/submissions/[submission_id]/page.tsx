'use client'; 

import { useState, useEffect } from 'react';
import GradingInterface, { SubmissionDetails } from './GradingInterface';

export default function GradingPage({ params }: { params: { submission_id: string } }) {
    const [details, setDetails] = useState<SubmissionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
                const res = await fetch(`${backendUrl}/submissions/${params.submission_id}`, {
                    cache: 'no-store',
                    credentials: 'include',
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

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
        </div>
    );
    
    if (error) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 text-red-500">
            Error: {error}
        </div>
    );
    
    if (!details) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
            Submission Not Found
        </div>
    );

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-12">
            <GradingInterface initialDetails={details} />
        </main>
    );
}