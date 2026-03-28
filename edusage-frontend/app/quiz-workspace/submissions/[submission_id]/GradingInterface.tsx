'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    ArrowLeft, 
    BrainCircuit, 
    CheckCircle, 
    XCircle, 
    BarChart3, 
    Tag, 
    Save, 
    Loader2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- Types ---

// Structure of questions coming from the Submission Details endpoint
interface GradedQuestion {
    question_id: number;
    question_text: string;
    question_type: string;
    student_answer: string;
    correct_answer: string;
}

export interface SubmissionDetails {
    submission_id: number;
    student_name: string;
    quiz_id: number;
    quiz_title: string;
    questions: GradedQuestion[];
}

// Helper types for AI Data
interface Breakdown {
    semantic_score: number;
    keyword_score: number;
    llm_score: number;
}

interface Keywords {
    matched: string[];
    missing: string[];
}

// Structure of the Graded Answer coming from the Report endpoint
// Now includes 'id' which is the database primary key for the graded_answer row
interface GradedAnswerResponse {
    id: number; 
    question_id: number;
    question_text: string;
    score: number;
    feedback: string;
    breakdown?: Breakdown;
    keywords?: Keywords;
}

interface GradingReport {
    overall_feedback: string;
    graded_answers: GradedAnswerResponse[];
}

export default function GradingInterface({ initialDetails }: { initialDetails: SubmissionDetails }) {
    const [details] = useState<SubmissionDetails>(initialDetails);
    const [isGrading, setIsGrading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [report, setReport] = useState<GradingReport | null>(null);
    const router = useRouter();

    // 1. Function to Trigger AI Auto-Grading
    const handleAutoGrade = async () => {
        setIsGrading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
            const res = await fetch(`${backendUrl}/submissions/${initialDetails.submission_id}/grade`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grading_criteria: "Hybrid" }),
            });

            if (!res.ok) throw new Error('Grading failed');
            
            // We now directly set the DRAFT report returned by the POST
            const draftReport = await res.json();
            setReport(draftReport);
            
        } catch (error) {
            alert('An error occurred during AI drafting.');
        } finally {
            setIsGrading(false);
        }
    };
    // 2. Function to Handle Manual Score Edits (Local State Update)
    const handleScoreChange = (gradedAnswerId: number, newScore: string) => {
        if (!report) return;
        
        // Allow user to type decimal points, but safeguard parsing
        const scoreVal = parseFloat(newScore);
        
        // We create a new array with the updated score for the specific answer
        const updatedAnswers = report.graded_answers.map(ans => {
            if (ans.id === gradedAnswerId) {
                // If it's NaN (empty string), we keep it as 0 or the previous value to avoid UI breaking, 
                // but usually input type="number" handles this well.
                return { ...ans, score: isNaN(scoreVal) ? 0 : scoreVal };
            }
            return ans;
        });
        
        setReport({ ...report, graded_answers: updatedAnswers });
    };

    // 3. Function to Save Changes to Backend
    const handleSaveChanges = async () => {
        if (!report) return;
        setIsSaving(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
            
            // Map state to BatchGradeUpdate schema. 
            // Note: In draft state, ans.id is actually the original answer.id.
            const updates = report.graded_answers.map(ans => ({
                graded_answer_id: ans.id, 
                score: ans.score,
                feedback: ans.feedback 
            }));

            const res = await fetch(`${backendUrl}/submissions/${initialDetails.submission_id}/grades`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates }),
            });

            if (!res.ok) throw new Error('Failed to save');
            
            alert('Grades published successfully! Students can now view their results.');
            router.push(`/quiz-workspace/quiz/${details.quiz_id}/submissions`);

        } catch (error) {
            alert('Failed to publish grades.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto pb-24">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Link 
                        href={`/quiz-workspace/quiz/${details.quiz_id}/submissions`} 
                        className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-2 font-medium"
                    >
                        <ArrowLeft size={18} /> Back to Submissions
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">{details.student_name}</h1>
                    <p className="text-gray-500">Submission for: {details.quiz_title}</p>
                </div>
                
                <button 
                    onClick={handleAutoGrade} 
                    disabled={isGrading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-70"
                >
                    {isGrading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                    {isGrading ? 'AI Analysis Running...' : 'Run Auto-Grading'}
                </button>
            </div>

            {/* Questions List */}
            <div className="space-y-8">
                {details.questions.map((q, index) => {
                    // Match the Question from details to the Result from the report
                    // Matching by question_text ensures we align correctly even if IDs are tricky on the frontend
                    const result = report?.graded_answers.find(ga => ga.question_text === q.question_text);
                    
                    return (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            
                            {/* Question Header */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-start">
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-sm shadow-sm">
                                        Q{index + 1}
                                    </span>
                                    <h3 className="text-lg font-semibold text-gray-900 pt-0.5">{q.question_text}</h3>
                                </div>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase rounded border border-gray-200">
                                    {q.question_type}
                                </span>
                            </div>

                            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Column: Answers */}
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Student Answer</p>
                                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-gray-900 text-sm min-h-[60px] whitespace-pre-wrap">
                                            {q.student_answer || <span className="text-gray-400 italic">No answer provided</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Correct Answer</p>
                                        <div className="p-4 bg-green-50/50 border border-green-100 rounded-lg text-gray-900 text-sm min-h-[60px] whitespace-pre-wrap">
                                            {q.correct_answer}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: AI Analysis & Grading */}
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 relative">
                                    {!result ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                            <BrainCircuit size={48} className="mb-2 opacity-20" />
                                            <p className="text-sm font-medium">Run Auto-Grading to see analysis</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Score Header */}
                                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <BrainCircuit size={18} className="text-purple-600" />
                                                    <span className="font-bold text-gray-700">AI Assessment</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500 font-medium">Score:</span>
                                                    {/* EDITABLE SCORE INPUT */}
                                                    <input 
                                                        type="number" 
                                                        value={result.score}
                                                        onChange={(e) => handleScoreChange(result.id, e.target.value)}
                                                        className="w-20 p-1 text-center font-bold text-lg border border-gray-300 rounded text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                                        step="0.5"
                                                        max="10"
                                                        min="0"
                                                    />
                                                    <span className="text-gray-400">/ 10</span>
                                                </div>
                                            </div>

                                            {/* Metrics Visualization (Only for Subjective Questions where breakdown exists) */}
                                            {result.breakdown && (
                                                <div className="space-y-4 mb-6">
                                                    {/* Semantic Bar */}
                                                    <div>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                                <BarChart3 size={12} /> Semantic Match
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-700">{Math.round(result.breakdown.semantic_score * 100)}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div 
                                                                className={`h-1.5 rounded-full ${result.breakdown.semantic_score > 0.8 ? 'bg-green-500' : result.breakdown.semantic_score > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                                style={{ width: `${result.breakdown.semantic_score * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    {/* Keyword Tags */}
                                                    <div>
                                                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2">
                                                            <Tag size={12} /> Keywords
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {result.keywords?.matched?.map((k: string, idx: number) => (
                                                                <span key={`m-${idx}`} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded flex items-center gap-1">
                                                                    <CheckCircle size={8} /> {k}
                                                                </span>
                                                            ))}
                                                            {result.keywords?.missing?.map((k: string, idx: number) => (
                                                                <span key={`ms-${idx}`} className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded flex items-center gap-1">
                                                                    <XCircle size={8} /> {k}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Feedback Text */}
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">AI Feedback</p>
                                                <p className="text-sm text-gray-600 leading-relaxed">{result.feedback}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Floating Save Button */}
            {report && (
                <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button 
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-4 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-700 hover:scale-105 transition-all disabled:opacity-70 disabled:scale-100"
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        {isSaving ? 'Saving...' : 'Save Final Grades'}
                    </button>
                </div>
            )}
        </div>
    );
}