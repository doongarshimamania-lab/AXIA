import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState, useEffect } from "react";

const testimonials = [
  {
    quote: "Axia helped me identify context gaps in my Upwork submissions that I never knew existed. I've prevented $1,872 in potential payment denials over the past 6 months.",
    author: "Sarah K.",
    details: "Web Developer, Upwork Top-Rated Plus",
  },
  {
    quote: "The dispute simulation feature saved me from a $480 payment denial by showing exactly what evidence was missing before I submitted my work.",
    author: "Michael T.",
    details: "Software Engineer, 3+ years on Upwork",
  },
  {
    quote: "I used to spend hours trying to figure out why my Upwork payments were denied. Axia shows me exactly what's missing in real-time.",
    author: "Priya M.",
    details: "Graphic Designer, 500+ completed projects",
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play functionality
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle swipe navigation
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    
    if (info.offset.x > swipeThreshold) {
      // Swiped right - go to previous
      setActiveIndex((current) => (current - 1 + testimonials.length) % testimonials.length);
    } else if (info.offset.x < -swipeThreshold) {
      // Swiped left - go to next
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }
  };

  const handleDotClick = (index: number) => {
    setActiveIndex(index);
    setIsPaused(true);
    // Resume auto-play after 10 seconds of manual interaction
    setTimeout(() => setIsPaused(false), 10000);
  };

  return (
    <section 
      className="py-20 px-10 bg-background"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-[32px] font-bold text-foreground mb-4">
            Trusted by Freelancers Worldwide
          </h2>
          <p className="text-[18px] text-muted-foreground max-w-[700px] mx-auto">
            Real stories from freelancers who've protected their income with Axia
          </p>
        </motion.div>

        <div className="max-w-[800px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-card rounded-2xl p-8 shadow-sm text-center cursor-grab active:cursor-grabbing border border-border"
            >
              <p 
                className="text-xl text-foreground leading-8 mb-6"
               
              >
                "{testimonials[activeIndex].quote}"
              </p>
              <p className="text-base font-semibold text-foreground mb-2">
                {testimonials[activeIndex].author}
              </p>
              <p className="text-sm text-muted-foreground">
                {testimonials[activeIndex].details}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-3 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === activeIndex
                    ? "bg-primary scale-110"
                    : "bg-border hover:bg-muted-foreground"
                }`}
                aria-label={`View testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}