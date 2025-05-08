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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function parseRecipeResponse(text, isSingleRecipe = false) {
  console.log("Raw API response:", text);
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

  try {
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
              currentRecipe = {
                name,
                ingredients: [],
                instructions: [],
                day: d,
              };
              currentSection = "ingredients";
              break;
            }
          }
          if (!currentRecipe) {
            if (currentRecipe) recipes.push(currentRecipe);
            currentRecipe = {
              name: header,
              ingredients: [],
              instructions: [],
              day: days[recipes.length] || "",
            };
            currentSection = "ingredients";
          }
          i++;
        }
      } else if (currentRecipe) {
        if (line.toLowerCase().startsWith("ingredients:")) {
          currentSection = "ingredients";
        } else if (line.toLowerCase().startsWith("instructions:")) {
          currentSection = "instructions";
        } else if (
          currentSection === "ingredients" &&
          (line.startsWith("- ") ||
            line.startsWith("* ") ||
            line.startsWith("• "))
        ) {
          currentRecipe.ingredients.push(line.slice(2).trim());
        } else if (
          currentSection === "instructions" &&
          (line.match(/^\d+\.\s/) ||
            line.startsWith("- ") ||
            line.startsWith("* ") ||
            line.startsWith("• "))
        ) {
          const instruction = line.replace(/^\d+\.\s*|^[-*•]\s*/, "").trim();
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

    let quirkyResponse = quirkyResponseLines
      .filter((line) => line.trim())
      .join("\n")
      .trim();
    const words = quirkyResponse.split(/\s+/);
    if (words.length > 100)
      quirkyResponse = words.slice(0, 100).join(" ") + "...";

    console.log("Parsed response:", { quirkyResponse, recipes });
    return { quirkyResponse, recipes };
  } catch (error) {
    console.error("Error parsing response:", error);
    return {
      quirkyResponse: "",
      recipes: [],
      error: "Failed to parse recipe response.",
    };
  }
}

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "API key not configured. Please check your environment variables.",
        },
        { status: 500 }
      );
    }
    const { userInput } = await request.json();
    if (!userInput) {
      return NextResponse.json(
        { error: "Please tell Chef Quirky what you'd like to cook!" },
        { status: 400 }
      );
    }
    const prompt = `${systemMessage}\n\nGenerate a recipe for: ${userInput}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Generated recipe text:", text);
    const { quirkyResponse, recipes } = parseRecipeResponse(text, true);
    if (!recipes || recipes.length === 0) {
      return NextResponse.json(
        {
          error:
            "Chef Quirky couldn't understand the recipe format. Please try again!",
        },
        { status: 500 }
      );
    }
    const recipe = recipes[0];
    if (
      !recipe.ingredients ||
      !recipe.instructions ||
      recipe.ingredients.length === 0 ||
      recipe.instructions.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The recipe is missing ingredients or instructions. Please try again!",
        },
        { status: 500 }
      );
    }
    if (process.env.REPLICATE_API_KEY) {
      try {
        // Construct absolute URL for the image generation endpoint
        const host = request.headers.get("host") || "localhost:3000";
        const protocol =
          process.env.NODE_ENV === "production" ? "https" : "http";
        const imageApiUrl = `${protocol}://${host}/api/generate-image`;
        console.log(`Fetching image from: ${imageApiUrl}`);
        const imageResponse = await fetch(imageApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `A beautiful photo of ${recipe.name}`,
          }),
        });
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          if (imageData.imageUrl) {
            console.log(`Image generated successfully: ${imageData.imageUrl}`);
            recipe.imageUrl = imageData.imageUrl;
          } else {
            console.warn("Image response missing imageUrl:", imageData);
          }
        } else {
          console.warn(
            "Image API responded with status:",
            imageResponse.status,
            await imageResponse.text()
          );
        }
      } catch (imageError) {
        console.error(
          "Error generating image:",
          imageError.message,
          imageError.stack
        );
      }
    } else {
      console.warn(
        "REPLICATE_API_KEY not configured, skipping image generation"
      );
    }
    return NextResponse.json({ quirkyResponse, recipe });
  } catch (error) {
    console.error("Error in recipe generation:", error.message, error.stack);
    return NextResponse.json(
      { error: `Chef Quirky hit a snag: ${error.message}. Try again!` },
      { status: 500 }
    );
  }
}
