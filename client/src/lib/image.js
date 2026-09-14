const MAX_DATA_URL_LENGTH = 650 * 1024;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This file is not a valid image'));
    image.src = src;
  });

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });

// Downscales logos/signatures in the browser so they stay small enough to store
// with the business profile and print crisply on A4.
export const imageFileToDataUrl = async (file, maxSize = 480) => {
  if (!file || !file.type.startsWith('image/')) throw new Error('Please choose a PNG, JPG or WEBP image');
  const image = await loadImage(await readFile(file));

  let size = maxSize;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const scale = Math.min(1, size / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/webp', 0.92);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl;
    size = Math.round(size * 0.7);
  }
  throw new Error('Image is too large. Please use a smaller image.');
};
