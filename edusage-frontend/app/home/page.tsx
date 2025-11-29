'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  BrainCircuit, 
  Presentation, 
  QrCode, 
  Trophy 
} from 'lucide-react'; // Import icons
import QuickStudyModal from '../quick-study/QuickStudyModal';

export default function UserHomePage() {
  const [username, setUsername] = useState('');

  // Optional: Fetch username from token payload if we stored it, 
  // or just keep it generic "Welcome back" for now.
  useEffect(() => {
    // We could decode the token here to get the real name later.
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Welcome back.
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            What would you like to accomplish today?
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Main Creation Workspaces (2/3 width on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-600 rounded-full"></span>
              Creation Studio
            </h2>

            {/* Orchestrate Quizzes (Formerly Quiz Workspace) */}
            <Link href="/quiz-workspace" className="group block bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BrainCircuit size={100} className="text-purple-600" />
              </div>
              <div className="relative z-10 flex items-start gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                  <BrainCircuit size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Orchestrate Quizzes</h3>
                  <p className="text-gray-600 mt-1">Create, edit, and manage assessments for your class. Generate with AI or build from scratch.</p>
                </div>
              </div>
            </Link>

            {/* Lesson Studio (Formerly Slide Workspace) */}
            <Link href="/slide-workspace" className="group block bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Presentation size={100} className="text-blue-600" />
              </div>
              <div className="relative z-10 flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <Presentation size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Lesson Studio</h3>
                  <p className="text-gray-600 mt-1">Generate structured lesson plans and presentation slides from your documents.</p>
                </div>
              </div>
            </Link>

            {/* Quick Study (The New Feature Placeholder) */}
            <QuickStudyModal /> 
          </div>

          {/* RIGHT COLUMN: Student Actions & Quick Links (1/3 width) */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
              Student Zone
            </h2>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <Link href="/take-quiz" className="block p-5 hover:bg-gray-50 transition-colors border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Enter Quiz Code</h4>
                    <p className="text-sm text-gray-500">Join a live session</p>
                  </div>
                </div>
              </Link>
              
              {/* Placeholder for Results - we need a way to list student results later */}
              <button disabled className="w-full text-left block p-5 hover:bg-gray-50 transition-colors opacity-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">View My Results</h4>
                    <p className="text-sm text-gray-500">Check your grades (Coming Soon)</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Placeholder for Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 min-h-[200px]">
              <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4">Recent Activity</h3>
              <div className="text-center text-gray-400 py-8 italic">
                No recent activity found.
                <br/>
                <span className="text-xs">(We will build this in Phase 3)</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}