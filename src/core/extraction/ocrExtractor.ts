import Tesseract from 'tesseract.js';
import type { DataValue, RegionCoordinates } from '../../types';

let worker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!worker) {
    worker = await Tesseract.createWorker('eng');
  }
  return worker;
}

export async function terminateWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

interface ExtractionResult {
  text: string;
  confidence: number;
  dataValue: DataValue;
}

function parseExtractedText(text: string): DataValue {
  const trimmed = text.trim();

  // Try to parse as number
  const numberValue = parseFloat(trimmed.replace(/[,$]/g, ''));
  if (!isNaN(numberValue) && trimmed.match(/^[$]?[\d,]+\.?\d*$/)) {
    return {
      type: 'number',
      value: numberValue,
    };
  }

  // Try to parse as date
  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    /^\d{4}-\d{2}-\d{2}$/,
    /^[A-Za-z]+ \d{1,2}, \d{4}$/,
  ];
  for (const pattern of datePatterns) {
    if (pattern.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return {
          type: 'date',
          value: date,
        };
      }
    }
  }

  // Default to string
  return {
    type: 'string',
    value: trimmed,
  };
}

export async function extractTextFromRegion(
  imageSource: HTMLImageElement | HTMLCanvasElement | string,
  region: RegionCoordinates
): Promise<ExtractionResult> {
  const tesseractWorker = await getWorker();

  // Create a canvas to crop the region
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Load image if string URL provided
  let img: HTMLImageElement | HTMLCanvasElement;
  if (typeof imageSource === 'string') {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image for OCR'));
      image.src = imageSource;
    });
  } else {
    img = imageSource;
  }

  // Set canvas size to region size
  canvas.width = region.width;
  canvas.height = region.height;

  // Draw cropped region to canvas
  ctx.drawImage(
    img,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height
  );

  // Run OCR on the cropped region
  const result = await tesseractWorker.recognize(canvas);
  const text = result.data.text;
  const confidence = result.data.confidence;

  const dataValue = parseExtractedText(text);

  return {
    text,
    confidence,
    dataValue: {
      ...dataValue,
      source: undefined, // Source will be added by the caller
    },
  };
}

export async function extractTextFromPdfPage(
  pdfCanvas: HTMLCanvasElement,
  region: RegionCoordinates
): Promise<ExtractionResult> {
  return extractTextFromRegion(pdfCanvas, region);
}
