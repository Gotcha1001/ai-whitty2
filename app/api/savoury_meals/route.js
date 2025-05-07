import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const prompt = `${systemMessage}\n\nProvide exactly 7 savoury meal recipes, one for each day (Monday to Sunday).`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const { quirkyResponse, recipes } = parseRecipeResponse(text, false);

    if (!recipes || recipes.length === 0) {
      throw new Error("No recipes were generated");
    }

    return NextResponse.json({ quirkyResponse, recipes });
  } catch (error) {
    console.error("Error in savoury meals API:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Chef Quirky couldn't whip up savoury meals. Try again!",
      },
      { status: 500 }
    );
  }
}

function parseRecipeResponse(text, isSingleRecipe = false) {
  const recipes = [];
  const quirkyResponseLines = [];
  const lines = text.split("\n");
  let currentRecipe = null;
  let currentSection = null;
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
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
      if (
        quirkyResponseLines.length &&
        quirkyResponseLines[quirkyResponseLines.length - 1]
      ) {
        paragraphCount++;
      }
      quirkyResponseLines.push("");
      i++;
      continue;
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      const header = line.slice(2, -2).trim();
      if (isSingleRecipe) {
        if (currentRecipe) recipes.push(currentRecipe);
        currentRecipe = {
          name: header,
          ingredients: [],
          instructions: [],
          day: "",
        };
        currentSection = "ingredients";
        if (i > 0) quirkyResponseLines.push(...lines.slice(0, i));
        i++;
        continue;
      } else {
        for (const d of days) {
          if (header.startsWith(`${d}:`)) {
            if (currentRecipe) recipes.push(currentRecipe);
            const name = header.replace(`${d}:`, "").trim();
            currentRecipe = { name, ingredients: [], instructions: [], day: d };
            currentSection = "ingredients";
            break;
          }
        }
      }
      i++;
    } else if (currentRecipe) {
      if (line.toLowerCase().startsWith("ingredients:")) {
        currentSection = "ingredients";
      } else if (line.toLowerCase().startsWith("instructions:")) {
        currentSection = "instructions";
      } else if (
        currentSection === "ingredients" &&
        (line.startsWith("- ") || line.startsWith("* "))
      ) {
        currentRecipe.ingredients.push(line.slice(2).trim());
      } else if (currentSection === "instructions" && /^\d+\.\s/.test(line)) {
        currentRecipe.instructions.push(line.replace(/^\d+\.\s*/, "").trim());
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

  let quirkyResponse = quirkyResponseLines
    .filter((line) => line.trim())
    .join("\n")
    .trim();
  const words = quirkyResponse.split(/\s+/);
  if (words.length > 100)
    quirkyResponse = words.slice(0, 100).join(" ") + "...";

  return { quirkyResponse, recipes };
}
