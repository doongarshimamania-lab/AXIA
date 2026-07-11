#!/usr/bin/env bash
# Run web searches serially with delays to avoid 429.
set -uo pipefail

OUT=/home/z/my-project/scripts/research
mkdir -p "${OUT}"

run_search() {
  local name="$1"
  local query="$2"
  local num="${3:-8}"
  echo "---SEARCH: ${name}---"
  if z-ai function -n web_search -a "{\"query\":\"${query}\",\"num\":${num}}" -o "${OUT}/${name}.json" 2>&1 | tail -2; then
    echo "  saved ${name}.json"
  else
    echo "  FAILED ${name}"
  fi
  sleep 4
}

# === AUTH PROVIDERS ===
run_search "auth_clerk"      "Clerk authentication pricing 2026 free tier 10000 MAU"
run_search "auth_convex"     "Convex Auth authentication OAuth Google GitHub 2026 limitations"
run_search "auth_auth0"      "Auth0 pricing 2026 free tier 7000 MAU Okta comparison"
run_search "auth_supabase"   "Supabase Auth pricing 2026 free tier monthly active users GoTrue"
run_search "auth_nextauth"   "Auth.js NextAuth v5 free open source OAuth providers self-host 2026"
run_search "auth_firebase"   "Firebase Authentication pricing 2026 free tier phone SMS limits"
run_search "auth_better_auth" "Better Auth 2026 open source TypeScript free self-host pricing"
run_search "auth_workos"     "WorkOS authentication pricing 2026 free tier SSO SAML"
run_search "auth_stytch"     "Stytch passwordless authentication pricing 2026 free tier"
run_search "auth_logto"      "Logto open source authentication 2026 self-host pricing OIDC"
run_search "auth_super_tokens" "Supertokens 2026 open source authentication pricing self-host"
run_search "auth_kinde"      "Kinde authentication pricing 2026 free tier MAU"
run_search "auth_comparison" "Clerk vs Auth0 vs Supabase vs Convex Auth 2026 comparison pricing"
run_search "auth_google_oauth_direct" "Google OAuth direct implementation free no library 2026 setup"

# === PAYMENT PROCESSORS (Stripe alternatives, international) ===
run_search "pay_lemon_squeezy"  "Lemon Squeezy pricing 2026 merchant of record international SaaS"
run_search "pay_paddle"         "Paddle pricing 2026 merchant of record international taxes VAT"
run_search "pay_razorpay"       "Razorpay pricing 2026 international payments India SaaS"
run_search "pay_mollie"         "Mollie payments pricing 2026 European international SaaS"
run_search "pay_adyen"         "Adyen pricing 2026 enterprise international payments"
run_search "pay_braintree"      "Braintree PayPal pricing 2026 international SaaS"
run_search "pay_paypal_direct"  "PayPal direct payment gateway pricing 2026 international"
run_search "pay_2checkout"      "2Checkout Verifone pricing 2026 merchant of record"
run_search "pay_fastspring"     "FastSpring pricing 2026 merchant of record SaaS international"
run_search "pay_gumroad"        "Gumroad pricing 2026 SaaS digital products fees"
run_search "pay_dodo_payments"  "Dodo Payments pricing 2026 merchant of record alternative"
run_search "pay_creed"          "Creem.io pricing 2026 merchant of record SaaS alternative"
run_search "pay_square"         "Square payment processor pricing 2026 international SaaS"
run_search "pay_mercadopago"    "Mercado Pago pricing 2026 Latin America payments"
run_search "pay_stripes_global_alternatives" "Best Stripe alternatives 2026 international SaaS merchant of record"
run_search "pay_paddle_vs_lemon" "Paddle vs Lemon Squeezy vs FastSpring 2026 comparison SaaS"
run_search "pay_razorpay_eligibility" "Razorpay international eligibility 2026 non-India SaaS"

echo "---ALL DONE---"
ls -la "${OUT}/"
