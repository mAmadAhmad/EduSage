'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check UI state on mount
  useEffect(() => {
    const userState = typeof window !== 'undefined' ? localStorage.getItem('userState') : null;
    setIsLoggedIn(!!userState);
  }, []);

  const handleLogout = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
    
    try {
        // Call backend to delete the cookie
        await fetch(`${backendUrl}/auth/logout`, { method: 'POST' });
    } catch (e) {
        console.error("Logout error", e);
    }
    
    // Clear UI state
    localStorage.removeItem('userState'); 
    setIsLoggedIn(false);
    router.push('/login');
    router.refresh();
  };
  
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-purple-600">EduSage</Link>
          </div>
          <div className="flex items-center space-x-4">
            {isLoggedIn && (
                <>
                    <Link href="/quiz-workspace" className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium">Quiz Workspace</Link>
                    <Link href="/slide-workspace" className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium">Slide Workspace</Link>
                </>
            )}
            <div className="border-l border-gray-300 h-6"></div>
            
            {isLoggedIn ? (
                <button onClick={handleLogout} className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600">
                    Logout
                </button>
            ) : (
                <>
                    <Link href="/login" className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium">Login</Link>
                    <Link href="/signup" className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">Sign Up</Link>
                </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}