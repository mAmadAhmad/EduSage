// app/dashboard/submissions/[submission_id]/page.tsx

import GradingInterface from './GradingInterface';

// Define the type for the data we fetch
interface SubmissionDetails {
    submission_id: number;
    student_name: string;
    quiz_id: number;
    quiz_title: string;
    questions: any[];
}

async function getSubmissionDetails(submissionId: string): Promise<SubmissionDetails | null> {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/submissions/${submissionId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch submission details');
        return res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

export default async function GradingPage({ params: { submission_id } }: { params: { submission_id: string } }) {
    const details = await getSubmissionDetails(submission_id);

    if (!details) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-24">
                <h1 className="text-2xl font-bold">Submission Not Found</h1>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center p-12 md:p-24 bg-gray-50">
            <GradingInterface initialDetails={details} />
        </main>
    );
}