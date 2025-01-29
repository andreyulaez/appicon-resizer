#!/usr/bin/env node

/**
 * Скрипт для автоматической генерации iOS iconset из одной 1024x1024 иконки.
 *
 * РЕЖИМ 1 (одна .appiconset):
 *   node appicon-resizer.js /path/to/AppIcon.appiconset
 *
 * РЕЖИМ 2 (все .appiconset внутри .xcassets):
 *   node appicon-resizer.js /path/to/Assets.xcassets
 *
 * Требования:
 *   1. В каждой .appiconset, которую нужно обрабатывать, лежит contents.json,
 *      где есть запись size="1024x1024" + filename (например, "appicon.jpg").
 *   2. Установлен npm-пакет "sharp" (npm install sharp).
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TARGET_IMAGES = [
  { idiom: "universal", platform: "ios", scale: "2x", size: "20x20" },
  { idiom: "universal", platform: "ios", scale: "3x", size: "20x20" },
  { idiom: "universal", platform: "ios", scale: "2x", size: "29x29" },
  { idiom: "universal", platform: "ios", scale: "3x", size: "29x29" },
  { idiom: "universal", platform: "ios", scale: "2x", size: "38x38" },
  { idiom: "universal", platform: "ios", scale: "3x", size: "38x38" },
  { idiom: "universal", platform: "ios", scale: "2x", size: "40x40" },
  { idiom: "universal", platform: "ios", scale: "3x", size: "40x40" },
  { idiom: "universal", platform: "ios", scale: "2x", size: "60x60" },
  { idiom: "universal", platform: "ios", scale: "3x", size: "60x60" },
  { idiom: "universal", platform: "ios", scale: "2x", size: "64x64" },
  { idiom: "universal", platform: "ios", scale: "3x", size: "64x64" },
  { idiom: "universal", platform: "ios", scale: "2x", size: "68x68" },
  { idiom: "universal", platform: "ios", scale: "2x", size: "76x76" },
  { idiom: "universal", platform: "ios", scale: "2x", size: "83.5x83.5" },
  {
    idiom: "universal",
    platform: "ios",
    size: "1024x1024"
  }
];

function calculateDimensions(sizeStr, scaleStr) {
  const [widthStr, heightStr] = sizeStr.split('x');
  const width = parseFloat(widthStr);
  const height = parseFloat(heightStr);

  if (!scaleStr) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scaleNum = parseInt(scaleStr.replace('x', ''), 10);
  return {
    width: Math.round(width * scaleNum),
    height: Math.round(height * scaleNum)
  };
}

function has1024Icon(appIconSetPath) {
  const contentsJsonPath = path.join(appIconSetPath, 'Contents.json');
  if (!fs.existsSync(contentsJsonPath)) {
    return false;
  }
  const contents = JSON.parse(fs.readFileSync(contentsJsonPath, 'utf8'));
  const record = contents.images?.find(img => img.size === '1024x1024' && img.filename);
  return !!record;
}

async function resizeAppIconSet(appIconSetPath) {
  const contentsJsonPath = path.join(appIconSetPath, 'Contents.json');

  if (!fs.existsSync(contentsJsonPath)) {
    throw new Error(`Contents.json file not found in ${appIconSetPath}`);
  }

  const originalContents = JSON.parse(fs.readFileSync(contentsJsonPath, 'utf8'));
  const originalImageInfo = originalContents.images?.find(img => img.size === '1024x1024');
  if (!originalImageInfo) {
    throw new Error(`No entry with size=1024x1024 found in Contents.json: ${contentsJsonPath}`);
  }

  if (!originalImageInfo.filename) {
    throw new Error(`Entry with size=1024x1024 does not contain filename. Please specify the filename in Contents.json!`);
  }
  const originalFilename = originalImageInfo.filename;

  const originalFilePath = path.join(appIconSetPath, originalFilename);
  if (!fs.existsSync(originalFilePath)) {
    throw new Error(`Original 1024x1024 icon file not found: ${originalFilePath}`);
  }

  const newImages = [];
  for (const spec of TARGET_IMAGES) {
    const { size, scale, idiom, platform } = spec;
    const dims = calculateDimensions(size, scale);

    let filename;
    if (!scale && size === '1024x1024') {
      filename = originalFilename;
    } else {
      const safeSize = size.replace('.', '_');
      filename = `icon-${safeSize}${scale ? '@' + scale : ''}.png`;

      await sharp(originalFilePath)
        .resize(dims.width, dims.height)
        .toFile(path.join(appIconSetPath, filename));
    }

    const entry = { idiom, platform, size, filename };
    if (scale) {
      entry.scale = scale;
    }
    newImages.push(entry);
  }

  const newContents = {
    images: newImages,
    info: {
      author: "xcode",
      version: 1
    }
  };
  fs.writeFileSync(contentsJsonPath, JSON.stringify(newContents, null, 2), 'utf8');

  const usedFilenames = new Set(newImages.map(img => img.filename));
  const allFiles = fs.readdirSync(appIconSetPath);
  for (const file of allFiles) {
    if (file === 'Contents.json') continue;
    if (!usedFilenames.has(file)) {
      fs.unlinkSync(path.join(appIconSetPath, file));
    }
  }

  console.log(`Updated .appiconset => ${appIconSetPath}`);
}

function findAllAppIconSets(xcassetsPath) {
  const result = [];

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        const itemPath = path.join(dir, item.name);
        if (item.name.endsWith('.appiconset')) {
          if (has1024Icon(itemPath)) {
            result.push(itemPath);
          }
        } else {
          walk(itemPath);
        }
      }
    }
  }

  walk(xcassetsPath);
  return result;
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.log('Usage:\n');
    console.log('  # Mode 1 (single .appiconset)');
    console.log('  node appicon-resizer.js /path/to/AppIcon.appiconset\n');
    console.log('  # Mode 2 (all .appiconset inside .xcassets)');
    console.log('  node appicon-resizer.js /path/to/Assets.xcassets\n');
    process.exit(1);
  }

  const fullPath = path.resolve(inputPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`The specified path does not exist: ${fullPath}`);
    process.exit(1);
  }

  try {
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (fullPath.endsWith('.appiconset')) {
        console.log(`Mode 1: Processing a single .appiconset -> ${fullPath}`);
        await resizeAppIconSet(fullPath);
      } else if (fullPath.endsWith('.xcassets')) {
        console.log(`Mode 2: Searching for all .appiconset with 1024x1024 inside -> ${fullPath}`);
        const appIconSetPaths = findAllAppIconSets(fullPath);
        if (!appIconSetPaths.length) {
          console.log(`No .appiconset with 1024x1024 found in: ${fullPath}`);
          return;
        }
        for (const appIconSetPath of appIconSetPaths) {
          await resizeAppIconSet(appIconSetPath);
        }
      } else {
        console.error('The folder is neither .appiconset nor .xcassets. Not sure how to handle it.');
      }
    } else {
      console.error('The specified path is not a directory. Expecting either .appiconset or .xcassets.');
    }
  } catch (err) {
    console.error('Error during processing:', err);
    process.exit(1);
  }
}

main();