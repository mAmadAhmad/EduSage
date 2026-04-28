'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * AuthPage Component
 * * Handles user authentication (Login/Signup). Communicates with the FastAPI backend
 * using standard form-data for login (OAuth2 compatible) and JSON for signup.
 * Manages local session state and dispatches global events to update the Navbar.
 */
export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Feedback States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    try {
      let res;
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        res = await fetch(`${backendUrl}${endpoint}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });
      } else {
        res = await fetch(`${backendUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || 'Authentication failed');
      }

      if (isLogin) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('userState', 'active');
            window.dispatchEvent(new Event('auth-change'));
        }
        router.push('/home'); 
        router.refresh();
      } else {
        setSuccessMsg('Account created successfully! Please sign in.');
        setIsLogin(true); 
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
      setIsLogin(!isLogin);
      setError('');
      setSuccessMsg('');
  };

  return (
    <main className="flex min-h-screen bg-white">
      {/* Left Side - Marketing Gradient */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-purple-700 to-indigo-900 items-center justify-center p-12 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-extrabold mb-6">EduSage</h1>
          <p className="text-lg text-purple-100">
            {isLogin 
              ? "Welcome back! Your quizzes and lesson plans are ready." 
              : "Join thousands of educators saving time with AI."}
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isLogin ? 'Access your workspace' : 'Get started for free'}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Status Messages */}
            {error && <div className="text-red-600 text-sm text-center font-medium bg-red-50 p-2 rounded-md border border-red-100">{error}</div>}
            {successMsg && <div className="text-green-600 text-sm text-center font-medium bg-green-50 p-2 rounded-md border border-green-100">{successMsg}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-70 transition-colors"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={toggleAuthMode}
              className="text-sm font-medium text-purple-600 hover:text-purple-500 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}