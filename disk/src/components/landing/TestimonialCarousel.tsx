import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    id: 1,
    quote: "I used to lose about 15% of my billable hours to 'clarification' calls and scope creep. Axia's evidence timeline stopped that cold. Clients don't argue with data.",
    author: "Sarah Jenkins",
    role: "Senior UX Designer",
    platform: "Upwork Top Rated Plus"
  },
  {
    id: 2,
    quote: "The dispute simulation saved me from a nightmare client. It flagged that my screenshots weren't frequent enough for the contract terms *before* I submitted the work.",
    author: "Marcus Chen",
    role: "Full Stack Developer",
    platform: "Toptal Network"
  },
  {
    id: 3,
    quote: "Finally, a tool that protects ME. Platforms always side with the client, but Axia gives me the leverage I need to get paid for every minute I work.",
    author: "Elena Rodriguez",
    role: "Digital Marketer",
    platform: "Fiverr Pro"
  }
];

export function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div 
      className="w-full max-w-4xl mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative bg-white dark:bg-card rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 md:p-12 overflow-hidden">
        {/* Decorative Quote Icon */}
        <div className="absolute top-6 left-8 opacity-10">
          <Quote className="w-24 h-24 text-primary dark:text-white" />
        </div>

        <div className="relative z-10 min-h-[200px] flex flex-col justify-center items-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              
              <p className="text-xl md:text-2xl font-medium text-slate-800 dark:text-slate-100 mb-8 leading-relaxed italic" style={{ fontFamily: "Space Grotesk" }}>
                "{testimonials[activeIndex].quote}"
              </p>
              
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  {testimonials[activeIndex].author}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {testimonials[activeIndex].role} • {testimonials[activeIndex].platform}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center gap-3 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? "bg-primary dark:bg-blue-400 w-8" 
                  : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
