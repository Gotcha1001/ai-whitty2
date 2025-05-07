import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Recipe Assistant",
  description: "Get quirky recipes from Chef Quirky",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="gradient-background2 font-sans text-gray-200">
        <nav className="bg-gradient-to-r from-purple-800 to-black p-4">
          <div className="container mx-auto flex justify-between items-center p-2">
            <Link href="/">
              <img
                src="/header.jpg"
                alt="Recipe Assistant Logo"
                className="h-10 w-auto rounded-sm"
              />
            </Link>
            <div>
              <Link
                href="/"
                className="px-4 text-gray-200 hover:text-purple-400"
              >
                Home
              </Link>
              <Link
                href="/recipes"
                className="px-4 text-gray-200 hover:text-purple-400"
              >
                Recipes
              </Link>
            </div>
          </div>
        </nav>
        <div className="container mx-auto p-6">{children}</div>
      </body>
    </html>
  );
}
