'use client';

import { useState } from 'react';
import Link from 'next/link';

// Define the types for our data
interface GradedQuestion {
    question_id: number;
    question_text: string;
    student_answer: string;
    correct_answer: string;
}
interface SubmissionDetails {
    submission_id: number;
    student_name: string;
    quiz_id: number;
    quiz_title: string;
    questions: GradedQuestion[];
}

// Define a type for the AI grading report
interface GradedAnswerReport {
    question_id: number;
    score: number;
    feedback: string;
}
interface GradingReport{
    overall_feedback: string;
    graded_answers: GradedAnswerReport[]
}

export default function GradingInterface({ initialDetails }: { initialDetails: SubmissionDetails }) {
    const [details] = useState<SubmissionDetails>(initialDetails);
    const [visibleAnswers, setVisibleAnswers] = useState<Record<number, boolean>>({});
    const [gradingCriteria, setGradingCriteria] = useState('Score each question out of 10. Be encouraging.');
    const [isGrading, setIsGrading] = useState(false);
    const [gradingReport, setGradingReport] = useState<GradingReport | null>(null);

    const handleAIGrade = async () => {
        setIsGrading(true);
        setGradingReport(null);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
            const res = await fetch(`${backendUrl}/submissions/${initialDetails.submission_id}/grade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grading_criteria: gradingCriteria }),
            });
            if (!res.ok) throw new Error('AI grading failed');
            setGradingReport(await res.json());
        } catch (error) {
            alert('An error occurred during AI grading.');
        } finally {
            setIsGrading(false);
        }
    };

    const toggleAnswerVisibility = (questionId: number) => {
        setVisibleAnswers(prev => ({ ...prev, [questionId]: !prev[questionId] }));
    };

    return (
        <div className="w-full max-w-4xl">
            <div className="mb-8">
                <Link href={`/dashboard/quiz/${details.quiz_id}/submissions`} className="text-blue-600 hover:underline">
                    &larr; Back to All Submissions
                </Link>
                <h1 className="text-4xl font-bold mt-2">Grading Submission</h1>
                <p className="text-xl text-gray-600">Student: <strong>{details.student_name}</strong></p>
                <p className="text-md text-gray-500">Quiz: {details.quiz_title}</p>
            </div>

            <div className="space-y-6">
                {details.questions.map((q, index) => (
                    <div key={q.question_id} className="bg-white p-6 rounded-lg shadow-md border">
                        <p className="font-bold text-lg text-gray-800">Question {index + 1}: {q.question_text}</p>
                        <div className="mt-4">
                            <p className="font-semibold text-blue-700">Student's Answer</p>
                            <p className="p-3 bg-blue-50 border border-blue-200 rounded mt-1 whitespace-pre-wrap text-gray-900">{q.student_answer}</p>
                        </div>
                        <div className="mt-4">
                            <button onClick={() => toggleAnswerVisibility(q.question_id)} className="text-sm text-gray-600 hover:underline">
                                {visibleAnswers[q.question_id] ? 'Hide' : 'Show'} Correct Answer
                            </button>
                            {visibleAnswers[q.question_id] && (
                                <p className="p-3 bg-green-50 border border-green-200 rounded mt-1 whitespace-pre-wrap text-gray-900">{q.correct_answer}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="my-8 p-4 border rounded-lg bg-white shadow-sm">
                <label htmlFor="criteria" className="font-semibold text-gray-700">Grading Criteria for AI</label>
                <textarea
                    id="criteria"
                    value={gradingCriteria}
                    onChange={(e) => setGradingCriteria(e.target.value)}
                    className="w-full mt-2 p-2 border rounded text-gray-900"
                    rows={3}
                />
                <button onClick={handleAIGrade} disabled={isGrading} className="mt-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:bg-gray-400">
                    {isGrading ? 'Grading...' : 'Grade with AI'}
                </button>
            </div>

            {/* --- NEW: Display the AI Grading Report --- */}
            {gradingReport && (
                <div className="my-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h2 className="text-2xl font-bold text-yellow-800">AI Grading Report</h2>
                    <p className="mt-2 italic"><strong>Overall Feedback:</strong> {gradingReport.overall_feedback}</p>
                </div>
            )}
            
            <div className="space-y-6">
                {details.questions.map((q, index) => {
                    const gradedAnswer = gradingReport?.graded_answers.find(ga => ga.question_id === q.question_id);
                    return (
                        <div key={q.question_id} className="bg-white p-6 rounded-lg shadow-md border">
                            {/* ... (Question text, student answer, and correct answer toggle are the same) ... */}

                            {/* --- NEW: Display AI score and feedback for each question --- */}
                            {gradedAnswer && (
                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="font-bold text-yellow-800">AI Score: {gradedAnswer.score}</p>
                                    <p className="mt-1 italic text-yellow-700">{gradedAnswer.feedback}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}