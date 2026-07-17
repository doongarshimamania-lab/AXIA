// src/pages/TermsOfService.tsx — /terms route.
//
// Full Terms & Conditions covering: India Contract Act 1872 + IT Act 2000 +
// DPDP Act 2023 (primary), GDPR (EU), CCPA (California). Full liability shield.
//
// The policy "version" + "last updated" date match the constants exported
// from convex/legal/consent.ts (POLICY_VERSIONS.terms_of_service). When the
// text materially changes, bump both, and users will be re-prompted on next
// sign-in.

import { useEffect, useRef } from "react";
import { Link } from "react-router";

const POLICY_VERSION = "1.0.0";
const LAST_UPDATED = "17 July 2026";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-20">
      <h2 className="text-xl sm:text-2xl font-semibold text-foreground font-[Space_Grotesk]">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed [&_strong]:text-foreground [&_a]:text-foreground [&_a:hover]:text-primary [&_a]:underline [&_li]:mt-1 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
        {children}
      </div>
    </section>
  );
}

export default function TermsOfService() {
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (articleRef.current) {
      (window as any).__axiaTermsHtml = articleRef.current.outerHTML;
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to app
        </Link>

        <article ref={articleRef} className="mt-6">
          <header className="border-b border-border pb-6">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-[Space_Grotesk]">
              Terms of Service
            </h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Version: <span className="font-medium text-foreground">{POLICY_VERSION}</span></span>
              <span>Last updated: <span className="font-medium text-foreground">{LAST_UPDATED}</span></span>
              <span>Operator: <span className="font-medium text-foreground">Axia Technologies Pvt. Ltd.</span></span>
            </div>
          </header>

          <Section id="agreement" title="1. Agreement to Terms">
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", "your") and <strong>Axia Technologies Pvt. Ltd.</strong> ("Axia", "we", "us", "our") governing your access to and use of the SaaS platform at <strong>axia.app</strong> and any related subdomains (the "Service").
            </p>
            <p>
              By creating an account, clicking "I agree", or using any part of the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <Link to="/privacy">Privacy Policy</Link> and <Link to="/cookies">Cookie Policy</Link>, which are incorporated by reference. If you do not agree, you must not access or use the Service.
            </p>
            <p>
              You represent and warrant that: (a) you are at least 18 years of age; (b) you have the legal capacity to enter into a binding contract; (c) if you are entering into these Terms on behalf of an entity (your agency, company, or LLC), you have the authority to bind that entity; and (d) your use of the Service complies with all applicable laws in your jurisdiction.
            </p>
          </Section>

          <Section id="service" title="2. The Service">
            <p>
              Axia is a SaaS platform that provides an "agency operating system" — tools for freelancers, consultants, and small agencies to manage clients, projects, proposals, invoices, payments, pipelines, and time tracking. The Service is offered in multiple subscription tiers (Free, Starter, Pro, Expert) with feature differences described on the Pricing page.
            </p>
            <p>
              We reserve the right to modify, suspend, or discontinue any feature of the Service at any time, with or without notice. We will not be liable to you or any third party for any such modification, suspension, or discontinuation, except as required by law.
            </p>
            <p>
              The Service is not directed at individuals located in jurisdictions where the Service is illegal or where we are not licensed to operate (currently: no exclusions; this list may be updated).
            </p>
          </Section>

          <Section id="accounts" title="3. Accounts and Authentication">
            <p>
              To use most features, you must create an account by providing your name, email address, and a password (or by signing in via Google or Microsoft OAuth, magic link, or email OTP). You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account.
            </p>
            <p>
              You agree to: (a) provide accurate and complete information at sign-up; (b) keep your account information updated; (c) use a strong, unique password; (d) immediately notify us at <a href="mailto:security@axia.app">security@axia.app</a> of any unauthorized use of your account; and (e) accept all risks of unauthorized access if you fail to enable available security features.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that: violate these Terms, engage in fraudulent or abusive behavior, fail to pay subscription fees when due, or expose us to legal liability. We will provide notice and an opportunity to cure where feasible.
            </p>
          </Section>

          <Section id="acceptable-use" title="4. Acceptable Use">
            <p>You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-5">
              <li>Violate any applicable local, national, or international law or regulation;</li>
              <li>Infringe the intellectual property, privacy, or other rights of any third party;</li>
              <li>Upload, store, or transmit any content that is illegal, defamatory, harassing, hateful, or that contains malware, viruses, or other malicious code;</li>
              <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or the systems or networks of Axia or its providers;</li>
              <li>Use the Service to send unsolicited commercial communications (spam);</li>
              <li>Reverse-engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service;</li>
              <li>Use the Service in any manner that could damage, disable, overburden, or impair the Service (including denial-of-service attacks, scraping, or automated rate exceeding);</li>
              <li>Use the Service to process data on behalf of a third party (your client) without their consent and a lawful basis under applicable data protection law;</li>
              <li>Resell, sublicense, or redistribute access to the Service without our prior written consent.</li>
            </ul>
            <p>
              Violations may result in immediate account suspension and, where applicable, referral to law enforcement. We reserve the right to report violations to authorities in India (IT Act 2000 §43, §66) and abroad.
            </p>
          </Section>

          <Section id="subscriptions" title="5. Subscriptions and Billing">
            <p>
              Paid plans (Starter, Pro, Expert) are billed monthly or annually in advance via <strong>Paddle</strong> (our merchant of record). By subscribing, you authorize Paddle to charge your payment method on a recurring basis until you cancel.
            </p>
            <p>
              <strong>Pricing:</strong> Current prices are displayed on the Pricing page. We may change prices with at least 30 days' notice. Existing subscribers retain the previous price for the remainder of the current billing period; new prices apply at the next renewal.
            </p>
            <p>
              <strong>Cancellation:</strong> You can cancel your subscription at any time from Account Settings. Cancellation takes effect at the end of the current billing period. No refunds are issued for partial billing periods, except where required by law (e.g., EU consumer protection allows 14-day withdrawal for B2C contracts).
            </p>
            <p>
              <strong>Refunds:</strong> Refunds are issued at our discretion for service outages exceeding 24 hours in a 30-day period, billing errors, or where required by law. To request a refund, email <a href="mailto:billing@axia.app">billing@axia.app</a> within 30 days of the disputed charge.
            </p>
            <p>
              <strong>Taxes:</strong> Prices exclude applicable taxes (GST for Indian customers, VAT for EU customers, sales tax for US customers), which are added at checkout by Paddle based on your billing address.
            </p>
            <p>
              <strong>Plan changes during payment integration:</strong> Until our Paddle checkout flow is fully wired into the Pricing modal, paid tier upgrades require contacting <a href="mailto:billing@axia.app">billing@axia.app</a>. Self-serve tier changes via the in-app modal can only cancel (downgrade to Free) — they cannot self-upgrade paid tiers. This is a security measure to prevent privilege escalation.
            </p>
          </Section>

          <Section id="free-trial" title="6. Free Tier and Trials">
            <p>
              The Free tier provides limited features (1 report/month, basic evidence, no priority support) at no cost. We may discontinue the Free tier or modify its feature set with 60 days' notice. Free tier users are still bound by these Terms and the Privacy Policy.
            </p>
            <p>
              Where we offer time-limited trials of paid features, the trial converts to a paid subscription at the end of the trial period unless you cancel before the trial ends. You will receive an email reminder at least 3 days before the trial ends.
            </p>
          </Section>

          <Section id="content" title="7. Your Content">
            <p>
              You retain all ownership rights to the data you submit to the Service (clients, projects, invoices, proposals, messages, time entries — collectively, "Content"). You grant Axia a worldwide, non-exclusive, royalty-free license to host, store, transmit, display, and process your Content solely as necessary to provide the Service to you.
            </p>
            <p>
              You represent and warrant that: (a) you own or have the necessary rights to submit your Content; (b) your Content does not violate the rights of any third party; and (c) you have obtained any necessary consents (including under GDPR/DPDP) from your clients whose personal data you enter into the Service.
            </p>
            <p>
              We do not claim ownership of your Content. We will not access, view, or share your Content except: (a) as necessary to provide the Service; (b) to comply with legal obligations; (c) to investigate suspected violations of these Terms; or (d) with your explicit consent.
            </p>
            <p>
              You are solely responsible for backing up your Content outside the Service. We are not liable for any loss or corruption of Content stored in the Service (see §11 Limitation of Liability).
            </p>
          </Section>

          <Section id="ip" title="8. Intellectual Property">
            <p>
              The Service, including its software, design, text, graphics, logos, and trademarks, is the exclusive property of Axia Technologies Pvt. Ltd. and is protected by Indian and international intellectual property laws. Nothing in these Terms grants you any right to use the Axia name, logo, or trademarks without our prior written consent.
            </p>
            <p>
              We may use your feedback, suggestions, or ideas about the Service without any obligation to compensate you. We will not use your Content for marketing without your explicit consent.
            </p>
          </Section>

          <Section id="third-party" title="9. Third-Party Services">
            <p>
              The Service integrates with third-party services (Google, Microsoft, Paddle, Stripe, Razorpay, Resend, PostHog, Sentry). Your use of these services is subject to their respective terms and privacy policies. We are not responsible for the acts or omissions of these providers.
            </p>
            <p>
              If you connect a payment processor (Stripe/Razorpay) to collect invoice payments from your clients, you are solely responsible for: (a) complying with the processor's terms; (b) handling disputes and chargebacks; (c) tax compliance on collected payments; and (d) any unauthorized access to your processor account. We are not a party to the relationship between you, your client, and the processor.
            </p>
          </Section>

          <Section id="disclaimers" title="10. Disclaimers">
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITH ALL FAULTS AND WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, AXIA, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AFFILIATES DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-5">
              <li>The implied warranties of merchantability, fitness for a particular purpose, and non-infringement;</li>
              <li>That the Service will meet your requirements or be available at all times;</li>
              <li>That the Service will be uninterrupted, error-free, secure, or free of harmful components;</li>
              <li>That any data stored in the Service will be accurate, complete, or retained without loss;</li>
              <li>That the Service will integrate flawlessly with third-party services;</li>
              <li>That the Service is suitable for use in your jurisdiction or for your specific business needs.</li>
            </ul>
            <p>
              No advice or information, whether oral or written, obtained from Axia or through the Service, creates any warranty not expressly stated in these Terms.
            </p>
            <p>
              The Service is not a substitute for professional legal, tax, or accounting advice. Invoices generated through the Service may not comply with your jurisdiction's tax laws; you are responsible for verifying compliance.
            </p>
          </Section>

          <Section id="liability" title="11. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL AXIA, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-5">
              <li>Any indirect, incidental, special, consequential, or punitive damages;</li>
              <li>Loss of profits, revenue, business opportunities, goodwill, or data;</li>
              <li>Business interruption, loss of anticipated savings, or failure to realize expected benefits;</li>
              <li>Any claim arising from your clients' use of the client portal or your interactions with them;</li>
              <li>Any claim arising from your use of (or inability to use) third-party payment processors, email providers, or integrations;</li>
              <li>Any unauthorized access to your account due to your failure to maintain credential confidentiality;</li>
              <li>Any loss or corruption of Content you store in the Service.</li>
            </ul>
            <p>
              OUR AGGREGATE LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE, REGARDLESS OF THE FORM OF ACTION (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE), SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM; OR (B) USD $100.
            </p>
            <p>
              THE FOREGOING LIMITATIONS APPLY EVEN IF AXIA HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND REGARDLESS OF WHETHER THE CLAIM IS BASED ON CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE.
            </p>
            <p>
              Some jurisdictions do not allow the exclusion or limitation of certain damages (e.g., personal injury, gross negligence, willful misconduct). In such jurisdictions, the above limitations apply to the maximum extent permitted by law.
            </p>
          </Section>

          <Section id="indemnity" title="12. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless Axia, its officers, directors, employees, affiliates, and agents from and against any and all claims, demands, suits, actions, losses, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to:
            </p>
            <ul className="list-disc pl-5">
              <li>Your breach of these Terms or the Privacy Policy;</li>
              <li>Your violation of any applicable law or third-party right;</li>
              <li>Your Content, including any claim that your Content infringes a third party's intellectual property or privacy rights;</li>
              <li>Any dispute between you and your clients regarding invoices, payments, deliverables, or project scope managed through the Service;</li>
              <li>Your use of third-party integrations (payment processors, OAuth providers);</li>
              <li>Any unauthorized access to your account due to your failure to use available security features.</li>
            </ul>
            <p>
              We reserve the right, at our own expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you (in which case you will cooperate with us in asserting any available defenses). You may not settle any matter without our prior written consent.
            </p>
          </Section>

          <Section id="termination" title="13. Termination">
            <p>
              You may terminate your account at any time from Account Settings. Upon termination: (a) your access to the Service ceases immediately; (b) we begin the deletion process described in Privacy Policy §8; (c) any outstanding fees remain payable; (d) sections of these Terms that by their nature should survive termination (including §7 Content, §8 IP, §10 Disclaimers, §11 Liability, §12 Indemnification, §13 Termination, §16 Disputes) continue to apply.
            </p>
            <p>
              We may terminate or suspend your account at any time, with or without cause, including: (a) breach of these Terms; (b) fraudulent or abusive behavior; (c) non-payment of fees; (d) prolonged inactivity (12+ months for Free tier); (e) where required by law. We will provide notice and an opportunity to export your Content (where feasible) before termination for cause, except where prohibited by law or where immediate action is necessary to prevent harm.
            </p>
          </Section>

          <Section id="changes" title="14. Changes to These Terms">
            <p>
              We may modify these Terms at any time. When we do, we will: (a) bump the version number at the top of this page; (b) update the "Last updated" date; (c) notify you by email at least 30 days before the change takes effect; and (d) require you to re-consent on your next sign-in. Your continued use of the Service after the effective date constitutes acceptance of the modified Terms.
            </p>
            <p>
              For material changes (changes to pricing, liability, ownership, or scope of license), we will obtain your explicit affirmative consent before applying the change. Material changes to subscription pricing will not apply until your next renewal.
            </p>
          </Section>

          <Section id="law" title="15. Governing Law and Dispute Resolution">
            <p>
              These Terms are governed by the laws of the Republic of India, without regard to its conflict-of-law principles. The courts of Bengaluru, Karnataka, have exclusive jurisdiction over any dispute arising out of or related to these Terms or the Service.
            </p>
            <p>
              Before initiating litigation, the parties agree to: (a) attempt good-faith negotiation for 30 days; (b) if unresolved, proceed to mediation under the Mediation Act 2023 (Bengaluru venue); (c) if still unresolved, refer the dispute to a sole arbitrator appointed mutually under the Arbitration and Conciliation Act 1996 (Bengaluru seat, English language). The award shall be final and binding.
            </p>
            <p>
              EU consumers retain rights under GDPR Art. 79 and the EU Consumer Rights Directive. California residents retain rights under CCPA §1798.150 and the California Consumer Legal Remedies Act.
            </p>
            <p>
              If any provision of these Terms is held to be unenforceable, the remaining provisions continue in full force and effect.
            </p>
          </Section>

          <Section id="force-majeure" title="16. Force Majeure">
            <p>
              We are not liable for any failure or delay in performance caused by circumstances beyond our reasonable control, including acts of God, natural disasters, war, terrorism, civil unrest, government action, labor disputes, internet or telecommunications failures, pandemics, and outages of third-party providers (Convex, Vercel, Paddle, Stripe).
            </p>
            <p>
              We will use commercially reasonable efforts to resume performance as soon as practicable and to notify you of any service disruption exceeding 4 hours.
            </p>
          </Section>

          <Section id="entire" title="17. Entire Agreement and Severability">
            <p>
              These Terms, together with the Privacy Policy and Cookie Policy, constitute the entire agreement between you and Axia regarding the Service and supersede all prior agreements. If any provision is held unenforceable, the remainder remains in full force.
            </p>
            <p>
              You may not assign these Terms without our prior written consent. We may assign these Terms without consent in connection with a merger, acquisition, or sale of all or substantially all of our assets. Any attempted assignment in violation of this section is void.
            </p>
            <p>
              No waiver of any provision is effective unless in writing and signed by the waiving party. No failure to enforce any right is a waiver of future enforcement.
            </p>
          </Section>

          <Section id="contact" title="18. Contact">
            <p>
              For any questions about these Terms, contact:
            </p>
            <p>
              <strong>Axia Technologies Pvt. Ltd.</strong><br />
              Legal: <a href="mailto:legal@axia.app">legal@axia.app</a><br />
              Billing: <a href="mailto:billing@axia.app">billing@axia.app</a><br />
              Security: <a href="mailto:security@axia.app">security@axia.app</a>
            </p>
          </Section>
        </article>
      </div>
    </div>
  );
}
