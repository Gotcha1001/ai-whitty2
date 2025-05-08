'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { FaDownload, FaSpinner, FaArrowLeft } from "react-icons/fa";
import axios from 'axios';
import MotionWrapperDelay from "./FramerMotionStuff/MotionWrapperDelay";


const systemMessage = `You are Chef Quirky, a fun and engaging recipe assistant. When asked for a recipe, provide a quirky introduction limited to **two short paragraphs** (3-4 sentences total, max 100 words), followed by the recipe in this format:
**Recipe Name**
Ingredients:
- Item 1
- Item 2
...
Instructions:
1. Step 1
2. Step 2
...
For weekly requests, provide an introductory quirky response limited to **two short paragraphs** (3-4 sentences total, max 100 words), followed by seven recipes, each starting with '**Day: Recipe Name**', where Day is Monday to Sunday, followed by ingredients and instructions. Always ensure recipes are complete with ingredients and instructions.`;

function parseRecipeResponse(text, isSingleRecipe = false) {
    console.log("Raw API response:", text);
    const recipes = [];
    const quirkyResponseLines = [];
    const lines = text.split('\n');
    let currentRecipe = null;
    let currentSection = null;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let i = 0;
    let paragraphCount = 0;
    let sentenceCount = 0;
    const maxSentences = 4;

    try {
        while (i < lines.length) {
            const line = lines[i].trim();
            if (!line) {
                if (currentRecipe) {
                    i++;
                    continue;
                }
                if (quirkyResponseLines.length && quirkyResponseLines[quirkyResponseLines.length - 1]) {
                    paragraphCount++;
                }
                quirkyResponseLines.push('');
                i++;
                continue;
            }
            if (line.startsWith('**') && line.endsWith('**')) {
                const header = line.slice(2, -2).trim();
                if (isSingleRecipe) {
                    if (currentRecipe) recipes.push(currentRecipe);
                    currentRecipe = { name: header, ingredients: [], instructions: [], day: '' };
                    currentSection = 'ingredients';
                    if (i > 0) quirkyResponseLines.push(...lines.slice(0, i));
                    i++;
                    continue;
                } else {
                    for (const d of days) {
                        if (header.startsWith(`${d}:`)) {
                            if (currentRecipe) recipes.push(currentRecipe);
                            const name = header.replace(`${d}:`, '').trim();
                            currentRecipe = { name, ingredients: [], instructions: [], day: d };
                            currentSection = 'ingredients';
                            break;
                        }
                    }
                    if (!currentRecipe) {
                        if (currentRecipe) recipes.push(currentRecipe);
                        currentRecipe = { name: header, ingredients: [], instructions: [], day: days[recipes.length] || '' };
                        currentSection = 'ingredients';
                    }
                    i++;
                }
            } else if (currentRecipe) {
                if (line.toLowerCase().startsWith('ingredients:')) {
                    currentSection = 'ingredients';
                } else if (line.toLowerCase().startsWith('instructions:')) {
                    currentSection = 'instructions';
                } else if (currentSection === 'ingredients' && (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• '))) {
                    currentRecipe.ingredients.push(line.slice(2).trim());
                } else if (currentSection === 'instructions' && (line.match(/^\d+\.\s/) || line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• '))) {
                    const instruction = line.replace(/^\d+\.\s*|^[-*•]\s*/, '').trim();
                    if (instruction) currentRecipe.instructions.push(instruction);
                }
                i++;
            } else {
                const sentences = line.split(/[.!?]+/).filter((s) => s.trim());
                sentenceCount += sentences.length;
                if (sentenceCount <= maxSentences && paragraphCount < 2) {
                    quirkyResponseLines.push(line);
                }
                i++;
            }
        }
        if (currentRecipe) recipes.push(currentRecipe);
        if (isSingleRecipe && recipes.length) recipes.length = 1;

        let quirkyResponse = quirkyResponseLines.filter((line) => line.trim()).join('\n').trim();
        const words = quirkyResponse.split(/\s+/);
        if (words.length > 100) quirkyResponse = words.slice(0, 100).join(' ') + '...';

        console.log("Parsed response:", { quirkyResponse, recipes });
        return { quirkyResponse, recipes };
    } catch (error) {
        console.error("Error parsing response:", error);
        return { quirkyResponse: '', recipes: [], error: "Failed to parse recipe response." };
    }
}

function generateRecipePDF(recipes) {
    const doc = new jsPDF();
    let yOffset = 20;

    recipes.forEach((recipe) => {
        doc.setFontSize(16);
        doc.text(`${recipe.day ? recipe.day + ': ' : ''}${recipe.name}`, 20, yOffset);
        yOffset += 10;

        if (recipe.imageUrl) {
            try {
                const x = 20;
                const y = yOffset;
                const width = 170;
                const height = 150;
                const radius = 10;

                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.roundedRect(x, y, width, height, radius, radius, 'S');
                doc.addImage(recipe.imageUrl, 'JPEG', x, y, width, height, undefined, 'FAST', 0);
                yOffset += 160;
            } catch (error) {
                console.error('Error adding image to PDF:', error);
            }
        }

        doc.setFontSize(12);
        doc.text('Ingredients:', 20, yOffset);
        yOffset += 10;
        recipe.ingredients.forEach((ing) => {
            doc.text(`- ${ing}`, 30, yOffset);
            yOffset += 10;
        });

        doc.text('Instructions:', 20, yOffset);
        yOffset += 10;
        recipe.instructions.forEach((instr, index) => {
            doc.text(`${index + 1}. ${instr}`, 30, yOffset);
            yOffset += 10;
        });

        yOffset += 20;
        if (yOffset > 250) {
            doc.addPage();
            yOffset = 20;
        }
    });

    return doc;
}

export default function Recipes() {
    const router = useRouter();
    const [userInput, setUserInput] = useState('');
    const [quirkyResponse, setQuirkyResponse] = useState('');
    const [individualRecipe, setIndividualRecipe] = useState(null);
    const [weeklyRecipes, setWeeklyRecipes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingWeekly, setLoadingWeekly] = useState(false);
    const [loadingCocktails, setLoadingCocktails] = useState(false);
    const [loadingFastFood, setLoadingFastFood] = useState(false);
    const [loadingSavoury, setLoadingSavoury] = useState(false);
    const [loadingCakes, setLoadingCakes] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userInput.trim()) {
            setError("Please enter a recipe idea!");
            return;
        }
        setLoading(true);
        setError('');
        setQuirkyResponse('');
        setIndividualRecipe(null);
        setWeeklyRecipes([]);

        try {
            const response = await axios.post('/api/recipes', { userInput });
            console.log('API Response:', response.data);
            if (!response.data || !response.data.recipe) {
                throw new Error('Invalid response from server');
            }
            const { quirkyResponse, recipe } = response.data;
            setQuirkyResponse(quirkyResponse);
            setIndividualRecipe(recipe);
        } catch (err) {
            console.error('Error details:', err.response?.data || err.message);
            setError(err.response?.data?.error || `Chef Quirky hit a snag: ${err.message}. Try again!`);
        } finally {
            setLoading(false);
        }
    };

    const handleWeeklyRecipes = async () => {
        setLoadingWeekly(true);
        setError('');
        setQuirkyResponse('');
        setIndividualRecipe(null);
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/weekly_recipes');
            console.log('Weekly Recipes Response:', response.data);
            const { quirkyResponse, recipes } = response.data;
            if (!recipes || recipes.length === 0) {
                throw new Error('No recipes returned');
            }
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
            console.log('Weekly Recipes State Updated:', { quirkyResponse, recipes });
        } catch (err) {
            console.error('Error details:', err.response?.data || err.message);
            setError(err.response?.data?.error || `Chef Quirky couldn't plan your week: ${err.message}. Try again!`);
        } finally {
            setLoadingWeekly(false);
        }
    };

    const handleCocktails = async () => {
        setLoadingCocktails(true);
        setError('');
        setQuirkyResponse('');
        setIndividualRecipe(null);
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/cocktails');
            console.log('Cocktails Response:', response.data);
            const { quirkyResponse, recipes } = response.data;
            if (!recipes || recipes.length === 0) {
                throw new Error('No cocktail recipes returned');
            }
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
            console.log('Cocktails State Updated:', { quirkyResponse, recipes });
        } catch (err) {
            console.error('Error details:', err.response?.data || err.message);
            setError(err.response?.data?.error || `Chef Quirky couldn't mix your drinks: ${err.message}. Try again!`);
        } finally {
            setLoadingCocktails(false);
        }
    };

    const handleFastFood = async () => {
        setLoadingFastFood(true);
        setError('');
        setQuirkyResponse('');
        setIndividualRecipe(null);
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/fast_food');
            console.log('Fast Food Response:', response.data);
            const { quirkyResponse, recipes } = response.data;
            if (!recipes || recipes.length === 0) {
                throw new Error('No fast food recipes returned');
            }
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
            console.log('Fast Food State Updated:', { quirkyResponse, recipes });
        } catch (err) {
            console.error('Error details:', err.response?.data || err.message);
            setError(err.response?.data?.error || `Chef Quirky couldn't prepare your fast food: ${err.message}. Try again!`);
        } finally {
            setLoadingFastFood(false);
        }
    };

    const handleSavouryMeals = async () => {
        setLoadingSavoury(true);
        setError('');
        setQuirkyResponse('');
        setIndividualRecipe(null);
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/savoury_meals');
            console.log('Savoury Meals Response:', response.data);
            const { quirkyResponse, recipes } = response.data;
            if (!recipes || recipes.length === 0) {
                throw new Error('No savoury meal recipes returned');
            }
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
            console.log('Savoury Meals State Updated:', { quirkyResponse, recipes });
        } catch (err) {
            console.error('Error details:', err.response?.data || err.message);
            setError(err.response?.data?.error || `Chef Quirky couldn't prepare your savoury meals: ${err.message}. Try again!`);
        } finally {
            setLoadingSavoury(false);
        }
    };

    const handleCakes = async () => {
        setLoadingCakes(true);
        setError('');
        setQuirkyResponse('');
        setIndividualRecipe(null);
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/cakes');
            console.log('Cakes Response:', response.data);
            const { quirkyResponse, recipes } = response.data;
            if (!recipes || recipes.length === 0) {
                throw new Error('No cake recipes returned');
            }
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
            console.log('Cakes State Updated:', { quirkyResponse, recipes });
        } catch (err) {
            console.error('Error details:', err.response?.data || err.message);
            setError(err.response?.data?.error || `Chef Quirky couldn't bake your cakes: ${err.message}. Try again!`);
        } finally {
            setLoadingCakes(false);
        }
    };

    const handleDownloadPDF = (recipe) => {
        const doc = generateRecipePDF([recipe]);
        doc.save(`${recipe.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadWeeklyPDF = () => {
        const doc = generateRecipePDF(weeklyRecipes);
        doc.save('weekly_recipes.pdf');
    };

    return (
        <div className="min-h-screen bg-gray-800 p-8">
            <div className="max-w-4xl mx-auto bg-gray-900 p-8 rounded-lg shadow-lg">
                <MotionWrapperDelay
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    variants={{
                        hidden: { opacity: 0, y: 100 },
                        visible: { opacity: 1, y: 0 },
                    }}
                    onAnimationComplete={() => console.log('Header animation completed')}
                >
                    <h1 className="text-3xl font-bold text-white mb-6 text-center">Chef Quirky's Kitchen</h1>
                </MotionWrapperDelay>

                <MotionWrapperDelay
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    variants={{
                        hidden: { opacity: 0, x: -100 },
                        visible: { opacity: 1, x: 0 },
                    }}
                    onAnimationComplete={() => console.log('Back button animation completed')}
                >
                    <button
                        onClick={() => router.push("/")}
                        className="mb-6 flex items-center text-white hover:text-purple-400 transition-colors"
                    >
                        <FaArrowLeft className="mr-2" />
                        Back to Home
                    </button>
                </MotionWrapperDelay>

                <form onSubmit={handleSubmit} className="mb-6">
                    <MotionWrapperDelay
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        variants={{
                            hidden: { opacity: 0, x: 100 },
                            visible: { opacity: 1, x: 0 },
                        }}
                        onAnimationComplete={() => console.log('Input animation completed')}
                    >
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="What do you want to cook today? (e.g., Vegan pasta)"
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        />
                    </MotionWrapperDelay>
                    <div className="flex justify-center mt-3">
                        <MotionWrapperDelay
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: 0.7 }}
                            variants={{
                                hidden: { opacity: 0, y: -100 },
                                visible: { opacity: 1, y: 0 },
                            }}
                            onAnimationComplete={() => console.log('Submit button animation completed')}
                        >
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <FaSpinner className="animate-spin mr-2" />
                                        Cooking...
                                    </span>
                                ) : (
                                    'Ask Chef Quirky'
                                )}
                            </button>
                        </MotionWrapperDelay>
                    </div>
                </form>

                {error && (
                    <MotionWrapperDelay
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.5 }}
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        onAnimationComplete={() => console.log('Error message animation completed')}
                    >
                        <p className="text-red-500 mb-4 text-center">{error}</p>
                    </MotionWrapperDelay>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <MotionWrapperDelay
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        variants={{
                            hidden: { opacity: 0, y: -100 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        onAnimationComplete={() => console.log('Weekly recipes button animation completed')}
                    >
                        <button
                            onClick={handleWeeklyRecipes}
                            disabled={loadingWeekly}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200 w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingWeekly ? (
                                <span className="flex items-center">
                                    <FaSpinner className="animate-spin mr-2" />
                                    Cooking...
                                </span>
                            ) : (
                                'Generate Weekly Recipes'
                            )}
                        </button>
                    </MotionWrapperDelay>
                    <MotionWrapperDelay
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                        variants={{
                            hidden: { opacity: 0, y: 100 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        onAnimationComplete={() => console.log('Cocktails button animation completed')}
                    >
                        <button
                            onClick={handleCocktails}
                            disabled={loadingCocktails}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200 w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingCocktails ? (
                                <span className="flex items-center">
                                    <FaSpinner className="animate-spin mr-2" />
                                    Mixing...
                                </span>
                            ) : (
                                'Generate 7 Cocktails'
                            )}
                        </button>
                    </MotionWrapperDelay>
                    <MotionWrapperDelay
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        variants={{
                            hidden: { opacity: 0, x: 100 },
                            visible: { opacity: 1, x: 0 },
                        }}
                        onAnimationComplete={() => console.log('Fast food button animation completed')}
                    >
                        <button
                            onClick={handleFastFood}
                            disabled={loadingFastFood}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200 w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingFastFood ? (
                                <span className="flex items-center">
                                    <FaSpinner className="animate-spin mr-2" />
                                    Cooking...
                                </span>
                            ) : (
                                'Generate 7 Fast Food Recipes'
                            )}
                        </button>
                    </MotionWrapperDelay>
                    <MotionWrapperDelay
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.5, delay: 1.0 }}
                        variants={{
                            hidden: { opacity: 0, y: -100 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        onAnimationComplete={() => console.log('Savoury meals button animation completed')}
                    >
                        <button
                            onClick={handleSavouryMeals}
                            disabled={loadingSavoury}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200 w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingSavoury ? (
                                <span className="flex items-center">
                                    <FaSpinner className="animate-spin mr-2" />
                                    Cooking...
                                </span>
                            ) : (
                                'Generate 7 Savoury Meals'
                            )}
                        </button>
                    </MotionWrapperDelay>
                    <MotionWrapperDelay
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.5, delay: 1.1 }}
                        variants={{
                            hidden: { opacity: 0, y: 100 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        onAnimationComplete={() => console.log('Cakes button animation completed')}
                    >
                        <button
                            onClick={handleCakes}
                            disabled={loadingCakes}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200 w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingCakes ? (
                                <span className="flex items-center">
                                    <FaSpinner className="animate-spin mr-2" />
                                    Baking...
                                </span>
                            ) : (
                                'Generate 7 Cake Recipes'
                            )}
                        </button>
                    </MotionWrapperDelay>
                </div>

                {quirkyResponse && (
                    <MotionWrapperDelay
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.5 }}
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 },
                        }}
                        onAnimationComplete={() => console.log('Quirky response animation completed')}
                    >
                        <div className="bg-gray-900 p-6 rounded-lg mb-6 z-10">
                            <h2 className="text-2xl font-bold text-white mb-4">Chef Quirky Says:</h2>
                            <div className="text-white whitespace-pre-line">{quirkyResponse}</div>
                        </div>
                    </MotionWrapperDelay>
                )}
                {individualRecipe && (
                    <div className="mt-8 p-6 bg-gray-900 rounded-lg shadow-lg z-10">
                        <h2 className="text-2xl font-bold text-white mb-4">{individualRecipe.name}</h2>
                        {individualRecipe.imageUrl ? (
                            <div className="mb-6">
                                <img
                                    src={individualRecipe.imageUrl}
                                    alt={individualRecipe.name}
                                    className="w-full h-auto max-h-[500px] md:max-h-[600px] object-cover rounded-lg shadow-md"
                                    onError={(e) => console.error(`Failed to load image: ${individualRecipe.imageUrl}`)}
                                />
                            </div>
                        ) : (
                            <p className="text-white mb-6">No image available for this recipe.</p>
                        )}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2">Ingredients:</h3>
                                <ul className="list-disc pl-5 text-white">
                                    {individualRecipe.ingredients.map((ingredient, index) => (
                                        <li key={index} className="mb-1">{ingredient}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2">Instructions:</h3>
                                <ol className="list-decimal pl-5 text-white">
                                    {individualRecipe.instructions.map((instruction, index) => (
                                        <li key={index} className="mb-2">{instruction}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownloadPDF(individualRecipe)}
                            className="mt-6 flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 z-10"
                        >
                            <FaDownload /> Download Recipe
                        </button>
                    </div>
                )}

                {weeklyRecipes.length > 0 ? (
                    <div className="bg-gray-900 p-6 rounded-lg z-10">
                        {console.log('Rendering weekly recipes:', weeklyRecipes)}
                        <h2 className="text-2xl font-bold text-white mb-4">Weekly Recipes</h2>
                        <button
                            onClick={handleDownloadWeeklyPDF}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg mb-6 hover:bg-purple-700 transition duration-200 z-10"
                        >
                            Download Weekly Recipes PDF
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {weeklyRecipes.map((recipe, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-900 p-6 rounded-lg shadow-lg border border-purple-600 z-10"
                                >
                                    <h3 className="text-xl font-semibold text-white">
                                        {recipe.day ? `${recipe.day}: ` : ''}{recipe.name}
                                    </h3>
                                    {recipe.imageUrl ? (
                                        <div className="mb-4">
                                            <img
                                                src={recipe.imageUrl}
                                                alt={recipe.name}
                                                className="w-full h-48 object-cover rounded-lg shadow-md"
                                                onError={(e) => console.error(`Failed to load image: ${recipe.imageUrl}`)}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-white mb-4">No image available.</p>
                                    )}
                                    <div className="text-white mt-4">
                                        <h4 className="font-semibold text-white">Ingredients:</h4>
                                        <ul className="list-disc pl-5 mb-4">
                                            {recipe.ingredients.length ? (
                                                recipe.ingredients.map((ingredient, i) => (
                                                    <li key={i}>{ingredient}</li>
                                                ))
                                            ) : (
                                                <li>No ingredients provided.</li>
                                            )}
                                        </ul>
                                        <h4 className="font-semibold text-white">Instructions:</h4>
                                        <ol className="list-decimal pl-5">
                                            {recipe.instructions.length ? (
                                                recipe.instructions.map((instruction, i) => (
                                                    <li key={i} className="mb-2">{instruction}</li>
                                                ))
                                            ) : (
                                                <li>No instructions provided.</li>
                                            )}
                                        </ol>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : loadingWeekly ? (
                    <p className="text-white text-center z-10">Loading weekly recipes...</p>
                ) : (
                    <p className="text-white text-center z-10">No weekly recipes available. Click "Generate Weekly Recipes" to get started!</p>
                )}
            </div>
        </div>
    );
}