// Build-time icon generator: rasterizes public/dumbbell.svg into the PNG and
// ICO assets the app references. Run with: node scripts/gen-icons.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const publicDir = path.join(__dirname, '..', 'public');
const svg = fs.readFileSync(path.join(publicDir, 'dumbbell.svg'));

async function main() {
  // Home-screen / PWA icons.
  await sharp(svg).resize(192, 192).png().toFile(path.join(publicDir, 'logo192.png'));
  await sharp(svg).resize(512, 512).png().toFile(path.join(publicDir, 'logo512.png'));

  // favicon.ico from 16/32/48 PNGs.
  const sizes = [16, 32, 48];
  const buffers = await Promise.all(
    sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer())
  );
  const ico = await pngToIco(buffers);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

  console.log('Generated logo192.png, logo512.png, favicon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
