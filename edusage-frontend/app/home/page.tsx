'use client';

import Link from 'next/link';
import { BrainCircuit, QrCode, Trophy } from 'lucide-react'; 
import QuickStudyModal from '../quick-study/QuickStudyModal';

/**
 * UserHomePage Component
 * * The primary dashboard landing page after authentication.
 * Routes users to specific workspaces (Orchestration, Quick Study, Student Zone).
 */
export default function UserHomePage() {
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
          
          {/* Main Creation Workspaces */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-600 rounded-full"></span>
              Creation Studio
            </h2>

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
                  <p className="text-gray-600 mt-1">Create, edit, organize and grade quizzes.</p>
                </div>
              </div>
            </Link>

            <QuickStudyModal /> 
          </div>

          {/* Student Actions */}
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
              
              <Link href="/results" className="w-full text-left block p-5 hover:bg-gray-50 transition-colors border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">View My Results</h4>
                    <p className="text-sm text-gray-500">Check grades & feedback</p>
                  </div>
                </div>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}