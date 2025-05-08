"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function MinimalSmoke() {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const createParticles = () => {
            return Array.from({ length: 15 }, (_, i) => ({
                id: i,
                x: Math.random() * 100,  // Random X position
                y: 100,  // Start from bottom
                size: Math.random() * 40 + 20,  // Random size between 20-60px
                opacity: Math.random() * 0.4 + 0.3,  // Opacity between 0.3-0.7
                duration: Math.random() * 5 + 3,  // Animation duration (3s - 8s)
            }));
        };

        setParticles(createParticles());

        const interval = setInterval(() => {
            setParticles(createParticles());
        }, 5000); // Refresh particles every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none z-10">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    initial={{ opacity: 0, y: particle.y, scale: 0.8 }}
                    animate={{ opacity: particle.opacity, y: "-20%", scale: 1 }}
                    exit={{ opacity: 0, y: "-50%" }}
                    transition={{ duration: particle.duration, ease: "easeOut" }}
                    style={{
                        position: "absolute",
                        left: `${particle.x}%`,
                        width: particle.size,
                        height: particle.size,
                        backgroundColor: "white",
                        borderRadius: "50%",
                        filter: "blur(15px)",
                    }}
                />
            ))}
        </div>
    );
}
