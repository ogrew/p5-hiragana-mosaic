import { clamp } from './utils.js';

export class Renderer {
  constructor(p) {
    this.p = p;
    this.seed = 13579;
  }

  render(params, state) {
    const p = this.p;
    const img = state.image;
    const width = state.displayW;
    const height = state.displayH;

    if (!width || !height) {
      return;
    }

    p.push();
    if (params.renderMode === 'textOnly') {
      p.background(params.backgroundColor);
    } else {
      p.clear();
    }

    if (img && params.renderMode === 'overlay') {
      p.push();
      p.tint(255, params.imageAlpha);
      p.image(img, 0, 0, width, height);
      p.pop();
    }

    if (!img) {
      p.pop();
      return;
    }

    const charset = state.activeCharset || '';
    if (!charset.length) {
      p.pop();
      return;
    }

    const cols = Math.max(1, Math.floor(params.cols));
    const cellW = width / cols;
    const cellH = cellW;
    const rows = Math.ceil(height / cellH);

    const imgSmall = img.get();
    imgSmall.resize(cols, rows);
    imgSmall.loadPixels();

    const stepX = cellW * params.letterSpacing;
    const stepY = cellH * params.letterSpacing;
    const gridW = cols * stepX;
    const gridH = rows * stepY;
    const originX = (width - gridW) / 2;
    const originY = (height - gridH) / 2;

    const jitterPx = params.jitter * cellW * 0.5;

    p.textAlign(p.CENTER, p.CENTER);
    p.textFont(state.fontFamily);
    p.textSize(cellW * params.fontScale);
    p.noStroke();

    const ctx = p.drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    p.randomSeed(this.seed);
    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < cols; cx += 1) {
        const idx = (cy * cols + cx) * 4;
        const r = imgSmall.pixels[idx];
        const g = imgSmall.pixels[idx + 1];
        const b = imgSmall.pixels[idx + 2];
        const a = imgSmall.pixels[idx + 3];

        if (a < params.alphaThreshold) {
          continue;
        }

        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        let t = clamp(luma / 255, 0, 1);
        t = Math.pow(t, params.gamma);
        if (params.invert) {
          t = 1 - t;
        }

        const charIndex = clamp(
          Math.floor(t * (charset.length - 1)),
          0,
          charset.length - 1,
        );
        const ch = charset.charAt(charIndex);

        const jitterX = jitterPx ? p.random(-jitterPx, jitterPx) : 0;
        const jitterY = jitterPx ? p.random(-jitterPx, jitterPx) : 0;
        const x = originX + (cx + 0.5) * stepX + jitterX;
        const y = originY + (cy + 0.5) * stepY + jitterY;

        p.fill(r, g, b, params.textAlpha);
        p.text(ch, x, y);
      }
    }

    ctx.restore();
    p.pop();
  }
}
