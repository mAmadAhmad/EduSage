import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-700 to-indigo-900 text-white min-h-screen flex items-center">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Teaching Powers,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Supercharged.
            </span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-10">
            Generate quizzes, lesson plans, and grading reports in seconds. 
            EduSage is the AI assistant that gives you your weekends back.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link href="/auth" className="px-8 py-4 bg-white text-purple-900 font-bold rounded-full shadow-lg hover:bg-gray-100 transition-transform transform hover:scale-105">
              Try EduSage for Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section (Scrolling Content) */}
      <section className="py-20 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything you need to run your class
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-6 text-2xl">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Quiz Generator</h3>
              <p className="text-gray-600">Upload any PDF and instantly generate MCQs or short-answer quizzes. Edit them, share them, done.</p>
            </div>
            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-6 text-2xl">✅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI Grading</h3>
              <p className="text-gray-600">Let AI grade student submissions based on your criteria. Review, edit, and return feedback instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="bg-purple-900 py-10 text-center">
        <h2 className="text-2xl font-bold text-white mb-6">Ready to transform your workflow?</h2>
        <Link href="/auth" className="px-8 py-3 bg-yellow-500 text-purple-900 font-bold rounded-lg shadow-md hover:bg-yellow-400 transition-colors">
          Get Started Now
        </Link>
      </div>
    </div>
  );
}