'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Helper to check login status
  const checkLoginStatus = () => {
    const userState = typeof window !== 'undefined' ? localStorage.getItem('userState') : null;
    setIsLoggedIn(!!userState);
  };

  useEffect(() => {
    // 1. Check on mount
    checkLoginStatus();

    // 2. Listen for our custom event (triggered by AuthPage)
    const handleAuthChange = () => checkLoginStatus();
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleLogout = async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';
    try {
        await fetch(`${backendUrl}/auth/logout`, { method: 'POST' });
    } catch (e) {
        console.error("Logout error", e);
    }
    localStorage.removeItem('userState');
    
    // Dispatch event to update UI immediately
    window.dispatchEvent(new Event('auth-change'));
    
    router.push('/');
    router.refresh();
  };

  // --- Dynamic Styling Logic ---
  const isLandingPage = pathname === '/';

  // If landing page: Transparent, White Text.
  // If app page: Gray-50 background (blends in), Dark Gray Text, No Shadow.
  const navClass = isLandingPage 
    ? "fixed w-full z-50 transition-all duration-300 bg-transparent" 
    : "fixed w-full z-50 transition-all duration-300 bg-gray-50 border-b border-gray-200/50"; // Subtle blend

  // Logo: Big on landing, Small/Subtle in app
  const logoClass = isLandingPage 
    ? "text-2xl font-extrabold text-white" 
    : "text-lg font-semibold text-gray-700 hover:text-gray-900"; // Subtle gemini style

  const linkClass = isLandingPage
    ? "text-white hover:text-gray-200 px-3 py-2 rounded-md text-sm font-medium"
    : "text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100";

  return (
    <nav className={navClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Logic: Redirects based on Auth State */}
          <div className="flex items-center">
            <Link href={isLoggedIn ? "/home" : "/"} className={logoClass}>
              EduSage
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
                <>
                    <Link href="/quiz-workspace" className={linkClass}>Quiz</Link>
                    <Link href="/slide-workspace" className={linkClass}>Slides</Link>
                    
                    <div className={`border-l h-4 mx-2 ${isLandingPage ? 'border-gray-400' : 'border-gray-300'}`}></div>
                    
                    <button onClick={handleLogout} className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                        Logout
                    </button>
                </>
            ) : (
                // Only show login button if we are strictly NOT logged in
                <Link href="/auth" className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${isLandingPage ? 'bg-white text-purple-900 hover:bg-gray-100' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                  Sign In
                </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}