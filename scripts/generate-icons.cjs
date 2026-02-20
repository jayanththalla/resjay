// Generate PNG icons from the SVG icon
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

const svgContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'icons', 'icon.svg'), 'utf-8');

// Create sized SVGs (Chrome can use SVGs but we also create sized versions)
const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

for (const size of sizes) {
    const resizedSvg = svgContent
        .replace('width="128"', `width="${size}"`)
        .replace('height="128"', `height="${size}"`);

    fs.writeFileSync(path.join(iconsDir, `icon${size}.svg`), resizedSvg);
    console.log(`Created icon${size}.svg`);
}

// Create a simple PNG placeholder using a data URI approach
// For production, use sharp or canvas npm packages
// For now, create colored PNG placeholders
function createMinimalPNG(size) {
    // Minimal valid PNG: solid color square
    // This is a simplified PNG generator for basic colored squares
    const { createCanvas } = (() => {
        try {
            return require('canvas');
        } catch {
            return { createCanvas: null };
        }
    })();

    if (createCanvas) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#8b5cf6');

        // Rounded rect
        const r = size * 0.1875; // 24/128 ratio
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(size - r, 0);
        ctx.quadraticCurveTo(size, 0, size, r);
        ctx.lineTo(size, size - r);
        ctx.quadraticCurveTo(size, size, size - r, size);
        ctx.lineTo(r, size);
        ctx.quadraticCurveTo(0, size, 0, size - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Document shape
        const scale = size / 128;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.moveTo(38 * scale, 22 * scale);
        ctx.lineTo(70 * scale, 22 * scale);
        ctx.lineTo(90 * scale, 42 * scale);
        ctx.lineTo(90 * scale, 106 * scale);
        ctx.quadraticCurveTo(90 * scale, 110 * scale, 86 * scale, 110 * scale);
        ctx.lineTo(38 * scale, 110 * scale);
        ctx.quadraticCurveTo(34 * scale, 110 * scale, 34 * scale, 106 * scale);
        ctx.lineTo(34 * scale, 26 * scale);
        ctx.quadraticCurveTo(34 * scale, 22 * scale, 38 * scale, 22 * scale);
        ctx.fill();

        // Sparkle
        ctx.fillStyle = '#fbbf24';
        const sx = 94 * scale, sy = 82 * scale, ss = 12 * scale;
        ctx.beginPath();
        ctx.moveTo(sx, sy - ss);
        ctx.lineTo(sx + ss * 0.2, sy - ss * 0.2);
        ctx.lineTo(sx + ss, sy);
        ctx.lineTo(sx + ss * 0.2, sy + ss * 0.2);
        ctx.lineTo(sx, sy + ss);
        ctx.lineTo(sx - ss * 0.2, sy + ss * 0.2);
        ctx.lineTo(sx - ss, sy);
        ctx.lineTo(sx - ss * 0.2, sy - ss * 0.2);
        ctx.fill();

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
        console.log(`Created icon${size}.png`);
    } else {
        console.log(`Skipping icon${size}.png (canvas package not installed)`);
        console.log('Run: npm install canvas  (optional, for PNG generation)');
        console.log('Chrome can use SVG icons from manifest - using SVGs instead.');
    }
}

sizes.forEach(createMinimalPNG);

console.log('\nDone! Icon files are in public/icons/');
console.log('Note: Chrome supports SVG icons in manifest.json with Manifest V3.');
