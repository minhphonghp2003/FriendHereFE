const sharp = require("sharp");
const path = require("path");

const logo = path.join(process.cwd(), "public", "images", "logo.webp");
const outDir = path.join(process.cwd(), "public");

const appName = "FriendHere";

// SVG text helper
function textWidth(text, fontSize) {
  return text.length * fontSize * 0.55;
}

async function makeScreenshot({ width, height, formFactor }) {
  const logoSize = Math.min(width, height) * 0.25;
  const logoBuf = await sharp(logo).resize(logoSize, logoSize).png().toBuffer();

  const titleFontSize = Math.round(width * 0.045);
  const subtitleFontSize = Math.round(width * 0.025);
  const titleW = textWidth(appName, titleFontSize);
  const subtitle = "Trò chuyện thời gian thực và theo dõi vị trí";
  const subtitleW = textWidth(subtitle, subtitleFontSize);

  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#f8fafc"/>
        <stop offset="100%" style="stop-color:#e2e8f0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <image x="${(width - logoSize) / 2}" y="${height * 0.28}" width="${logoSize}" height="${logoSize}" href="data:image/png;base64,${logoBuf.toString("base64")}"/>
    <text x="${(width - titleW) / 2}" y="${height * 0.60}" font-family="sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="#0f172a">${appName}</text>
    <text x="${(width - subtitleW) / 2}" y="${height * 0.66}" font-family="sans-serif" font-size="${subtitleFontSize}" fill="#64748b">${subtitle}</text>
  </svg>`;

  const filename =
    formFactor === "wide"
      ? "screenshot-wide.png"
      : "screenshot-mobile.png";

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(outDir, filename));

  console.log(`Created ${filename} (${width}x${height})`);
}

async function main() {
  // Mobile screenshot (narrow, no form_factor)
  await makeScreenshot({ width: 1080, height: 1920, formFactor: "narrow" });

  // Desktop screenshot (wide)
  await makeScreenshot({ width: 1920, height: 1080, formFactor: "wide" });

  console.log("All screenshots generated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
