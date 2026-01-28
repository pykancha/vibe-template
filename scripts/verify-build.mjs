
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const distAssets = path.join(root, 'dist', 'assets');

async function main() {
  console.log('Verifying build purity...');

  try {
    await fs.access(distAssets);
  } catch {
    console.error('FAIL: dist/assets directory not found. Did you run build?');
    process.exit(1);
  }

  const files = await fs.readdir(distAssets);
  const jsFiles = files.filter(f => f.endsWith('.js'));

  if (jsFiles.length === 0) {
    console.error('FAIL: No JS files found in dist/assets');
    process.exit(1);
  }

  let failed = false;

  for (const file of jsFiles) {
    const content = await fs.readFile(path.join(distAssets, file), 'utf8');
    
    // Check for devtools artifacts
    // DebugBus is the class name in bus.ts
    if (content.includes('DebugBus')) {
      console.error(`FAIL: "DebugBus" found in ${file}`);
      failed = true;
    }

    // CommandRegistry is the class name in commands.ts
    if (content.includes('CommandRegistry')) {
      console.error(`FAIL: "CommandRegistry" found in ${file}`);
      failed = true;
    }
    
    // Check for DevAssistant component usage (though likely minified/renamed, strings might remain)
    // The class names are better indicators of logic leakage.
    // We can also check for specific strings from server.js if it leaked (unlikely if not imported)
  }

  if (failed) {
    console.error('Build verification FAILED: Devtools leaked into production build.');
    process.exit(1);
  } else {
    console.log('PASS: Build verification passed (no devtools artifacts found).');
  }

  // Check for root-absolute paths in index.html
  // (Static First invariant: must work on subpaths)
  const indexHtmlPath = path.join(root, 'dist', 'index.html');
  try {
    const indexHtml = await fs.readFile(indexHtmlPath, 'utf8');
    
    // We want to avoid href="/..." or src="/..." 
    // BUT we must allow href="//..." (protocol relative) which is fine.
    // Regex: look for href= or src= followed by quote, then /, then NOT /
    const rootAbsRegex = /(?:href|src)=["']\/[^/]/;
    
    if (rootAbsRegex.test(indexHtml)) {
      console.error('FAIL: dist/index.html contains root-absolute paths (e.g. href="/foo").');
      console.error('      This breaks GitHub Pages subpath deployment.');
      console.error('      Ensure vite.config.ts sets base: "./" for build.');
      
      // Print the match for debugging
      const match = indexHtml.match(rootAbsRegex);
      console.error(`      Match: ${match[0]}`);
      
      process.exit(1);
    } else {
      console.log('PASS: dist/index.html uses relative paths (Static First compliant).');
    }

  } catch (e) {
    console.error('FAIL: Could not read dist/index.html');
    process.exit(1);
  }
}

main();
