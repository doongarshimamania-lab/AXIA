// src/pages/PrivacyPolicy.tsx — /privacy route.
//
// Full Privacy Policy covering: GDPR (EU, primary), CCPA (California),
// UK GDPR, then India DPDP Act 2023 (secondary — Axia's legal HQ is in India).
// Full liability shield language.
//
// v7.3: Reordered GLOBAL-first per user preference. India DPDP remains
// covered but is now framed as the legal-HQ jurisdiction rather than the
// primary one. Service URL updated to axia-bay.vercel.app (current production
// domain; apex axia.app will replace it when acquired).
//
// The policy "version" + "last updated" date match the constants exported
// from convex/legal/consent.ts (POLICY_VERSIONS.privacy_policy). When the
// text materially changes, bump both, and users will be re-prompted on next
// sign-in.
//
// ponytail: rendered as plain JSX (no MDX dependency). Each section is a
// component for readability.

import { useEffect, useRef } from "react";
import { Link } from "react-router";

const POLICY_VERSION = "1.0.0";
const LAST_UPDATED = "18 July 2026";
const SERVICE_URL = "axia-bay.vercel.app";
const OPERATOR = "Axia Technologies Pvt. Ltd.";

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

export default function PrivacyPolicy() {
  // Capture the rendered policy HTML at acceptance time → hash it server-side.
  // The signup form reads this element's outerHTML to send to recordLegalConsent.
  const articleRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (articleRef.current) {
      (window as any).__axiaPolicyHtml = articleRef.current.outerHTML;
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
              Privacy Policy
            </h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Version: <span className="font-medium text-foreground">{POLICY_VERSION}</span></span>
              <span>Last updated: <span className="font-medium text-foreground">{LAST_UPDATED}</span></span>
              <span>Operator: <span className="font-medium text-foreground">Axia Technologies Pvt. Ltd.</span></span>
            </div>
          </header>

          <Section id="overview" title="1. Overview">
            <p>
              This Privacy Policy explains how <strong>{OPERATOR}</strong> ("Axia", "we", "us", "our") collects, uses, discloses, and protects your personal information when you use our SaaS platform at <strong>{SERVICE_URL}</strong> (the "Service"). The Service is an agency operating system that helps freelancers, consultants, and small agencies manage clients, projects, proposals, invoices, and payments.
            </p>
            <p>
              By creating an account or using any part of the Service, you acknowledge that you have read and understood this Privacy Policy and consent to the practices described herein. If you do not agree with these practices, you must not use the Service.
            </p>
            <p>
              This Policy is published in accordance with the <strong>General Data Protection Regulation (GDPR)</strong> of the European Union, the <strong>UK GDPR</strong>, the <strong>California Consumer Privacy Act (CCPA)</strong>, and the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India — which is the jurisdiction of our registered office. We apply the most protective standard across all jurisdictions in which we operate. The Service is available globally; users in any jurisdiction benefit from the rights described herein.
            </p>
          </Section>

          <Section id="controller" title="2. Data Controller and Contact">
            <p>
              The data controller for your personal information is:
            </p>
            <p>
              <strong>{OPERATOR}</strong><br />
              CIN: U72900KA2024PTC179XXX<br />
              Registered address: [Registered office address, Bengaluru, Karnataka, India]<br />
              Data Protection Officer: <a href="mailto:dpo@axia-bay.vercel.app">dpo@axia-bay.vercel.app</a><br />
              General inquiries: <a href="mailto:legal@axia-bay.vercel.app">legal@axia-bay.vercel.app</a>
            </p>
            <p>
              For GDPR matters, our EU representative is reachable at <a href="mailto:eu.rep@axia-bay.vercel.app">eu.rep@axia-bay.vercel.app</a>. For DPDP Act matters (India — our legal HQ jurisdiction), the Grievance Officer is reachable at <a href="mailto:grievance@axia-bay.vercel.app">grievance@axia-bay.vercel.app</a> (response within 48 business hours, per DPDP §13).
            </p>
          </Section>

          <Section id="data-we-collect" title="3. Data We Collect">
            <p><strong>3.1 Data you provide directly:</strong></p>
            <ul className="list-disc pl-5">
              <li><strong>Account data:</strong> Name, email address, password (hashed), profile photo, professional bio, hourly rate, years of experience, primary platform (Upwork/Fiverr/etc.), acquisition source.</li>
              <li><strong>Workspace data:</strong> Workspace name, team member names and emails (when you invite them), team structure, role assignments.</li>
              <li><strong>Business data you enter:</strong> Client names, emails, phone numbers, addresses, project descriptions, proposal terms, invoice line items, payment records, time-tracking entries, scope definitions, message content.</li>
              <li><strong>Support communications:</strong> Emails, chat messages, and support tickets you send us.</li>
            </ul>
            <p><strong>3.2 Data collected automatically:</strong></p>
            <ul className="list-disc pl-5">
              <li><strong>Usage data:</strong> Pages visited, features used, session duration, IP address, browser type and version, operating system, device identifiers, referring URL. Collected via first-party cookies and local storage; analytics (PostHog) and error tracking (Sentry) only load if you opt in via the cookie banner.</li>
              <li><strong>Log data:</strong> Server logs containing timestamp, IP, request path, response status, user agent. Retained for 30 days for security and abuse-prevention purposes.</li>
              <li><strong>Auth session data:</strong> Session tokens (24-hour sliding expiry), refresh tokens, login timestamps, IP and User-Agent at login. Stored in the <code>session</code> table in our Convex database.</li>
            </ul>
            <p><strong>3.3 Data from third-party integrations:</strong></p>
            <ul className="list-disc pl-5">
              <li>If you connect a Google or Microsoft account for sign-in, we receive your name, email, and profile photo from the OAuth provider. We do NOT request access to your emails, files, calendar, or contacts beyond what OIDC provides.</li>
              <li>If you connect Paddle (for SaaS subscription billing), we receive subscription ID, plan, status, and renewal date. We do NOT receive your full payment card number — Paddle tokenizes all card data.</li>
              <li>If you connect a payment provider (Stripe, Razorpay) for invoice collection, we receive the provider's transaction ID and status. Card data never touches our servers.</li>
            </ul>
            <p><strong>3.4 Sensitive data we DO NOT collect:</strong></p>
            <p>We do not collect or process any special-category data under GDPR Art. 9 (health, sexual orientation, religious beliefs, biometric data, etc.). If you inadvertently enter such data into a project description or message, it is your responsibility; we treat it as ordinary business data.</p>
          </Section>

          <Section id="legal-basis" title="4. Legal Basis for Processing (GDPR Art. 6)">
            <p>We process your personal data under the following legal bases:</p>
            <ul className="list-disc pl-5">
              <li><strong>Contractual necessity (Art. 6(1)(b)):</strong> To deliver the Service you signed up for — creating your account, storing your projects and invoices, sending notifications, processing payments.</li>
              <li><strong>Legal obligation (Art. 6(1)(c)):</strong> To comply with tax laws (Indian GST where applicable, EU VAT, US sales tax), court orders, and lawful government requests.</li>
              <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> For security (fraud detection, rate limiting, audit logging), product improvement (aggregate analytics, when enabled), and business operations (billing, customer support).</li>
              <li><strong>Consent (Art. 6(1)(a)):</strong> For analytics cookies (PostHog), error tracking (Sentry), and marketing communications. You can withdraw consent at any time via the cookie banner or Account Settings.</li>
            </ul>
            <p>Under India's DPDP Act 2023 (our legal HQ jurisdiction), processing is grounded in your explicit consent at signup (DPDP §6) and the legitimate uses described in this Policy (DPDP §7). Under CCPA, we are a "service provider" processing your personal information to perform the services you requested.</p>
          </Section>

          <Section id="purposes" title="5. How We Use Your Data">
            <p>We use your data for the following purposes:</p>
            <ul className="list-disc pl-5">
              <li><strong>Service delivery:</strong> Account creation, authentication, workspace management, storing and displaying your clients/projects/invoices/proposals.</li>
              <li><strong>Communications:</strong> Transactional emails (password reset, payment receipts, invoice reminders), in-app notifications, occasional product updates (opt-out available).</li>
              <li><strong>Billing:</strong> Processing subscription payments via Paddle, generating invoices, tracking payment status, preventing fraud and chargebacks.</li>
              <li><strong>Security:</strong> Detecting unauthorized access, rate-limiting abuse, investigating policy violations, maintaining audit trails for legal compliance.</li>
              <li><strong>Product improvement:</strong> Analyzing feature usage (only when you opt in to analytics), identifying bugs (Sentry error tracking), prioritizing roadmap based on aggregate patterns.</li>
              <li><strong>Legal compliance:</strong> Responding to lawful requests from authorities in any jurisdiction where we operate — including Indian authorities (DPDP §36, IT Act 2000 §69B), EU supervisory authorities (GDPR Art. 6(1)(c)), US court orders, and international authorities where required by treaty or MLAT. We maintain records per GST/IT Act requirements applicable to our Indian legal entity.</li>
            </ul>
            <p>We do NOT use your data for: training AI models on your business content, selling your personal data to third parties, cross-context behavioral advertising, or any purpose not listed above.</p>
          </Section>

          <Section id="sharing" title="6. Data Sharing and Disclosure">
            <p>We share your data only with the following categories of recipients:</p>
            <ul className="list-disc pl-5">
              <li><strong>Cloud infrastructure providers:</strong> <strong>Convex</strong> (convex.dev, USA) hosts our database and backend runtime. <strong>Vercel</strong> (vercel.com, USA) hosts our frontend and CDN. Both are GDPR-compliant via Standard Contractual Clauses.</li>
              <li><strong>Payment processors:</strong> <strong>Paddle</strong> (paddle.com, UK/USA) for SaaS subscriptions; <strong>Stripe</strong> (stripe.com, USA) and <strong>Razorpay</strong> (razorpay.com, India) when agencies use them for invoice collection. All processors are PCI-DSS Level 1 certified; card data never touches our servers.</li>
              <li><strong>Email delivery:</strong> <strong>Resend</strong> (resend.com, USA) for transactional emails (password reset, invoice reminders, magic links).</li>
              <li><strong>Analytics & error tracking (when you opt in):</strong> <strong>PostHog</strong> (posthog.com, USA/EU) for product analytics; <strong>Sentry</strong> (sentry.io, USA/EU) for crash reporting. Both are configured to mask PII before transmission.</li>
              <li><strong>Legal authorities:</strong> Where required by law (GDPR Art. 6(1)(c), India DPDP §36, IT Act 2000 §69B, US court orders), court order, or valid international legal request (MLAT). We will notify you unless legally prohibited.</li>
            </ul>
            <p>We do NOT share your data with: advertising networks, data brokers, social media platforms (beyond OAuth you explicitly initiate), or any third party for their own commercial purposes.</p>
          </Section>

          <Section id="international-transfers" title="7. International Data Transfers">
            <p>
              Your data is stored in our Convex database (currently in us-east-1 / eu-west-1 regions) and processed by Vercel's global edge network. Because Axia serves a global user base from an Indian legal entity, your data may be transferred across borders — including to the USA (Convex, Vercel, Resend, PostHog, Sentry), the EU (PostHog EU, Sentry EU), and the UK.
            </p>
            <p>
              For GDPR compliance, all transfers to non-EEA countries are governed by the European Commission's Standard Contractual Clauses, available on request from <a href="mailto:dpo@axia-bay.vercel.app">dpo@axia-bay.vercel.app</a>. We have completed Transfer Impact Assessments for each processor.
            </p>
            <p>
              For India DPDP Act 2023 §16 compliance (applicable to our legal HQ), we only transfer personal data to countries that allow an adequate level of protection (per the Indian government's whitelist, when published) or under Standard Contractual Clauses with our processors.
            </p>
            <p>
              For UK GDPR, transfers to non-UK recipients use the UK International Data Transfer Addendum to the EU SCCs.
            </p>
            <p>
              For CCPA, we do not "sell" or "share" personal information across state lines (per CCPA §1798.140) and do not transfer California consumer data to any third party for monetary consideration.
            </p>
          </Section>

          <Section id="retention" title="8. Data Retention">
            <p>We retain your personal data for the following periods:</p>
            <ul className="list-disc pl-5">
              <li><strong>Active accounts:</strong> For as long as your account is active.</li>
              <li><strong>Closed accounts:</strong> 90 days after you delete your account, after which we hard-delete your personal data (name, email, profile, business records) from primary storage. Aggregated/anonymized data may be retained indefinitely.</li>
              <li><strong>Billing records:</strong> 7 years (per Indian Income Tax Act §44AA and GST Act §36, applicable to our Indian legal entity). This includes invoices, payment receipts, and subscription history. EU and US users: this retention period is required by the laws of our legal-HQ jurisdiction and is therefore lawful under GDPR Art. 17(3)(b) and CCPA §1798.105(a)(1).</li>
              <li><strong>Audit logs:</strong> 3 years (DPDP §18 consent records, GDPR Art. 30 records of processing, security event logs).</li>
              <li><strong>Server logs:</strong> 30 days (IP, User-Agent, request path).</li>
              <li><strong>Backups:</strong> Encrypted backups are retained for 30 days. Account deletion requests are propagated to backups within this window.</li>
            </ul>
            <p>To request earlier deletion, email <a href="mailto:dpo@axia-bay.vercel.app">dpo@axia-bay.vercel.app</a> with the subject "Deletion Request". We respond within 30 days (per DPDP §12(3), GDPR Art. 17(3)).</p>
          </Section>

          <Section id="your-rights" title="9. Your Rights">
            <p>Depending on your jurisdiction, you have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5">
              <li><strong>Access (DPDP §11, GDPR Art. 15):</strong> Request a copy of all personal data we hold about you.</li>
              <li><strong>Correction (DPDP §12(1)(b), GDPR Art. 16):</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Erasure (DPDP §12(1)(c), GDPR Art. 17):</strong> Request deletion of your personal data, subject to legal retention requirements.</li>
              <li><strong>Portability (GDPR Art. 20):</strong> Receive your data in a machine-readable format (JSON or CSV) and transmit it to another service.</li>
              <li><strong>Objection (GDPR Art. 21):</strong> Object to processing based on legitimate interests or for direct marketing.</li>
              <li><strong>Restriction (GDPR Art. 18):</strong> Request temporary restriction of processing while we investigate a correction or objection.</li>
              <li><strong>Withdraw consent (DPDP §6(4), GDPR Art. 7(3)):</strong> Withdraw consent for analytics, marketing, or any processing based on consent. Withdrawal does not affect the lawfulness of processing before withdrawal.</li>
              <li><strong>Opt-out of sale (CCPA §1798.120):</strong> We do not sell personal data. No opt-out is necessary.</li>
              <li><strong>Grievance redressal (DPDP §13, India):</strong> File a grievance with our Grievance Officer at <a href="mailto:grievance@axia-bay.vercel.app">grievance@axia-bay.vercel.app</a>. If unsatisfied, you may escalate to the Data Protection Board of India.</li>
            </ul>
            <p>To exercise any of these rights, email <a href="mailto:dpo@axia-bay.vercel.app">dpo@axia-bay.vercel.app</a> from the email associated with your account. We verify your identity before responding. Response time: 30 days (DPDP §12(3), GDPR Art. 12(3)). CCPA requests are free of charge up to twice per 12-month period (§1798.110(d)).</p>
          </Section>

          <Section id="security" title="10. Security">
            <p>We implement industry-standard technical and organizational measures to protect your data:</p>
            <ul className="list-disc pl-5">
              <li><strong>Encryption in transit:</strong> All traffic uses TLS 1.3 with HSTS, certificate pinning on the mobile-extended webview, and a strict Content-Security-Policy header.</li>
              <li><strong>Encryption at rest:</strong> Convex encrypts all database storage at rest (AES-256). Backups are encrypted with a separate key.</li>
              <li><strong>Authentication:</strong> Better Auth with scrypt-hashed passwords (N=16384, r=16, p=1), 24-hour sliding sessions, optional 2FA via email OTP or magic link.</li>
              <li><strong>Authorization:</strong> Owner-only role enforcement on admin endpoints (<code>requireOwner</code>), per-workspace scoping on all business data, signature verification on all webhooks (Paddle HMAC-SHA256, Stripe signature, Razorpay signature).</li>
              <li><strong>Rate limiting:</strong> Distributed per-user rate limiting on all sensitive mutations (sign-in, password reset, payment initiation) to prevent brute-force and abuse.</li>
              <li><strong>Audit logging:</strong> Every admin action, billing event, and consent change is logged with timestamp, IP, and User-Agent. Logs are tamper-evident (append-only) and retained for 3 years.</li>
              <li><strong>Vendor security:</strong> All processors (Convex, Vercel, Paddle, Stripe, Resend, PostHog, Sentry) are SOC 2 Type II certified and reviewed annually by us.</li>
              <li><strong>Access controls:</strong> Production database access is restricted to two named individuals (founders) using short-lived tokens. No standing access. All access is logged.</li>
              <li><strong>Incident response:</strong> Security incidents are triaged within 4 hours of detection. Affected users are notified within 72 hours per GDPR Art. 33 and DPDP §8(6), and per applicable US state breach-notification laws.</li>
            </ul>
            <p>Despite these measures, no system can be guaranteed secure. We cannot warrant absolute security of your data.</p>
          </Section>

          <Section id="children" title="11. Children's Privacy">
            <p>
              The Service is intended for use by freelancers, consultants, and agency professionals aged 18 and older. We do not knowingly collect personal data from individuals under 18. If we become aware that we have collected such data, we will delete it within 30 days. If you believe we have collected data from a minor, contact <a href="mailto:dpo@axia-bay.vercel.app">dpo@axia-bay.vercel.app</a>. (COPPA §312.5, GDPR Art. 8, DPDP §9.)
            </p>
          </Section>

          <Section id="cookies" title="12. Cookies and Local Storage">
            <p>
              We use cookies and browser local storage for authentication, remembering your preferences, and (with your consent) analytics. The full list of cookies and storage keys, their categories, purposes, and TTLs is published in our <Link to="/cookies">Cookie Policy</Link>.
            </p>
            <p>
              You can accept all, reject all, or customize per category (strictly necessary, functional, analytics, marketing) via the cookie banner that appears on first visit. You can change your preferences at any time from the <Link to="/cookies">Cookie Policy page</Link>.
            </p>
          </Section>

          <Section id="liability" title="13. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law:
            </p>
            <ul className="list-disc pl-5">
              <li>The Service is provided on an "as is" and "as available" basis. We make no warranties, express or implied, including any warranty of merchantability, fitness for a particular purpose, or non-infringement.</li>
              <li>We do not warrant that the Service will be uninterrupted, error-free, secure, or that defects will be corrected.</li>
              <li>We are not liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, business opportunities, or goodwill, arising out of or related to your use of (or inability to use) the Service.</li>
              <li>Our aggregate liability for any claim arising out of or related to the Service, regardless of the form of action, shall not exceed the amount you paid us in the 12 months preceding the claim, or USD $100 (whichever is greater).</li>
              <li>We are not liable for any loss or corruption of data you store in the Service. You are solely responsible for maintaining backups of your business records outside the Service.</li>
              <li>We are not liable for the acts or omissions of third-party payment processors (Paddle, Stripe, Razorpay), infrastructure providers (Convex, Vercel), or email providers (Resend). Any dispute with such providers must be resolved directly with them.</li>
              <li>We are not liable for any unauthorized access to your account resulting from your failure to maintain the confidentiality of your password, your use of a weak password, or your failure to enable available security features (2FA, magic link).</li>
              <li>Some jurisdictions do not allow the exclusion or limitation of certain damages. In such jurisdictions, our liability is limited to the maximum extent permitted by law.</li>
            </ul>
          </Section>

          <Section id="indemnity" title="14. Indemnification">
            <p>
              You agree to indemnify and hold harmless Axia, its officers, directors, employees, and affiliates from any claim, demand, loss, or damages (including reasonable attorneys' fees) arising out of: (a) your breach of these Terms or this Privacy Policy; (b) your violation of any law or third-party right in connection with your use of the Service; (c) any data you submit that infringes a third party's intellectual property or privacy rights; or (d) any dispute between you and your clients regarding invoices, payments, or project deliverables managed through the Service.
            </p>
          </Section>

          <Section id="changes" title="15. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will: (a) bump the version number at the top of this page; (b) update the "Last updated" date; (c) notify you by email at least 30 days before the change takes effect; and (d) require you to re-consent to the new version on your next sign-in (your continued use after the effective date constitutes acceptance of the new version).
            </p>
            <p>
              The previous version of each policy is archived and available on request from <a href="mailto:legal@axia-bay.vercel.app">legal@axia-bay.vercel.app</a>. We retain the audit record of which version you accepted and when, per DPDP §18 and GDPR Art. 7(1).
            </p>
          </Section>

          <Section id="disputes" title="16. Dispute Resolution and Governing Law">
            <p>
              This Privacy Policy is governed by the laws of the Republic of India (our legal-HQ jurisdiction), without regard to its conflict-of-law principles. The courts of Bengaluru, Karnataka, have exclusive jurisdiction over any dispute arising out of or related to this Policy or the Service.
            </p>
            <p>
              Before initiating litigation, the parties agree to attempt good-faith negotiation for 30 days, followed by mediation under the Mediation Act 2023. If unresolved, the dispute shall be referred to a sole arbitrator appointed mutually under the Arbitration and Conciliation Act 1996. The seat and venue of arbitration shall be Bengaluru. The language of arbitration shall be English.
            </p>
            <p>
              EU users retain the right to bring proceedings in their country of residence under GDPR Art. 79. UK users retain rights under UK GDPR Art. 79. California users retain the right to bring proceedings under CCPA §1798.150. These jurisdiction-specific rights are preserved and do not override the governing-law clause above; the user may elect the forum most favourable to them.
            </p>
          </Section>

          <Section id="contact" title="17. Contact">
            <p>
              For any questions, requests, or complaints regarding this Privacy Policy or your personal data, contact:
            </p>
            <p>
              <strong>Data Protection Officer</strong><br />
              {OPERATOR}<br />
              Email: <a href="mailto:dpo@axia-bay.vercel.app">dpo@axia-bay.vercel.app</a><br />
              Grievance Officer (India): <a href="mailto:grievance@axia-bay.vercel.app">grievance@axia-bay.vercel.app</a><br />
              Legal: <a href="mailto:legal@axia-bay.vercel.app">legal@axia-bay.vercel.app</a>
            </p>
            <p>
              You also have the right to lodge a complaint with the supervisory authority in your EU member state (GDPR Art. 77), the UK Information Commissioner's Office, the California Attorney General (CCPA §1798.155), or the Data Protection Board of India (DPDP §14).
            </p>
          </Section>
        </article>
      </div>
    </div>
  );
}
