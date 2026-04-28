'use client'; 

import { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import GradingInterface, { SubmissionDetails } from './GradingInterface';

/**
 * GradingPage Component
 * * Server-side wrapper that fetches a specific student's submission details.
 * Hydrates the interactive GradingInterface with the retrieved data.
 * * @param {Object} params - URL parameters containing the submission_id.
 */
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
                    if (res.status === 401) throw new Error('Unauthorized access. Please log in.');
                    throw new Error('Failed to fetch submission details.');
                }
                setDetails(await res.json());
            } catch (err) {
                 setError(err instanceof Error ? err.message : 'Failed to load submission.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [params.submission_id]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-3 text-purple-600">
                <Loader2 className="animate-spin" size={40} />
                <p className="text-sm font-medium text-gray-500">Loading submission data...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="flex items-center gap-3 px-6 py-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <AlertCircle size={24} />
                <p className="font-medium">{error}</p>
            </div>
        </div>
    );
    
    if (!details) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500 font-medium">
            Submission Not Found
        </div>
    );

    return (
        <main className="min-h-screen bg-gray-50 p-6 md:p-12">
            <GradingInterface initialDetails={details} />
        </main>
    );
}