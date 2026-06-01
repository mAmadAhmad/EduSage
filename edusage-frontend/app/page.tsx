'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, QrCode, Trophy, Search } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [shareCode, setShareCode] = useState('');
  const [resultId, setResultId] = useState('');
  const [resultPin, setResultPin] = useState('');

  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (shareCode.trim().length >= 3) {
      router.push(`/take-quiz/${shareCode.trim().toUpperCase()}`);
    }
  };

  const handleCheckResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (resultId.trim() && resultPin.trim()) {
      router.push(`/results/${resultId.trim()}?pin=${resultPin.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-700 to-indigo-900 text-white min-h-[85vh] flex items-center pb-20">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center w-full mt-10">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Teaching Powers,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Supercharged.
            </span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-12">
            Generate quizzes, lesson plans, and transparent grading reports in seconds. 
            EduSage gives educators their weekends back.
          </p>
          
          <div className="flex justify-center gap-4 mb-16">
            <Link href="/auth" className="px-8 py-4 bg-white text-purple-900 font-bold rounded-full shadow-xl hover:bg-gray-100 transition-transform transform hover:scale-105">
              Educators: Try Free
            </Link>
          </div>

          {/* STUDENT QUICK ACCESS PORTAL - Embedded Directly in Hero */}
          <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-2xl text-left">
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                 🎓 Student Quick Access
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Join Quiz Form */}
                  <form onSubmit={handleJoinQuiz} className="relative">
                      <div className="absolute left-4 top-3.5 text-purple-300">
                          <QrCode size={20} />
                      </div>
                      <input 
                          type="text" 
                          value={shareCode}
                          onChange={(e) => setShareCode(e.target.value)}
                          placeholder="Enter 6-Digit Quiz Code"
                          maxLength={6}
                          className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase font-mono transition-all"
                      />
                      <button type="submit" disabled={shareCode.length < 3} className="absolute right-2 top-2 p-1.5 bg-yellow-500 text-purple-900 rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors">
                          <ArrowRight size={18} />
                      </button>
                  </form>

                 {/* Check Results Form */}
                  <form onSubmit={handleCheckResults} className="flex gap-2">
                      <div className="relative w-1/2">
                          <Search size={16} className="absolute left-3 top-3.5 text-purple-300" />
                          <input 
                              type="number" 
                              value={resultId}
                              onChange={(e) => setResultId(e.target.value)}
                              placeholder="ID"
                              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl pl-10 pr-2 py-3 focus:ring-2 focus:ring-yellow-400 font-mono text-sm outline-none"
                          />
                      </div>
                      <div className="relative w-1/2">
                          <input 
                              type="text" 
                              value={resultPin}
                              onChange={(e) => setResultPin(e.target.value)}
                              placeholder="PIN"
                              maxLength={5}
                              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-yellow-400 font-mono text-sm uppercase outline-none"
                          />
                      </div>
                      <button type="submit" disabled={!resultId || !resultPin} className="p-3 bg-white text-purple-900 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors">
                          <ArrowRight size={18} />
                      </button>
                  </form>
              </div>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything you need to run your class
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 text-2xl">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Precision Quiz Generator</h3>
              <p className="text-gray-600 leading-relaxed">Upload any PDF. Set your exact criteria. Our engine extracts the core concepts and generates rigorous assessments instantly.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6 text-2xl">✅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Hybrid AI Grading</h3>
              <p className="text-gray-600 leading-relaxed">No more black boxes. We grade short answers using deterministic keyword detection and semantic matching so you can trust the score.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-6 text-2xl">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Zero-Friction Access</h3>
              <p className="text-gray-600 leading-relaxed">Students don't need accounts. Project a 6-digit code on the whiteboard, and your class is taking the quiz in seconds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="bg-gray-900 py-16 text-center border-t border-gray-800">
        <h2 className="text-3xl font-bold text-white mb-6">Ready to transform your workflow?</h2>
        <Link href="/auth" className="inline-block px-10 py-4 bg-yellow-500 text-gray-900 font-extrabold rounded-xl shadow-md hover:bg-yellow-400 transition-transform transform hover:scale-105">
          Get Started For Free
        </Link>
      </div>
    </div>
  );
}