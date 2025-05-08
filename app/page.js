// import Link from "next/link";
// import Image from "next/image";
// import {
//   Carousel,
//   CarouselContent,
//   CarouselItem,
//   CarouselNext,
//   CarouselPrevious,
// } from "@/components/ui/carousel";

// export default function Home() {
//   return (
//     <div className="flex flex-col items-center">
//       <Image
//         src="/food.jpg"
//         alt="Delicious meal"
//         width={1000} // Reduced from 1200 to match new max width
//         height={600} // Kept taller height
//         className="w-full max-w-[1000px] mx-auto h-auto max-h-[400px] md:max-h-[600px] object-cover rounded-lg shadow-lg"
//       />
//       <div className="text-center mt-6">
//         <h1 className="text-4xl font-bold text-white mb-4">
//           Welcome to Recipe Assistant
//         </h1>
//         <p className="text-lg text-gray-200 mb-6 max-w-md">
//           Discover delicious dinner ideas, indulgent cakes, savoury meals, fast
//           food, or cocktails to plan your week ahead!
//         </p>
//         <Link
//           href="/recipes"
//           className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200"
//         >
//           View Recipes
//         </Link>
//       </div>
//     </div>
//   );
// }

"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import Autoplay from "embla-carousel-autoplay";
import { accordionItems, faqItems } from "./data/accordionData";
import MotionWrapperDelay from "./components/FramerMotion/MotionWrapperDelay";
import FeatureMotionWrapper from "./components/FramerMotion/FeatureMotionWrapperMap";

export default function Home() {
  // Create a ref for the autoplay plugin
  const plugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: true }));

  // Sample image data for carousel
  const carouselImages = [
    { src: "/burgers.jpg", alt: "Burgers" },
    { src: "/chocolate_peanut_butter_cup_cakes.jpg", alt: "Tasty Cupcakes" },
    { src: "/food.jpg", alt: "Make A Feast" },
    { src: "/pizza.jpg", alt: "Pizza" },
    { src: "/bread.jpg", alt: "Home Made bread" },
    { src: "/eggs.jpg", alt: "Breakfast" },
    { src: "/cakes.jpg", alt: "Homemade cakes" },
    { src: "/home.jpg", alt: "Home cooking" },
    { src: "/steak.jpg", alt: "Juicy steak" },
    { src: "/cheese.jpg", alt: "Artisan cheese" },
    { src: "/ice.jpg", alt: "Cool desserts" },
    { src: "/muf.jpg", alt: "Freshly baked muffins" },
  ];

  return (
    <div className="flex flex-col items-center space-y-8 px-4">
      {/* Hero Video Section */}
      <div className="w-full max-w-[1000px] relative">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-auto max-h-[400px] md:max-h-[600px] object-cover rounded-lg shadow-lg"
        >
          <source src="/burgers_and_pizza.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Optional overlay text on video */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black bg-opacity-40 p-4 rounded-lg">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Inspiring Recipes
            </h2>
          </div>
        </div>
      </div>

      {/* Text Section */}
      <div className="text-center mt-2">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Recipe Assistant
        </h1>
        <p className="text-lg text-gray-200 mb-6 max-w-md">
          Discover delicious dinner ideas, indulgent cakes, savoury meals, fast
          food, or cocktails to plan your week ahead!
        </p>
        <Link
          href="/recipes"
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition duration-200"
        >
          View Recipes
        </Link>
      </div>

      {/* Image Carousel Section */}
      <div className="w-full max-w-[1000px] mt-8">
        <h3 className="text-2xl font-semibold text-white mb-4 text-center">
          Featured Recipes
        </h3>

        <Carousel
          plugins={[plugin.current]}
          className="w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {carouselImages.map((image, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-2">
                  <div className="overflow-hidden rounded-lg">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={400}
                      height={300}
                      className="w-full h-48 object-cover transition-transform hover:scale-105 duration-300"
                    />
                  </div>
                  <p className="text-center text-gray-200 mt-2">{image.alt}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
      {/* Accordion Section */}
      <div className="w-full max-w-[1000px] mt-10">
        <h3 className="text-2xl font-semibold text-white mb-4 text-center">
          Learn More About Recipe Assistant
        </h3>

        <Accordion
          type="single"
          collapsible
          className="w-full bg-black bg-opacity-30 rounded-lg text-white"
        >
          {accordionItems.map((item, index) => (
            <FeatureMotionWrapper key={item.id} index={index}>
              <AccordionItem value={item.id}>
                <AccordionTrigger className="text-lg font-medium">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-gray-200">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            </FeatureMotionWrapper>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
