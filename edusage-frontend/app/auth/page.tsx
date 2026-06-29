'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthMode = 'login' | 'signup' | 'verify';

/**
 * AuthPage Component
 * Handles standard OAuth2 login, JSON signup, and OTP email verification.
 */
export default function AuthPage() {
  const router = useRouter();
  
  // Replaced isLogin with a 3-way mode state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  
  // Auth States
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Feedback States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    // Pre-flight Validations
    if (authMode !== 'verify' && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (authMode === 'verify' && otpCode.length !== 6) {
      setError('Verification code must be exactly 6 digits.');
      return;
    }

    setIsLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    try {
      if (authMode === 'login') {
        const formData = new URLSearchParams();
        formData.append('username', email.trim()); 
        formData.append('password', password);
        
        const res = await fetch(`${backendUrl}/auth/login`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || 'Authentication failed');
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem('userState', 'active');
            window.dispatchEvent(new Event('auth-change'));
        }
        router.push('/home'); 
        router.refresh();

      } else if (authMode === 'signup') {
        const res = await fetch(`${backendUrl}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: email.trim(), 
            full_name: fullName.trim(), 
            password: password 
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || 'Registration failed');
        }

        // Transition to Verification State
        setSuccessMsg('Code sent! Please check your inbox.');
        setAuthMode('verify'); 
        setPassword(''); // Clear password from state for security

      } else if (authMode === 'verify') {
        const res = await fetch(`${backendUrl}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: email.trim(), 
            code: otpCode.trim() 
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || 'Verification failed');
        }

        // Transition back to Login State
        setSuccessMsg('Email verified successfully! Please sign in.');
        setAuthMode('login'); 
        setOtpCode('');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
      setAuthMode(authMode === 'login' ? 'signup' : 'login');
      setError('');
      setSuccessMsg('');
      setPassword('');
      setOtpCode('');
  };

  return (
    <main className="flex min-h-screen bg-white">
      {/* Left Side - Marketing Gradient */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-purple-700 to-indigo-900 items-center justify-center p-12 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-extrabold mb-6">EduSage</h1>
          <p className="text-lg text-purple-100">
            {authMode === 'login' 
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
              {authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Verify Email'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {authMode === 'login' ? 'Access your workspace' : authMode === 'signup' ? 'Get started for free' : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              
              {/* OTP Form (Only visible in verify mode) */}
              {authMode === 'verify' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-center mb-2">Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // Restrict to numbers only
                    placeholder="000000"
                    className="block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
              ) : (
                <>
                  {/* Full Name - Only show during Signup */}
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                  )}

                  {/* Email Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    {authMode === 'signup' && (
                       <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Status Messages */}
            {error && <div className="text-red-600 text-sm text-center font-medium bg-red-50 p-2 rounded-md border border-red-100">{error}</div>}
            {successMsg && <div className="text-green-600 text-sm text-center font-medium bg-green-50 p-2 rounded-md border border-green-100">{successMsg}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-70 transition-colors"
            >
              {isLoading 
                ? 'Processing...' 
                : authMode === 'login' ? 'Sign In' 
                : authMode === 'signup' ? 'Sign Up' 
                : 'Verify Account'}
            </button>
          </form>

          {/* Bottom Toggles */}
          <div className="text-center mt-4">
            {authMode === 'verify' ? (
              <button
                onClick={() => setAuthMode('signup')}
                type="button"
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Wrong email? Go back
              </button>
            ) : (
              <button
                onClick={toggleAuthMode}
                type="button"
                className="text-sm font-medium text-purple-600 hover:text-purple-500 transition-colors"
              >
                {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}