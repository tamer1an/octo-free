/**
 * build-firefox.cjs
 *
 * Takes the Chrome MV3 dist/ build produced by `npm run build` (Vite + @crxjs/vite-plugin)
 * and repackages it as a Firefox-compatible MV3 extension in dist-firefox/.
 *
 * Key differences handled:
 *  1. background.service_worker → background.scripts (Firefox doesn't support SW in MV3)
 *  2. Adds browser_specific_settings.gecko with id + data_collection_permissions
 *  3. Removes use_dynamic_url from web_accessible_resources (Chrome-only)
 *  4. Fixes absolute asset paths in options HTML → relative
 *  5. Merges service-worker-loader.js content into background.scripts array
 *  6. Packages the result into a .zip ready for AMO upload
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { zipDirectory } = require('./zip-dir.cjs');

const SRC_DIR = path.join(__dirname, 'dist');
const OUT_DIR = path.join(__dirname, 'dist-firefox');
const ZIP_NAME = 'octofree-firefox.zip';
const ZIP_PATH = path.join(__dirname, ZIP_NAME);

// ── 0. Clean output ─────────────────────────────────────────────────────────
if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── 1. Copy everything from dist/ → dist-firefox/ ──────────────────────────
function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
copyRecursive(SRC_DIR, OUT_DIR);
console.log('✓ Copied dist/ → dist-firefox/');

// ── 1b. Fix non-square icons (Firefox requires square) ──────────────────────
try {
  const iconSizes = { 'icon16.png': 16, 'icon48.png': 48, 'icon128.png': 128 };
  for (const [file, size] of Object.entries(iconSizes)) {
    const iconPath = path.join(OUT_DIR, 'icons', file).replace(/\\/g, '/');
    if (fs.existsSync(iconPath)) {
      execSync(
        `node -e "const s=require('sharp');s('${iconPath}').resize(${size},${size},{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile('${iconPath}.tmp').then(()=>{require('fs').renameSync('${iconPath}.tmp','${iconPath}');console.log('  fixed ${file} → ${size}x${size}')})"`,
        { stdio: 'inherit' }
      );
    }
  }
  console.log('✓ Fixed non-square icons to be square');
} catch (e) {
  console.warn('⚠ Could not fix icon dimensions (sharp not available):', e.message);
  console.warn('  Install sharp: npm install --no-save sharp');
}

// ── 2. Transform manifest.json ──────────────────────────────────────────────
const manifestPath = path.join(OUT_DIR, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// 2a. Convert background from service_worker to scripts
if (manifest.background && manifest.background.service_worker) {
  const swLoader = manifest.background.service_worker; // "service-worker-loader.js"
  
  // Read the service-worker-loader.js to find the actual background script it imports
  const swLoaderPath = path.join(OUT_DIR, swLoader);
  const swLoaderContent = fs.readFileSync(swLoaderPath, 'utf8');
  
  // The loader does: import './assets/serviceWorker.ts-DGbOr0L6.js';
  // Extract the imported path
  const importMatch = swLoaderContent.match(/import\s+['"](.+?)['"]/);
  const bgScriptRelative = importMatch ? importMatch[1] : null;
  
  // For Firefox, we need to use background.scripts instead of service_worker
  // Firefox event pages can't use ES module imports the same way,
  // so we'll create a combined background script
  if (bgScriptRelative) {
    // Read the actual background script content
    const bgScriptPath = path.join(OUT_DIR, bgScriptRelative.replace(/^\.\//, ''));
    const bgScriptContent = fs.readFileSync(bgScriptPath, 'utf8');
    
    // Create a standalone background.js that doesn't use ES module imports
    const backgroundJs = path.join(OUT_DIR, 'background.js');
    fs.writeFileSync(backgroundJs, bgScriptContent, 'utf8');
    
    manifest.background = {
      scripts: ['background.js']
    };
    // Remove type: module since we're using a standalone script
    
    console.log('✓ Converted service_worker → background.scripts with standalone background.js');
    
    // Clean up the Chrome-specific service worker loader (no longer referenced)
    if (fs.existsSync(swLoaderPath)) {
      fs.unlinkSync(swLoaderPath);
      console.log('✓ Removed orphaned service-worker-loader.js');
    }
  } else {
    // Fallback: just reference the loader
    manifest.background = {
      scripts: [swLoader]
    };
    console.log('✓ Converted service_worker → background.scripts (fallback)');
  }
}

// 2b. Add browser_specific_settings for Firefox/AMO
manifest.browser_specific_settings = {
  gecko: {
    id: 'octofree@tamer1an.github.io',
    strict_min_version: '140.0',
    data_collection_permissions: {
      required: ['none']
    }
  },
  // data_collection_permissions landed in Firefox for Android 142 (desktop 140)
  gecko_android: {
    strict_min_version: '142.0'
  }
};
console.log('✓ Added browser_specific_settings.gecko');

// 2c. Fix web_accessible_resources: remove use_dynamic_url (Chrome-only)
if (manifest.web_accessible_resources) {
  manifest.web_accessible_resources = manifest.web_accessible_resources.map(entry => {
    if (typeof entry === 'object') {
      const { use_dynamic_url, ...rest } = entry;
      return rest;
    }
    return entry;
  });
  console.log('✓ Cleaned web_accessible_resources (removed use_dynamic_url)');
}

// 2d. Add homepage_url and author
manifest.homepage_url = 'https://github.com/tamer1an/octo-free';
manifest.author = 'Andrii Trybynenko';

// Write transformed manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('✓ Wrote transformed manifest.json');

// ── 3. Fix options page HTML paths ──────────────────────────────────────────
// The built options HTML references /assets/... with absolute paths
// Firefox extensions need relative paths
const optionsHtmlPath = path.join(OUT_DIR, 'src', 'options', 'index.html');
if (fs.existsSync(optionsHtmlPath)) {
  let optionsHtml = fs.readFileSync(optionsHtmlPath, 'utf8');
  // Fix paths like src="/assets/..." or href="/assets/..." → relative paths
  // From src/options/index.html we need ../../assets/...
  optionsHtml = optionsHtml.replace(/(\s(?:src|href))="\/assets\//g, '$1="../../assets/');
  fs.writeFileSync(optionsHtmlPath, optionsHtml, 'utf8');
  console.log('✓ Fixed options page asset paths to relative');
}

// ── 4. Verify all referenced files exist ────────────────────────────────────
console.log('\n── Verifying dist-firefox/ structure ──');

function verifyFile(relPath) {
  const fullPath = path.join(OUT_DIR, relPath);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✓' : '✗'} ${relPath}`);
  return exists;
}

let allGood = true;

// Check manifest-referenced files
if (manifest.background && manifest.background.scripts) {
  manifest.background.scripts.forEach(s => { if (!verifyFile(s)) allGood = false; });
}
if (manifest.content_scripts) {
  manifest.content_scripts.forEach(cs => {
    if (cs.js) cs.js.forEach(j => { if (!verifyFile(j)) allGood = false; });
    if (cs.css) cs.css.forEach(c => { if (!verifyFile(c)) allGood = false; });
  });
}
if (manifest.options_ui && manifest.options_ui.page) {
  if (!verifyFile(manifest.options_ui.page)) allGood = false;
}
if (manifest.icons) {
  Object.values(manifest.icons).forEach(icon => { if (!verifyFile(icon)) allGood = false; });
}
if (manifest.web_accessible_resources) {
  manifest.web_accessible_resources.forEach(entry => {
    if (typeof entry === 'object' && entry.resources) {
      entry.resources.forEach(r => { if (!verifyFile(r)) allGood = false; });
    }
  });
}

if (!allGood) {
  console.error('\n✗ Some referenced files are missing! Check the build.');
  process.exit(1);
}

console.log('\n✓ All referenced files present');

// ── 5. Create .zip for AMO upload ───────────────────────────────────────────
// Remove old zip if exists
if (fs.existsSync(ZIP_PATH)) {
  fs.unlinkSync(ZIP_PATH);
}

// Built with our own writer, not Compress-Archive: PowerShell 5.1 stamps entry
// names with backslashes ("assets\github-*.js"), which the AMO linter rejects
// as "Invalid name in archive" (ZIP APPNOTE §4.4.17.1 requires "/").
let entries;
try {
  entries = zipDirectory(OUT_DIR, ZIP_PATH);
  console.log(`\n✓ Created ${ZIP_NAME} (${entries.length} entries, ready for AMO upload)`);
} catch (err) {
  console.error('✗ Failed to create zip:', err.message);
  process.exit(1);
}

// Guard the regression: no separator other than "/" may reach AMO.
const badEntries = entries.filter(name => name.includes('\\'));
if (badEntries.length) {
  console.error('\n✗ Invalid name(s) in archive (backslash separator):');
  badEntries.forEach(name => console.error(`    ${name}`));
  process.exit(1);
}
console.log('✓ All archive entry names use forward slashes');

// ── 6. Print summary ───────────────────────────────────────────────────────
const zipStats = fs.statSync(ZIP_PATH);
console.log(`\n${'═'.repeat(60)}`);
console.log('  Firefox Extension Build Complete');
console.log(`${'═'.repeat(60)}`);
console.log(`  Directory:  dist-firefox/`);
console.log(`  Package:    ${ZIP_NAME} (${(zipStats.size / 1024).toFixed(1)} KB)`);
console.log(`  Version:    ${manifest.version}`);
console.log(`  Gecko ID:   ${manifest.browser_specific_settings.gecko.id}`);
console.log(`\n  Upload to:  https://addons.mozilla.org/developers/addon/submit/`);
console.log(`  Or use:     web-ext sign --api-key=... --api-secret=...`);
console.log(`${'═'.repeat(60)}\n`);
