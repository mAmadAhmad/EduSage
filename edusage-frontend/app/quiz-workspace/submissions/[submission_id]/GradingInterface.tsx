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
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface GradedQuestion {
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

interface Breakdown {
    semantic_score: number;
    keyword_score: number;
    llm_score: number;
}

interface Keywords {
    matched: string[];
    missing: string[];
}

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

/**
 * GradingInterface Component
 * * Provides the UI for teachers to review student answers, trigger AI auto-grading,
 * and manually override scores. Handles complex state mapping between draft 
 * AI reports and final committed grades.
 * * @param {SubmissionDetails} initialDetails - The hydrated submission object.
 */
export default function GradingInterface({ initialDetails }: { initialDetails: SubmissionDetails }) {
    const router = useRouter();
    const [details] = useState<SubmissionDetails>(initialDetails);
    
    // Processing States
    const [isGrading, setIsGrading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [report, setReport] = useState<GradingReport | null>(null);

    // UI Toast State
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const triggerToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    /**
     * Calls the backend AI evaluation endpoint to draft a grading report.
     */
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
            
            const draftReport = await res.json();
            setReport(draftReport);
            triggerToast('success', 'AI Analysis complete. Review draft below.');
        } catch (error) {
            console.error('Auto-grading error:', error);
            triggerToast('error', 'An error occurred during AI drafting.');
        } finally {
            setIsGrading(false);
        }
    };

    /**
     * Updates the local state when a teacher manually overrides a score.
     */
    const handleScoreChange = (gradedAnswerId: number, newScore: string) => {
        if (!report) return;
        
        const scoreVal = parseFloat(newScore);
        
        const updatedAnswers = report.graded_answers.map(ans => {
            if (ans.id === gradedAnswerId) {
                return { ...ans, score: isNaN(scoreVal) ? 0 : scoreVal };
            }
            return ans;
        });
        
        setReport({ ...report, graded_answers: updatedAnswers });
    };

    /**
     * Commits the reviewed draft report to the database.
     */
    const handleSaveChanges = async () => {
        if (!report) return;
        setIsSaving(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
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
            
            triggerToast('success', 'Grades published! Redirecting...');
            
            // Brief delay so user sees the success toast before navigation
            setTimeout(() => {
                router.push(`/quiz-workspace/quiz/${details.quiz_id}/submissions`);
            }, 1500);

        } catch (error) {
            console.error('Save error:', error);
            triggerToast('error', 'Failed to publish grades. Please try again.');
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto pb-24 relative">
            
            {/* Fixed Toast Notification (Top Right to avoid FAB collision) */}
            {toast && (
                <div className={`fixed top-24 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-8 ${
                    toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span className="font-medium text-sm">{toast.message}</span>
                </div>
            )}

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
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-70 disabled:hover:scale-100"
                >
                    {isGrading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
                    {isGrading ? 'AI Analysis Running...' : 'Run Auto-Grading'}
                </button>
            </div>

            {/* Questions List */}
            <div className="space-y-8">
                {details.questions.map((q, index) => {
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

                                            {/* Metrics Visualization */}
                                            {result.breakdown && (
                                                <div className="space-y-4 mb-6">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                                <BarChart3 size={12} /> Semantic Match
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-700">{Math.round(result.breakdown.semantic_score * 100)}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div 
                                                                className={`h-1.5 rounded-full transition-all duration-500 ${result.breakdown.semantic_score > 0.8 ? 'bg-green-500' : result.breakdown.semantic_score > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                                style={{ width: `${result.breakdown.semantic_score * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

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
            
            {/* Floating Action Button (FAB) for Saving */}
            {report && (
                <div className="fixed bottom-8 right-8 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button 
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-4 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-700 hover:scale-105 transition-all disabled:opacity-70 disabled:scale-100"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {isSaving ? 'Saving...' : 'Save Final Grades'}
                    </button>
                </div>
            )}
        </div>
    );
}