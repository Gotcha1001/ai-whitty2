'use client';

import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="bg-gradient-to-r from-purple-800 to-black p-4">
            <div className="container mx-auto flex justify-between items-center p-2">
                <Link href="/">
                    <img src="/header.jpg" alt="Recipe Assistant Logo" className="h-10 w-auto rounded-sm" />
                </Link>
                <div>
                    <Link href="/" className="px-4 text-gray-200 hover:text-purple-400">
                        Home
                    </Link>
                    <Link href="/recipes" className="px-4 text-gray-200 hover:text-purple-400">
                        Recipes
                    </Link>
                </div>
            </div>
        </nav>
    );
}