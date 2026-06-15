# AXIA Deploy Keys

## Convex Cloud Deploy Keys

### Development Deployment
- **Deployment Name:** veracious-zebra-519
- **Dashboard URL:** https://dashboard.convex.dev/d/veracious-zebra-519
- **Cloud URL:** https://veracious-zebra-519.convex.cloud
- **Deploy Key:** `dev:veracious-zebra-519|eyJ2MiI6ImI5ODgyZjUwNTc0MDQ2YjdiMDg0MzlkZGI5MmE4NmYwIn0=`

### Production Deployment
- **Deployment Name:** artful-civet-344
- **Cloud URL:** https://artful-civet-344.convex.cloud
- **Deploy Key:** (generate from Convex dashboard when needed)

## How to Deploy

### To Dev Cloud
```bash
cd /home/z/my-project
CONVEX_DEPLOY_KEY="dev:veracious-zebra-519|eyJ2MiI6ImI5ODgyZjUwNTc0MDQ2YjdiMDg0MzlkZGI5MmE4NmYwIn0=" npx convex deploy --typecheck=disable
```

### To Production Cloud
```bash
cd /home/z/my-project
CONVEX_DEPLOY_KEY="<prod-deploy-key>" npx convex deploy --prod --typecheck=disable
```

## GitHub
- **Repo:** doongarshimamania-lab/AXIA.git
- **Token:** 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

## Vercel
- **Site:** axia-six.vercel.app

## Important Rules
- **NEVER** deploy to a local Convex instance
- **NEVER** use "bold-reindeer-389" — that is an old/stale deployment
- Only use veracious-zebra-519 for dev and artful-civet-344 for prod
- **ALWAYS** read this file at the start of every session
- **ALWAYS** use the deploy key when running `npx convex deploy`
