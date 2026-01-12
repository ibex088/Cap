import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const outputPath = path.join(rootDir, 'cap-extension.zip');

async function packageExtension() {
  if (!fs.existsSync(distDir)) {
    console.error('Build directory not found. Run "pnpm build" first.');
    process.exit(1);
  }

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', () => {
    console.log(`Extension packaged: ${outputPath}`);
    console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(distDir, false);
  await archive.finalize();
}

packageExtension();
