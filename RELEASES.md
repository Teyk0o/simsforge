# Release Guide for SimsForge

## Auto-Update Configuration

SimsForge uses Tauri's built-in auto-update system to deliver updates to users automatically.

### Setup (One-time)

#### 1. Generate Signing Keys

The auto-updater uses cryptographic signing to verify update authenticity. Generate keys locally:

```bash
cd app
npx tauri signer generate -- --write-keys
```

This creates two files:
- `src-tauri/tauri.key` (private key - **keep secret**)
- `src-tauri/tauri.key.pub` (public key)

#### 2. Add Public Key to Config

Update `app/src-tauri/tauri.conf.json`:

```json
"updater": {
  "active": true,
  "endpoints": [
    "https://updates.tauri.app/releases/{{target}}/{{arch}}/{{current_version}}"
  ],
  "dialog": true,
  "pubkey": "YOUR_PUBLIC_KEY_HERE"
}
```

Replace `YOUR_PUBLIC_KEY_HERE` with the content of `src-tauri/tauri.key.pub` (without the "-----BEGIN PUBLIC KEY-----" and "-----END PUBLIC KEY-----" lines).

#### 3. Add Private Key to GitHub Secrets

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `TAURI_SIGNING_KEY`
4. Value: Content of `src-tauri/tauri.key` (entire file including the header/footer)
5. Click **Add secret**

**Optional**: Also add `TAURI_SIGNING_KEY_PASSWORD` if your key has a password.

#### 4. Keep Keys Safe

- **`src-tauri/tauri.key`**: Add to `.gitignore` (already done)
- **`src-tauri/tauri.key.pub`**: Safe to commit
- **GitHub Secret**: Encrypted by GitHub, only accessible in Actions

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

### Update Endpoints

The endpoint configured in `tauri.conf.json`:

```
https://updates.tauri.app/releases/{{target}}/{{arch}}/{{current_version}}
```

The app will request:
- `https://updates.tauri.app/releases/windows/x86_64/0.1.0`

This endpoint returns `latest.json` which contains:
- New version available
- Download URL
- Signature for verification

### Troubleshooting

**"Updater not working"?**
- Check that `pubkey` in `tauri.conf.json` is set correctly
- Verify `TAURI_SIGNING_KEY` is in GitHub Secrets
- Check Actions logs for build errors
- Ensure version in code matches git tag

**"Signature verification failed"?**
- Public key doesn't match private key
- Build was not signed with the correct private key
- Regenerate keys and update GitHub Secret

### Alternative: Tauri Cloud

Tauri also offers a managed solution: [Tauri Cloud](https://cloud.tauri.app)

This handles:
- Key management
- Signature generation
- Update distribution

But requires a paid account. GitHub Releases is free and works great for public projects.
