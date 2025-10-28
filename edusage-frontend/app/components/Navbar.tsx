import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-purple-600">
              EduSage
            </Link>
          </div>
          <div className="flex space-x-4">
            <Link href="/quiz-workspace" className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium">
              Quiz Workspace
            </Link>
            <Link href="/slide-workspace" className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium">
              Slide Workspace
            </Link>
             <Link href="/login" className="text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-md text-sm font-medium">Login</Link>
            <Link href="/signup" className="px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">Sign Up</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}   