import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '..', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const minimalPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const outputPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outputPath, Buffer.from(minimalPNG, 'base64'));
  console.log(`Created ${outputPath}`);
});

console.log('All placeholder icons created successfully!');
