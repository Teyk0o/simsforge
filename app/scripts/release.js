#!/usr/bin/env node

/**
 * Automated release script
 * Usage: npm run release -- 0.2.0
 *
 * This script:
 * 1. Updates version in app/src-tauri/tauri.conf.json
 * 2. Updates version in app/package.json
 * 3. Creates a commit
 * 4. Creates a git tag
 * 5. Shows next steps (push)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const version = process.argv[2];

if (!version) {
  console.error('❌ Usage: npm run release -- <version>');
  console.error('   Example: npm run release -- 0.2.0');
  process.exit(1);
}

// Validate version format
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('❌ Invalid version format. Use semantic versioning: X.Y.Z');
  process.exit(1);
}

try {
  console.log(`📦 Preparing release v${version}...\n`);

  // Update tauri.conf.json
  const tauriConfigPath = path.join(__dirname, '../src-tauri/tauri.conf.json');
  const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
  tauriConfig.version = version;
  fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');
  console.log(`✓ Updated src-tauri/tauri.conf.json to v${version}`);

  // Update app/package.json
  const appPackagePath = path.join(__dirname, '../package.json');
  const appPackage = JSON.parse(fs.readFileSync(appPackagePath, 'utf8'));
  appPackage.version = version;
  fs.writeFileSync(appPackagePath, JSON.stringify(appPackage, null, 2) + '\n');
  console.log(`✓ Updated package.json to v${version}`);

  // Git commit
  console.log('\n📝 Creating git commit...');
  execSync('git add src-tauri/tauri.conf.json package.json', {
    stdio: 'pipe',
    cwd: path.join(__dirname, '..')
  });
  execSync(`git commit -m "chore: bump version to ${version}"`, {
    stdio: 'pipe',
    cwd: path.join(__dirname, '..')
  });
  console.log(`✓ Committed: "chore: bump version to ${version}"`);

  // Create git tag
  console.log('\n🏷️  Creating git tag...');
  execSync(`git tag v${version}`, {
    stdio: 'pipe',
    cwd: path.join(__dirname, '../..')
  });
  console.log(`✓ Created tag: v${version}`);

  // Show next steps
  console.log('\n✅ Release prepared successfully!\n');
  console.log('📤 Next steps:');
  console.log(`   1. Review the changes: git log -1`);
  console.log(`   2. Push to GitHub: git push origin main`);
  console.log(`   3. Push the tag: git push origin v${version}`);
  console.log('\n💡 Or push everything at once:');
  console.log(`   git push origin main --tags`);
  console.log('\n🚀 The GitHub Actions workflow will automatically:');
  console.log('   - Build the app');
  console.log('   - Create a GitHub Release');
  console.log('   - Generate and deploy the update manifest');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
