import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

export async function POST(request) {
  try {
    console.log("Starting image generation request");

    if (!process.env.REPLICATE_API_KEY) {
      console.error("REPLICATE_API_KEY is not configured");
      throw new Error("REPLICATE_API_KEY is not configured");
    }
    console.log("REPLICATE_API_KEY is configured");

    const { prompt } = await request.json();
    if (!prompt) {
      console.error("No prompt provided in request");
      return NextResponse.json(
        { error: "Please provide a prompt" },
        { status: 400 }
      );
    }
    console.log("Received prompt:", prompt);

    console.log(
      "Initializing Replicate with model: stability-ai/stable-diffusion"
    );
    const prediction = await replicate.predictions.create({
      version:
        "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      input: {
        prompt: prompt,
        num_outputs: 1,
        width: 768,
        height: 768,
        scheduler: "K_EULER",
        num_inference_steps: 30,
        guidance_scale: 7.5,
        negative_prompt: "nsfw, inappropriate, adult content...",
      },
    });
    console.log("Created prediction:", prediction);

    // Poll for the result
    let result = null;
    while (!result || result.status !== "succeeded") {
      result = await replicate.predictions.get(prediction.id);
      console.log("Prediction status:", result.status);

      if (result.status === "failed") {
        throw new Error("Image generation failed");
      }

      if (result.status === "succeeded") {
        break;
      }

      // Wait 1 second before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Final prediction result:", result);

    if (!result.output || !result.output[0]) {
      console.error("No image URL in output:", result);
      throw new Error("No image URL in output");
    }

    console.log("Successfully generated image URL:", result.output[0]);
    return NextResponse.json({ imageUrl: result.output[0] });
  } catch (error) {
    console.error("Detailed error in image generation:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    });
    return NextResponse.json(
      { error: error.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
