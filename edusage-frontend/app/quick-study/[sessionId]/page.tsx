'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Tag, 
  ArrowLeft, 
  BrainCircuit,
  AlertCircle
} from 'lucide-react';

// --- Types for TypeScript Safety ---
interface Breakdown {
  semantic_score: number;
  keyword_score: number;
  llm_score: number;
}

interface Keywords {
  matched: string[];
  missing: string[];
}

interface GradedResult {
  question_id: number;
  score: number;
  feedback: string;
  breakdown?: Breakdown | null;
  keywords?: Keywords | null;
}

interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
}

interface QuickStudySession {
  id: number;
  source_document: string;
  quiz_data: QuizQuestion[];
  report_data?: GradedResult[];
}

export default function QuickStudyPage({ params: { sessionId } }: { params: { sessionId: string } }) {
  const [session, setSession] = useState<QuickStudySession | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${backendUrl}/quick-study/${sessionId}`, {
          credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            setSession(data);
        }
      } catch (e) {
        console.error("Failed to load session", e);
      }
    };
    fetchSession();
  }, [sessionId]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';
    
    // Ensure keys are numbers for the backend schema
    const formattedAnswers: Record<number, string> = {};
    Object.keys(answers).forEach(key => {
        formattedAnswers[parseInt(key)] = answers[parseInt(key)];
    });

    try {
        const res = await fetch(`${backendUrl}/quick-study/${sessionId}/submit`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: formattedAnswers }),
        });
        
        if (res.ok) {
            setSession(await res.json()); 
            window.scrollTo(0, 0);
        } else {
            alert("Failed to submit. Please try again.");
        }
    } catch (e) {
        alert("An error occurred during submission.");
    }
    setSubmitting(false);
  };

  if (!session) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
              <p className="text-gray-500 font-medium">Loading Study Session...</p>
          </div>
      </div>
  );

  // --- VIEW MODE: REPORT (The "Defensible" UI) ---
  if (session.report_data) {
    const totalScore = session.report_data.reduce((acc, curr) => acc + curr.score, 0);
    const maxScore = session.quiz_data.length * 10;
    const percentage = Math.round((totalScore / maxScore) * 100);

    return (
      <main className="min-h-screen bg-gray-50 p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Study Report</h1>
                <p className="text-gray-500 mt-1">Source: {session.source_document}</p>
                <button onClick={() => router.push('/home')} className="mt-4 flex items-center text-sm font-medium text-purple-600 hover:text-purple-700">
                    <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
                </button>
            </div>
            
            {/* Score Circle */}
            <div className="flex flex-col items-center">
                <div className="relative h-24 w-24 flex items-center justify-center rounded-full border-4 border-purple-100 bg-purple-50">
                    <span className="text-3xl font-extrabold text-purple-700">{percentage}%</span>
                </div>
                <p className="text-sm font-bold text-gray-600 mt-2">{totalScore} / {maxScore} Points</p>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {session.quiz_data.map((q, i) => {
               const result = session.report_data?.find((r) => r.question_id === q.id);
               const isPerfect = result?.score === 10;
               const isSubjective = q.question_type !== 'MCQ';

               return (
                 <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                   
                   {/* Question Header */}
                   <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                     <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-gray-200 text-gray-700 font-bold text-sm">
                                Q{i+1}
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900 leading-snug">{q.question_text}</h3>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${isPerfect ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                            {isPerfect ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {result?.score} / 10
                        </div>
                     </div>
                   </div>

                   {/* Answer Comparison */}
                   <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Answer</p>
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 text-sm min-h-[60px]">
                                {answers[q.id] || <span className="text-gray-400 italic">No answer provided</span>}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Correct Answer</p>
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-green-900 text-sm min-h-[60px]">
                                {q.correct_answer}
                            </div>
                        </div>
                   </div>

                   {/* THE DEFENSIBLE AI BREAKDOWN (Only for Subjective) */}
                   {isSubjective && result?.breakdown && (
                       <div className="px-6 pb-6">
                           <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                               <div className="flex items-center gap-2 mb-4">
                                   <BrainCircuit size={18} className="text-purple-600" />
                                   <h4 className="font-bold text-gray-800">AI Analysis & Metrics</h4>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                   {/* Metric 1: Semantic Match */}
                                   <div>
                                       <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                                <BarChart3 size={14} /> Semantic Match
                                            </span>
                                            <span className="text-sm font-bold text-gray-900">{Math.round(result.breakdown.semantic_score * 100)}%</span>
                                       </div>
                                       <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div 
                                                className={`h-2.5 rounded-full ${result.breakdown.semantic_score > 0.8 ? 'bg-green-500' : result.breakdown.semantic_score > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                style={{ width: `${result.breakdown.semantic_score * 100}%` }}
                                            ></div>
                                       </div>
                                       <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                           Measures how conceptually similar your answer is to the source material, even if words differ.
                                       </p>
                                   </div>

                                   {/* Metric 2: Keywords */}
                                   <div>
                                       <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                                           <Tag size={14} /> Keyword Detection
                                       </p>
                                       <div className="flex flex-wrap gap-2">
                                           {result.keywords?.matched.map(k => (
                                               <span key={k} className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center gap-1">
                                                   <CheckCircle size={10} /> {k}
                                               </span>
                                           ))}
                                           {result.keywords?.missing.map(k => (
                                               <span key={k} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded flex items-center gap-1">
                                                   <XCircle size={10} /> {k}
                                               </span>
                                           ))}
                                           {(!result.keywords?.matched.length && !result.keywords?.missing.length) && (
                                               <span className="text-xs text-gray-400 italic">No specific keywords required.</span>
                                           )}
                                       </div>
                                   </div>
                               </div>

                               {/* Feedback Text */}
                               <div className="mt-6 pt-4 border-t border-slate-200">
                                   <p className="text-sm font-bold text-gray-700 mb-1">Feedback:</p>
                                   <p className="text-sm text-gray-600 leading-relaxed">{result.feedback}</p>
                               </div>
                           </div>
                       </div>
                   )}

                   {/* Simple Feedback for MCQs */}
                   {!isSubjective && (
                       <div className="px-6 pb-6">
                           <div className={`p-4 rounded-lg border text-sm ${result?.score === 10 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                               <span className="font-bold">{result?.score === 10 ? 'Correct' : 'Incorrect'}:</span> {result?.feedback}
                           </div>
                       </div>
                   )}

                 </div>
               );
            })}
          </div>
          
        </div>
      </main>
    );
  }

  // --- VIEW MODE: TAKING QUIZ (Input) ---
  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-12 flex justify-center">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Study</h1>
        <div className="flex items-center gap-2 mb-8">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wide">
                Active Session
            </span>
            <span className="text-sm text-gray-500 truncate max-w-md">Source: {session.source_document}</span>
        </div>

        <div className="space-y-10">
          {session.quiz_data.map((q: any, i: number) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
              <p className="font-bold text-lg mb-4 text-gray-800 flex gap-3">
                  <span className="text-purple-600">{i+1}.</span> 
                  {q.question_text}
              </p>
              
              {q.question_type === 'MCQ' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt: string) => (
                    <label key={opt} className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${answers[q.id] === opt ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}>
                      <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${answers[q.id] === opt ? 'border-purple-600 bg-purple-600' : 'border-gray-400'}`}>
                          {answers[q.id] === opt && <div className="h-2 w-2 bg-white rounded-full"></div>}
                      </div>
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        value={opt} 
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        className="hidden"
                      />
                      <span className="text-gray-700 text-sm font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="relative">
                    <textarea 
                    className="w-full p-4 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow min-h-[120px]" 
                    rows={4} 
                    placeholder="Type your answer here..."
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-medium">
                        {answers[q.id]?.length || 0} chars
                    </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100">
            <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
            >
            {submitting ? (
                <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Running AI Analysis...
                </>
            ) : (
                'Submit & Grade Instantly'
            )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
                Powered by Hybrid Grading Engine (Semantic + Keyword + LLM)
            </p>
        </div>
      </div>
    </main>
  );
}