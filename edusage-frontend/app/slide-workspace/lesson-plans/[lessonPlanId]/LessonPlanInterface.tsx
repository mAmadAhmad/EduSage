'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// ... (your Slide and LessonPlan interfaces are the same)
interface Slide {
  title: string;
  bullet_points: string[];
  speaker_notes: string;
}
interface LessonPlan {
  id: number; // Add ID for saving
  lesson_title: string;
  learning_objectives: string[];
  key_concepts: string[];
  slides: Slide[];
}


export default function LessonPlanInterface({ initialLessonPlan }: { initialLessonPlan: LessonPlan }) {
    const [lessonPlan, setLessonPlan] = useState<LessonPlan>(initialLessonPlan);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        // 1. Get the token
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) {
            alert('Please log in to save changes.');
            setIsSaving(false);
            return;
        }

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1';
            const res = await fetch(`${backendUrl}/content/lesson-plans/${lessonPlan.id}`, {
                method: 'PUT',
                 // 2. Add the Authorization header
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(lessonPlan),
            });
            if (!res.ok) {
                if (res.status === 401) throw new Error('Unauthorized. Please log in again.');
                throw new Error('Failed to save lesson plan');
            }
            alert('Lesson Plan Saved!');
            router.refresh();
        } catch (error) {
             alert(error instanceof Error ? error.message : 'Error saving lesson plan.');
        } finally {
            setIsSaving(false);
        }
    };

    // Generic handler for top-level fields like title
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setLessonPlan({ ...lessonPlan, [e.target.name]: e.target.value });
    };

    // Handler for changes inside a slide
    const handleSlideChange = (slideIndex: number, field: keyof Slide, value: string | string[]) => {
        const updatedSlides = [...lessonPlan.slides];
        (updatedSlides[slideIndex] as any)[field] = value;
        setLessonPlan({ ...lessonPlan, slides: updatedSlides });
    };

    return (
        <form onSubmit={handleSave} className="w-full max-w-4xl space-y-8">
            <div className="p-8 bg-white rounded-xl shadow-lg border">
                <input
                    name="lesson_title"
                    value={lessonPlan.lesson_title}
                    onChange={handleInputChange}
                    className="text-4xl font-bold text-gray-800 w-full focus:outline-none focus:border-b-2 focus:border-blue-500"
                />
                {/* We can make objectives and key concepts editable later with a similar pattern */}
            </div>

            {lessonPlan.slides.map((slide, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg border overflow-hidden">
                    <div className="p-6 bg-blue-600">
                        <input 
                          value={`Slide ${index + 1}: ${slide.title}`}
                          onChange={(e) => handleSlideChange(index, 'title', e.target.value.replace(`Slide ${index + 1}: `, ''))}
                          className="text-2xl font-bold text-white bg-transparent w-full focus:outline-none placeholder-white::placeholder"
                        />
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-lg text-gray-800">Content (one bullet per line)</h4>
                            <textarea
                                value={slide.bullet_points.join('\n')}
                                onChange={(e) => handleSlideChange(index, 'bullet_points', e.target.value.split('\n'))}
                                className="w-full mt-2 p-2 border rounded text-gray-900 h-40"
                            />
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold text-gray-600">Speaker Notes</h4>
                            <textarea
                                value={slide.speaker_notes}
                                onChange={(e) => handleSlideChange(index, 'speaker_notes', e.target.value)}
                                className="w-full mt-2 p-2 border rounded text-gray-900 bg-gray-50 h-40 italic"
                            />
                        </div>
                    </div>
                </div>
            ))}

            <div className="flex justify-end">
                <button type="submit" disabled={isSaving} className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}