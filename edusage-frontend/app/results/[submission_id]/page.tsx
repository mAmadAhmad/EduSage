// app/results/[submission_id]/page.tsx
import Link from 'next/link';

// Define types to match our new API response
interface GradedAnswerReport {
    question_text: string;
    student_answer: string;
    correct_answer: string;
    score: number;
    feedback: string;
}
interface GradeReportResponse {
    student_name: string;
    quiz_title: string;
    overall_score: number | null;
    overall_feedback: string | null;
    graded_answers: GradedAnswerReport[];
}

async function getGradeReport(submissionId: string): Promise<GradeReportResponse | null> {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/submissions/${submissionId}/report`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch grade report');
        return res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

export default async function ResultsPage({ params: { submission_id } }: { params: { submission_id: string } }) {
    const report = await getGradeReport(submission_id);

    if (!report) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-24">
                <h1 className="text-2xl font-bold">Grade Report Not Found</h1>
                <p className="text-gray-500 mt-2">The report may not be available yet or the link is invalid.</p>
            </main>
        );
    }
    
    const totalPossibleScore = report.graded_answers.length * 10; // Assuming each question is out of 10
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