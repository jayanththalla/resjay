// Minimal PNG icon generator – no external dependencies
// Generates solid indigo/violet gradient-ish icons for Chrome extension
// Run: node scripts/create-png-icons.cjs

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, pixels) {
    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    function crc32(buf) {
        let c = 0xffffffff;
        const table = [];
        for (let n = 0; n < 256; n++) {
            let c2 = n;
            for (let k = 0; k < 8; k++) c2 = c2 & 1 ? 0xedb88320 ^ (c2 >>> 1) : c2 >>> 1;
            table[n] = c2;
        }
        for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    }

    function chunk(type, data) {
        const typeBuffer = Buffer.from(type);
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32BE(data.length);
        const crcInput = Buffer.concat([typeBuffer, data]);
        const crcBuffer = Buffer.alloc(4);
        crcBuffer.writeUInt32BE(crc32(crcInput));
        return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
    }

    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // RGBA
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    // IDAT - raw pixel data with filter bytes
    const rawData = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
        rawData[y * (1 + width * 4)] = 0; // no filter
        for (let x = 0; x < width; x++) {
            const pi = (y * width + x) * 4;
            const offset = y * (1 + width * 4) + 1 + x * 4;
            rawData[offset] = pixels[pi];     // R
            rawData[offset + 1] = pixels[pi + 1]; // G
            rawData[offset + 2] = pixels[pi + 2]; // B
            rawData[offset + 3] = pixels[pi + 3]; // A
        }
    }

    const compressed = zlib.deflateSync(rawData);
    const iend = Buffer.alloc(0);

    return Buffer.concat([
        signature,
        chunk('IHDR', ihdr),
        chunk('IDAT', compressed),
        chunk('IEND', iend),
    ]);
}

function generateIcon(size) {
    const pixels = Buffer.alloc(size * size * 4);
    const r = Math.floor(size * 0.1875); // corner radius ratio

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;

            // Check if inside rounded rect
            let inside = true;
            if (x < r && y < r) inside = Math.hypot(x - r, y - r) <= r;
            else if (x >= size - r && y < r) inside = Math.hypot(x - (size - r - 1), y - r) <= r;
            else if (x < r && y >= size - r) inside = Math.hypot(x - r, y - (size - r - 1)) <= r;
            else if (x >= size - r && y >= size - r) inside = Math.hypot(x - (size - r - 1), y - (size - r - 1)) <= r;

            if (!inside) {
                pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 0;
                continue;
            }

            // Gradient: indigo (#6366f1) to violet (#8b5cf6)
            const t = (x + y) / (size * 2);
            const red = Math.round(99 + (139 - 99) * t);
            const green = Math.round(102 + (92 - 102) * t);
            const blue = Math.round(241 + (246 - 241) * t);

            // Document shape (centered)
            const scale = size / 128;
            const dx = x / scale, dy = y / scale;
            const isDoc = dx >= 34 && dx <= 90 && dy >= 22 && dy <= 110 &&
                !(dx >= 70 && dy <= 42 && dx + dy < 70 + 22 + 0);

            // Sparkle area
            const sx = 94 * scale, sy = 82 * scale;
            const sparkDist = Math.abs(x - sx) + Math.abs(y - sy);
            const isSparkle = sparkDist < 10 * scale;

            if (isDoc) {
                // White document
                pixels[i] = 255;
                pixels[i + 1] = 255;
                pixels[i + 2] = 255;
                pixels[i + 3] = 240;

                // Text lines
                if (dy >= 52 && dy <= 88 && dx >= 44 && dx <= 80) {
                    const lineY = Math.floor((dy - 52) / 8);
                    const lineWidth = [36, 28, 32, 24, 30][lineY] || 0;
                    if ((dy - 52) % 8 < 3 && dx - 44 < lineWidth) {
                        pixels[i] = 99;
                        pixels[i + 1] = 102;
                        pixels[i + 2] = 241;
                        pixels[i + 3] = 80;
                    }
                }
            } else if (isSparkle) {
                // Gold sparkle
                pixels[i] = 251;
                pixels[i + 1] = 191;
                pixels[i + 2] = 36;
                pixels[i + 3] = Math.max(0, 255 - Math.floor(sparkDist / scale * 20));
            } else {
                // Background gradient
                pixels[i] = red;
                pixels[i + 1] = green;
                pixels[i + 2] = blue;
                pixels[i + 3] = 255;
            }
        }
    }

    return createPNG(size, size, pixels);
}

// Generate all sizes
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
[16, 48, 128].forEach(size => {
    const png = generateIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
    console.log(`Created icon${size}.png (${png.length} bytes)`);
});

console.log('Done! PNG icons ready.');
