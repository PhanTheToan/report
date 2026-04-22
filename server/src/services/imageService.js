import fs from 'node:fs/promises';
import sharp from 'sharp';

const MAX_IMAGE_WIDTH = Number(process.env.UPLOAD_IMAGE_MAX_WIDTH) || 1600;
const MAX_IMAGE_HEIGHT = Number(process.env.UPLOAD_IMAGE_MAX_HEIGHT) || 1600;
const TRANSFORMABLE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function buildPipeline(filePath, mimeType) {
  let pipeline = sharp(filePath, { failOn: 'none' }).rotate().resize({
    width: MAX_IMAGE_WIDTH,
    height: MAX_IMAGE_HEIGHT,
    fit: 'inside',
    withoutEnlargement: true
  });

  if (mimeType === 'image/png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (mimeType === 'image/webp') {
    pipeline = pipeline.webp({ quality: 85 });
  } else {
    pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
  }

  return pipeline;
}

export async function normalizeUploadedImage(filePath, mimeType) {
  if (!TRANSFORMABLE_MIME_TYPES.has(mimeType)) {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      resized: false
    };
  }

  const metadata = await sharp(filePath, { failOn: 'none' }).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const shouldResize = width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT;

  const { data } = await buildPipeline(filePath, mimeType).toBuffer({ resolveWithObject: true });
  await fs.writeFile(filePath, data);

  return {
    size: data.length,
    resized: shouldResize
  };
}
