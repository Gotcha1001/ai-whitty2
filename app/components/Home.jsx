'use client';

import Link from 'next/link';

export default function Home() {
    return (
        <div className="flex flex-col items-center">
            <img
                src="/food.jpg"
                alt="Delicious meal"
                className="w-full h-96 object-cover rounded-lg shadow-lg"
            />
            <div className="text-center mt-6">
                <h1 className="text-4xl font-bold text-white mb-4">Welcome to Recipe Assistant</h1>
                <p className="text-lg text-gray-200 mb-6 max-w-md">
                    Discover delicious dinner ideas, indulgent cakes, savoury meals, fast food, or cocktails to
                    plan your week ahead!
                </p>
                <Link
                    href="/recipes"
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200"
                >
                    View Recipes
                </Link>
            </div>
        </div>
    );
}