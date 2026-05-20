import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';


async function generate(src, prefix, size) {
	const name = `${prefix}-${size}x${size}.png`;
	await sharp(src).resize(size, size).toFile(join(out, name));
	console.log(name);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '../public/icons');

const src = join(__dirname, '../public/icons/icon.png');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const faviconSrc = join(__dirname, '../public/icons/favicon.png');
const faviconSizes = [32];

for (const size of sizes) {
	await generate(src, 'icon', size);
}

for (const size of faviconSizes) {
	await generate(faviconSrc, 'favicon', size);
}

console.log('Done.');