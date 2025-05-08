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
        let dayAssigned = false;

        if (isSingleRecipe) {
          if (
            currentRecipe &&
            currentRecipe.ingredients.length &&
            currentRecipe.instructions.length
          ) {
            recipes.push(currentRecipe);
          }
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
            if (header.toLowerCase().startsWith(d.toLowerCase() + ":")) {
              if (
                currentRecipe &&
                currentRecipe.ingredients.length &&
                currentRecipe.instructions.length
              ) {
                recipes.push(currentRecipe);
              }
              const name = header.replace(new RegExp(`^${d}:`, "i"), "").trim();
              currentRecipe = {
                name,
                ingredients: [],
                instructions: [],
                day: d,
              };
              currentSection = "ingredients";
              dayAssigned = true;
              break;
            }
          }
          if (!dayAssigned) {
            if (
              currentRecipe &&
              currentRecipe.ingredients.length &&
              currentRecipe.instructions.length
            ) {
              recipes.push(currentRecipe);
            }
            currentRecipe = {
              name: header,
              ingredients: [],
              instructions: [],
              day: days[recipes.length] || "Monday",
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
        } else if (currentSection === "ingredients") {
          if (
            line.startsWith("- ") ||
            line.startsWith("* ") ||
            line.startsWith("• ") ||
            line.match(/^\* \*\*[^\*]+\*\*:/)
          ) {
            let ingredient = line.replace(/^\* \*\*[^\*]+\*\*:/, "").trim();
            ingredient = ingredient.replace(/^[-*•]\s*/, "").trim();
            if (ingredient) currentRecipe.ingredients.push(ingredient);
          }
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

    if (
      currentRecipe &&
      currentRecipe.ingredients.length &&
      currentRecipe.instructions.length
    ) {
      recipes.push(currentRecipe);
    }
    if (isSingleRecipe && recipes.length) recipes.length = 1;

    let quirkyResponse = quirkyResponseLines
      .filter((line) => line.trim())
      .join("\n")
      .trim();
    const words = quirkyResponse.split(/\s+/);
    if (words.length > 100)
      quirkyResponse = words.slice(0, 100).join(" ") + "...";

    console.log("Parsed response:", { quirkyResponse, recipes });

    if (!isSingleRecipe && recipes.length > 7) {
      recipes.length = 7;
    } else if (!isSingleRecipe && recipes.length < 7) {
      for (let j = recipes.length; j < 7; j++) {
        recipes.push({
          name: `Placeholder Savoury Meal ${j + 1}`,
          ingredients: ["Ingredient 1", "Ingredient 2"],
          instructions: ["Step 1", "Step 2"],
          day: days[j],
        });
      }
    }

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

export async function GET() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const prompt = `${systemMessage}\n\nProvide seven unique savoury meal recipes, one for each day from Monday to Sunday. Format each recipe with a header like '**Monday: Recipe Name**', followed by Ingredients and Instructions. Ensure each recipe is hearty and includes both ingredients and instructions.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Raw API response for savoury meals:", text);

    const parseResult = parseRecipeResponse(text, false);
    if (!parseResult || typeof parseResult !== "object") {
      console.error(
        "parseRecipeResponse returned invalid result:",
        parseResult
      );
      throw new Error("Invalid response from parseRecipeResponse");
    }

    const { quirkyResponse, recipes } = parseResult;

    if (!recipes || recipes.length === 0) {
      throw new Error("No savoury meal recipes generated");
    }

    return NextResponse.json({ quirkyResponse, recipes });
  } catch (error) {
    console.error("Error in savoury meals API:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Chef Quirky couldn't prepare your savoury meals. Try again!",
      },
      { status: 500 }
    );
  }
}
