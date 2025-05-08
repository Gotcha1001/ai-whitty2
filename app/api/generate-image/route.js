import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY });

export async function POST(request) {
  try {
    if (!process.env.REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not configured");
    }
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json(
        { error: "Please provide a prompt" },
        { status: 400 }
      );
    }
    console.log("Generating image for prompt:", prompt);
    const prediction = await replicate.predictions.create({
      version:
        "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      input: {
        prompt,
        num_outputs: 1,
        width: 768,
        height: 768,
        scheduler: "K_EULER",
        num_inference_steps: 30,
        guidance_scale: 7.5,
        negative_prompt: "nsfw, inappropriate, adult content",
      },
    });
    let result = null;
    while (!result || result.status !== "succeeded") {
      result = await replicate.predictions.get(prediction.id);
      if (result.status === "failed") {
        throw new Error("Image generation failed");
      }
      if (result.status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!result.output || !result.output[0]) {
      throw new Error("No image URL in output");
    }
    return NextResponse.json({ imageUrl: result.output[0] });
  } catch (error) {
    console.error("Error in image generation:", error);
    return NextResponse.json(
      { error: `Failed to generate image: ${error.message}` },
      { status: 500 }
    );
  }
}
