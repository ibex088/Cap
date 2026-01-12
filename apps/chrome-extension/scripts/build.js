import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes('--watch');
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const buildOptions = {
  entryPoints: {
    background: path.join(rootDir, 'background.js'),
    popup: path.join(rootDir, 'popup.js'),
    content: path.join(rootDir, 'content.js'),
    offscreen: path.join(rootDir, 'offscreen.js')
  },
  bundle: true,
  outdir: distDir,
  format: 'esm',
  platform: 'browser',
  target: 'chrome100',
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false
};

async function copyStaticFiles() {
  const staticFiles = [
    'manifest.json',
    'popup.html',
    'popup.css',
    'offscreen.html'
  ];

  for (const file of staticFiles) {
    const src = path.join(rootDir, file);
    const dest = path.join(distDir, file);
    
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file}`);
    }
  }

  const iconsDir = path.join(rootDir, 'icons');
  const distIconsDir = path.join(distDir, 'icons');
  
  if (fs.existsSync(iconsDir)) {
    if (!fs.existsSync(distIconsDir)) {
      fs.mkdirSync(distIconsDir, { recursive: true });
    }
    
    const iconFiles = fs.readdirSync(iconsDir);
    for (const file of iconFiles) {
      fs.copyFileSync(
        path.join(iconsDir, file),
        path.join(distIconsDir, file)
      );
    }
    console.log('Copied icons');
  }
}

async function build() {
  try {
    console.log('Building extension...');
    
    await esbuild.build(buildOptions);
    await copyStaticFiles();
    
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

if (isWatch) {
  console.log('Watching for changes...');
  
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  
  const chokidar = await import('chokidar');
  const watcher = chokidar.watch([
    path.join(rootDir, '*.html'),
    path.join(rootDir, '*.css'),
    path.join(rootDir, '*.json'),
    path.join(rootDir, 'icons/**/*')
  ], {
    ignoreInitial: true
  });
  
  watcher.on('change', async (filePath) => {
    console.log(`File changed: ${path.basename(filePath)}`);
    await copyStaticFiles();
  });
} else {
  build();
}
