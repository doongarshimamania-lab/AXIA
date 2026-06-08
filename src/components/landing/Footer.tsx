import { useNavigate } from "react-router";

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-card text-muted-foreground py-12 px-6 md:px-10 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Axia" width={24} height={24} />
            <span
              className="text-lg font-bold tracking-tight text-foreground"
              style={{ fontFamily: "Space Grotesk" }}
            >
              Axia
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => {}}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              style={{ fontFamily: "Space Grotesk" }}
            >
              Privacy
            </button>
            <button
              onClick={() => {}}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              style={{ fontFamily: "Space Grotesk" }}
            >
              Terms
            </button>
            <button
              onClick={() => {}}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              style={{ fontFamily: "Space Grotesk" }}
            >
              Contact
            </button>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground/60" style={{ fontFamily: "Space Grotesk" }}>
            © 2025 Axia. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
