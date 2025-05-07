'use client';

import { useState } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';

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
            }
            i++;
        } else if (currentRecipe) {
            if (line.toLowerCase().startsWith('ingredients:')) {
                currentSection = 'ingredients';
            } else if (line.toLowerCase().startsWith('instructions:')) {
                currentSection = 'instructions';
            } else if (currentSection === 'ingredients' && (line.startsWith('- ') || line.startsWith('* '))) {
                currentRecipe.ingredients.push(line.slice(2).trim());
            } else if (currentSection === 'instructions' && /^\d+\.\s/.test(line)) {
                currentRecipe.instructions.push(line.replace(/^\d+\.\s*/, '').trim());
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

    return { quirkyResponse, recipes };
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
                doc.addImage(recipe.imageUrl, 'JPEG', 20, yOffset, 170, 100);
                yOffset += 110;
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
    const [userInput, setUserInput] = useState('');
    const [quirkyResponse, setQuirkyResponse] = useState('');
    const [individualRecipe, setIndividualRecipe] = useState(null);
    const [weeklyRecipes, setWeeklyRecipes] = useState([]);
    const [imageUrl, setImageUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingWeekly, setLoadingWeekly] = useState(false);
    const [loadingCocktails, setLoadingCocktails] = useState(false);
    const [loadingFastFood, setLoadingFastFood] = useState(false);
    const [loadingSavoury, setLoadingSavoury] = useState(false);
    const [loadingCakes, setLoadingCakes] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setQuirkyResponse('');
        setIndividualRecipe(null);
        setImageUrl('');

        try {
            const response = await axios.post('/api/recipes', { userInput });
            const { quirkyResponse, recipe } = response.data;
            setQuirkyResponse(quirkyResponse);
            setIndividualRecipe(recipe);
            if (recipe.imageUrl) {
                setImageUrl(recipe.imageUrl);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Chef Quirky hit a snag. Try again!');
        } finally {
            setLoading(false);
        }
    };

    const handleWeeklyRecipes = async () => {
        setLoadingWeekly(true);
        setError('');
        setQuirkyResponse('');
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/weekly_recipes');
            const { quirkyResponse, recipes } = response.data;
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
        } catch (err) {
            setError(err.response?.data?.error || "Chef Quirky couldn't plan your week. Try again!");
        } finally {
            setLoadingWeekly(false);
        }
    };

    const handleCocktails = async () => {
        setLoadingCocktails(true);
        setError('');
        setQuirkyResponse('');
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/cocktails');
            const { quirkyResponse, recipes } = response.data;
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
        } catch (err) {
            setError(err.response?.data?.error || "Chef Quirky couldn't mix your drinks. Try again!");
        } finally {
            setLoadingCocktails(false);
        }
    };

    const handleFastFood = async () => {
        setLoadingFastFood(true);
        setError('');
        setQuirkyResponse('');
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/fast_food');
            const { quirkyResponse, recipes } = response.data;
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
        } catch (err) {
            setError(err.response?.data?.error || "Chef Quirky couldn't prepare your fast food. Try again!");
        } finally {
            setLoadingFastFood(false);
        }
    };

    const handleSavouryMeals = async () => {
        setLoadingSavoury(true);
        setError('');
        setQuirkyResponse('');
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/savoury_meals');
            const { quirkyResponse, recipes } = response.data;
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
        } catch (err) {
            setError(err.response?.data?.error || "Chef Quirky couldn't prepare your savoury meals. Try again!");
        } finally {
            setLoadingSavoury(false);
        }
    };

    const handleCakes = async () => {
        setLoadingCakes(true);
        setError('');
        setQuirkyResponse('');
        setWeeklyRecipes([]);

        try {
            const response = await axios.get('/api/cakes');
            const { quirkyResponse, recipes } = response.data;
            setQuirkyResponse(quirkyResponse);
            setWeeklyRecipes(recipes);
        } catch (err) {
            setError(err.response?.data?.error || "Chef Quirky couldn't bake your cakes. Try again!");
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
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Chef Quirky's Kitchen</h1>
            <form onSubmit={handleSubmit} className="mb-6">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="What do you want to cook today?"
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <div className="flex justify-center mt-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center justify-center"
                    >
                        <span>{loading ? 'Cooking...' : 'Ask Chef Quirky'}</span>
                        {loading && (
                            <span className="ml-2 border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
                        )}
                    </button>
                </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <button
                    onClick={handleWeeklyRecipes}
                    disabled={loadingWeekly}
                    className="bg-gradient-to-r from-purple-700 to-black bg-opacity-90 text-white px-6 py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-900 hover:to-black transition duration-200 w-full flex items-center justify-center"
                >
                    <span>{loadingWeekly ? 'Cooking...' : 'Generate Weekly Recipes'}</span>
                    {loadingWeekly && (
                        <span className="ml-2 border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
                    )}
                </button>

                <button
                    onClick={handleCocktails}
                    disabled={loadingCocktails}
                    className="bg-gradient-to-r from-purple-700 to-indigo-600 bg-opacity-90 text-white px-6 py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-900 hover:to-black transition duration-200 w-full flex items-center justify-center"
                >
                    <span>{loadingCocktails ? 'Mixing...' : 'Generate 7 Cocktails'}</span>
                    {loadingCocktails && (
                        <span className="ml-2 border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
                    )}
                </button>

                <button
                    onClick={handleFastFood}
                    disabled={loadingFastFood}
                    className="bg-gradient-to-r from-indigo-700 to-black bg-opacity-90 text-white px-6 py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-900 hover:to-black transition duration-200 w-full flex items-center justify-center"
                >
                    <span>{loadingFastFood ? 'Cooking...' : 'Generate 7 Fast Food Recipes'}</span>
                    {loadingFastFood && (
                        <span className="ml-2 border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
                    )}
                </button>

                <button
                    onClick={handleSavouryMeals}
                    disabled={loadingSavoury}
                    className="bg-gradient-to-r from-purple-800 to-indigo-700 bg-opacity-90 text-white px-6 py-3 rounded-lg hover:bg-gradient-to-r hover:from-purple-900 hover:to-black transition duration-200 w-full flex items-center justify-center"
                >
                    <span>{loadingSavoury ? 'Cooking...' : 'Generate 7 Savoury Meals'}</span>
                    {loadingSavoury && (
                        <span className="ml-2 border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
                    )}
                </button>

                <button
                    onClick={handleCakes}
                    disabled={loadingCakes}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 bg-opacity-90 text-white px-6 py-3 rounded-lg hover:bg-gradient-to-r hover:from-pink-700 hover:to-purple-700 transition duration-200 w-full flex items-center justify-center"
                >
                    <span>{loadingCakes ? 'Baking...' : 'Generate 7 Cake Recipes'}</span>
                    {loadingCakes && (
                        <span className="ml-2 border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></span>
                    )}
                </button>
            </div>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {quirkyResponse && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Chef Quirky Says:</h2>
                    <div className="text-gray-200 mb-6 whitespace-pre-line">{quirkyResponse}</div>
                </div>
            )}

            {individualRecipe && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">{individualRecipe.name}</h2>
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt="Recipe image"
                            className="mb-4 max-w-full h-auto rounded-lg shadow-lg"
                        />
                    )}
                    <div className="bg-gradient-to-br from-purple-800 to-black bg-opacity-90 p-6 rounded-lg shadow-lg mb-6 border border-purple-900">
                        <h3 className="text-xl font-semibold text-white">{individualRecipe.name}</h3>
                        <div className="text-gray-300 mt-4">
                            <h4 className="font-semibold text-gray-200">Ingredients:</h4>
                            <ul className="list-disc pl-5 mb-4">
                                {individualRecipe.ingredients.length ? (
                                    individualRecipe.ingredients.map((ingredient, index) => (
                                        <li key={index}>{ingredient}</li>
                                    ))
                                ) : (
                                    <li>No ingredients provided.</li>
                                )}
                            </ul>
                            <h4 className="font-semibold text-gray-200">Instructions:</h4>
                            <ol className="list-decimal pl-5">
                                {individualRecipe.instructions.length ? (
                                    individualRecipe.instructions.map((instruction, index) => (
                                        <li key={index} className="mb-2">{instruction}</li>
                                    ))
                                ) : (
                                    <li>No instructions provided.</li>
                                )}
                            </ol>
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={() => handleDownloadPDF(individualRecipe)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg mr-2 hover:bg-purple-700 transition duration-200"
                            >
                                Download Recipe PDF
                            </button>
                            {imageUrl && (
                                <a
                                    href={imageUrl}
                                    download={`${individualRecipe.name.toLowerCase().replace(/\s+/g, '_')}.jpg`}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                                >
                                    Download Image
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {weeklyRecipes.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Weekly Recipes</h2>
                    <button
                        onClick={handleDownloadWeeklyPDF}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg mb-6 hover:bg-purple-700 transition duration-200"
                    >
                        Download Weekly Recipes PDF
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {weeklyRecipes.map((recipe, index) => (
                            <div
                                key={index}
                                className="bg-gradient-to-br from-purple-800 to-black bg-opacity-90 p-6 rounded-lg shadow-lg border border-purple-900"
                            >
                                <h3 className="text-xl font-semibold text-white">
                                    {recipe.day}: {recipe.name}
                                </h3>
                                <div className="text-gray-300 mt-4">
                                    <h4 className="font-semibold text-gray-200">Ingredients:</h4>
                                    <ul className="list-disc pl-5 mb-4">
                                        {recipe.ingredients.length ? (
                                            recipe.ingredients.map((ingredient, i) => (
                                                <li key={i}>{ingredient}</li>
                                            ))
                                        ) : (
                                            <li>No ingredients provided.</li>
                                        )}
                                    </ul>
                                    <h4 className="font-semibold text-gray-200">Instructions:</h4>
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
            )}
        </div>
    );
}