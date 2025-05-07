import axios from "axios";

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

export async function GET() {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: `${systemMessage}\n\nProvide seven dinner recipes for the week, one for each day (Monday to Sunday).`,
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GOOGLE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { quirkyResponse, recipes } = parseRecipeResponse(
      response.data.candidates[0].content.parts[0].text,
      false
    );

    if (!recipes) {
      return new Response(
        JSON.stringify({
          error: "Chef Quirky couldn't plan your week. Try again!",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ quirkyResponse, recipes }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini error:", error);
    return new Response(
      JSON.stringify({
        error: `Chef Quirky hit a snag: ${error.message}. Try again!`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
