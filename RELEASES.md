# Release Guide for SimsForge

## Auto-Update Configuration

SimsForge uses Tauri's built-in auto-update system to deliver updates to users automatically.

### Setup (One-time)

#### 1. Find Your Signing Keys

Tauri already generated keys for you. They're in `app/src-tauri/`:
- `tauri.key` (private key - already in .gitignore)
- `tauri.key.pub` (public key - safe to see)

The public key is already set in `app/src-tauri/tauri.conf.json` ✓

#### 2. Update GitHub Username in Config

Edit `app/src-tauri/tauri.conf.json` and replace:

```json
"endpoints": [
  "https://YOUR_GITHUB_USERNAME.github.io/simsforge/latest.json"
]
```

With your actual GitHub username, e.g.:

```json
"endpoints": [
  "https://teyk0o.github.io/simsforge/latest.json"
]
```

#### 3. Add Private Key to GitHub Secrets

1. Go to `https://github.com/YOUR_REPO/settings/secrets/actions`
2. Click **New repository secret**
3. Name: `TAURI_SIGNING_KEY`
4. Value: Copy entire content of `app/src-tauri/tauri.key` (with `-----BEGIN PRIVATE KEY-----` header)
5. Click **Add secret**

#### 4. Enable GitHub Pages (One-time)

1. Go to **Settings → Pages**
2. Under "Build and deployment"
3. Select **Source: GitHub Actions**
4. Click **Save**

That's it! The workflow will auto-deploy updates to GitHub Pages on each release.

### Publishing a Release

#### 1. Update Version

Edit `app/src-tauri/tauri.conf.json`:

```json
{
  "version": "0.2.0"
}
```

Make sure this matches your git tag.

#### 2. Commit and Tag

```bash
git add .
git commit -m "chore: bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags
```

#### 3. Workflow Runs Automatically

The GitHub Actions workflow `.github/workflows/tauri-release.yml` will:
1. Build the app with `npx tauri build`
2. Create a GitHub Release
3. Upload the MSI installer
4. Generate a signature for auto-updates

The release will be available at: `https://github.com/YOUR_USERNAME/simsforge/releases`

### How Users Get Updates

When a user runs SimsForge:

1. The app checks for updates automatically
2. If a new version is available, a dialog appears
3. User clicks "Install"
4. The app downloads, verifies the signature, and installs the update
5. App restarts with the new version

### Update Endpoints (Self-Hosted)

This setup uses **GitHub Pages** to host update manifests:

```
https://YOUR_GITHUB_USERNAME.github.io/simsforge/latest.json
```

The app will request this file and get:
```json
{
  "version": "0.2.0",
  "notes": "SimsForge 0.2.0 - Auto-update release",
  "pub_date": "2024-01-19T12:34:56Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/user/simsforge/releases/download/v0.2.0/SimsForge_0.2.0_x64.msi"
    }
  }
}
```

**Flow:**
1. App starts → Checks `latest.json` from GitHub Pages
2. If new version exists → Shows update dialog
3. User clicks "Install" → Downloads MSI from GitHub Releases
4. Signature verified with public key → Installation proceeds
5. App restarts with new version

### What the Workflow Does

When you push a tag (e.g., `git tag v0.2.0`):

1. ✅ Builds the app with Tauri
2. ✅ Runs `scripts/generate-update-manifest.js` to create `latest.json`
3. ✅ Creates GitHub Release with MSI file
4. ✅ Deploys `latest.json` to GitHub Pages (auto-updates)

Everything is automatic! Users get updates within minutes of release.

### Troubleshooting

**"Updater not finding updates"?**
- Check GitHub Pages is enabled in repo Settings → Pages
- Verify `latest.json` exists at your GitHub Pages URL
- Check the endpoint in `tauri.conf.json` matches your username

**"Signature verification failed"?**
- Ensure `TAURI_SIGNING_KEY` secret is in GitHub Actions Secrets
- Public key in `tauri.conf.json` must match the private key
- Check Actions workflow logs for signing errors

**Manual test:**
```bash
curl https://YOUR_USERNAME.github.io/simsforge/latest.json
```

Should return JSON with version and download URL.

### Cost

- **GitHub Releases**: Free (stores MSI files)
- **GitHub Pages**: Free (hosts update manifest)
- **GitHub Actions**: Free for public repos (1000 min/month)

Total: **$0** 🎉
