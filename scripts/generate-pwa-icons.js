const sharp = require("sharp");
const path = require("path");

const logo = path.join(process.cwd(), "public", "images", "logo.webp");
const outDir = path.join(process.cwd(), "public");

const sizes = [192, 512];

async function main() {
  // Standard PWA icons
  for (const size of sizes) {
    await sharp(logo)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}x${size}.png`));
    console.log(`Created icon-${size}x${size}.png`);
  }

  // Maskable icons (white background with 80% safe zone)
  for (const size of sizes) {
    const inner = Math.round(size * 0.8);
    const logoBuf = await sharp(logo).resize(inner, inner).png().toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: logoBuf, gravity: "center" }])
      .png()
      .toFile(path.join(outDir, `maskable-icon-${size}x${size}.png`));
    console.log(`Created maskable-icon-${size}x${size}.png`);
  }

  // Apple touch icon
  await sharp(logo)
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, "apple-touch-icon.png"));
  console.log("Created apple-touch-icon.png");

  // Favicon 32x32 for public folder
  await sharp(logo)
    .resize(32, 32)
    .png()
    .toFile(path.join(outDir, "favicon-32x32.png"));
  console.log("Created favicon-32x32.png");

  console.log("All PWA icons generated successfully");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
