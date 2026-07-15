import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="max-w-5xl mx-auto relative px-4">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-lg text-muted-foreground">Page Not Found</p>
          </div>
        </div>
      </div>
    </div>
  );
}