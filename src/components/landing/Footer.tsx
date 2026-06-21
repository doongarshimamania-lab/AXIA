import { useNavigate } from "react-router";

const footerLinks = {
  Product: ["Features", "Pricing", "How It Works", "Testimonials"],
  Resources: ["Documentation", "Help Center", "Blog", "Case Studies"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
  Contact: ["Support", "Sales", "Partnerships", "Careers"],
};

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-card text-muted-foreground py-16 px-10 border-t border-border">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: "Space Grotesk" }}>
                {heading}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <button
                      onClick={() => {}}
                      className="text-base text-muted-foreground hover:text-[#00246B] dark:hover:text-white transition-colors font-medium"
                      style={{ fontFamily: "Space Grotesk" }}
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "Space Grotesk" }}>
            © 2025 Axia. All rights reserved. Protecting agency income worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}