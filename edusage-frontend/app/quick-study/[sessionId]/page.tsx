'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QuickStudyPage({ params: { sessionId } }: { params: { sessionId: string } }) {
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await fetch(`${backendUrl}/quick-study/${sessionId}`, {
        credentials: 'include'
      });
      if (res.ok) setSession(await res.json());
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
        alert("Failed to submit");
    }
    setSubmitting(false);
  };

  if (!session) return <div className="p-12 text-center text-gray-700">Loading Study Session...</div>;

  // VIEW MODE: REPORT
  if (session.report_data) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 pt-24 flex justify-center">
        <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b pb-4">Study Results</h1>
          
          <div className="space-y-6">
            {session.quiz_data.map((q: any, i: number) => {
               const grade = session.report_data.find((r: any) => r.question_id === q.id);
               return (
                 <div key={i} className="p-6 border rounded-lg bg-gray-50">
                   <p className="font-bold text-lg mb-2 text-gray-900">Q{i+1}: {q.question_text}</p>
                   <p className="text-gray-700 mb-2"><span className="font-semibold">Your Answer:</span> {answers[q.id] || "Skipped"}</p>
                   
                   <div className={`p-4 rounded-lg mt-4 ${grade?.score > 7 ? 'bg-green-100 border-green-200' : 'bg-yellow-100 border-yellow-200'}`}>
                     <p className="font-bold text-gray-900">Feedback (Score: {grade?.score})</p>
                     <p className="text-gray-800">{grade?.feedback}</p>
                     <p className="mt-2 text-sm font-semibold text-gray-600">Correct: {q.correct_answer}</p>
                   </div>
                 </div>
               );
            })}
          </div>
          <button onClick={() => router.push('/home')} className="mt-8 w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  // VIEW MODE: TAKING QUIZ
  return (
    <main className="min-h-screen bg-gray-50 p-8 pt-24 flex justify-center">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Study</h1>
        <p className="text-gray-500 mb-8">Document: {session.source_document}</p>

        <div className="space-y-8">
          {session.quiz_data.map((q: any, i: number) => (
            <div key={i} className="p-4">
              <p className="font-semibold text-lg mb-3 text-gray-900">{i+1}. {q.question_text}</p>
              
              {q.question_type === 'MCQ' ? (
                <div className="space-y-2">
                  {q.options.map((opt: string) => (
                    <label key={opt} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        value={opt} 
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        className="h-5 w-5 text-emerald-600"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea 
                  className="w-full p-3 border rounded-lg text-gray-900" 
                  rows={3} 
                  placeholder="Type your answer..."
                  onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                />
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={submitting}
          className="mt-8 w-full py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Grading...' : 'Submit & Check Instantly'}
        </button>
      </div>
    </main>
  );
}