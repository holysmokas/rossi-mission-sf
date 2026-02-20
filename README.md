# ROSSI MISSION SF

Urban art and streetwear store website — Mission District, San Francisco.

Built with **Vite + React**.

## Local Development

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

### Option A: Automatic (GitHub Actions)
Every push to `main` auto-deploys via `.github/workflows/deploy.yml`.

1. Create a repo on GitHub called `rossi-mission-sf`
2. Push this project to the repo
3. Go to **Settings → Pages → Source** → select **GitHub Actions**
4. Site auto-deploys on every push to `main`

### Option B: Manual
```bash
npm run build
npm run deploy
```

## Custom Domain Setup

When ready to connect your domain:

1. In `vite.config.js`, change `base` to `'/'`
2. Create `public/CNAME` with your domain (e.g. `rossimissionsf.com`)
3. In GitHub repo **Settings → Pages → Custom domain**, enter your domain
4. At your registrar, add DNS records:
   - **A records** → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Or **CNAME** → `www` to `yourusername.github.io`
5. Enable "Enforce HTTPS" in Pages settings
