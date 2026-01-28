export class DensityAnalyzer {
  constructor(p) {
    this.p = p;
    this.cache = new Map();
  }

  getSortedCharset(charset, options) {
    if (!charset) {
      return '';
    }
    const fontFamily = options.fontFamily;
    const rawSample =
      options.sampleSize ?? options.densitySampleSize ?? options.sample_size;
    const rawThreshold =
      options.threshold ?? options.densityThreshold ?? options.density_threshold;
    const sampleSize = Math.max(1, Math.floor(Number(rawSample || 64)));
    const threshold = Number.isFinite(Number(rawThreshold))
      ? Number(rawThreshold)
      : 180;
    const key = `${fontFamily}|${charset}|${sampleSize}|${threshold}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const chars = Array.from(charset);
    const densities = chars.map((char) => ({
      char,
      density: this.measureChar(char, fontFamily, sampleSize, threshold),
    }));

    densities.sort((a, b) => b.density - a.density);
    const sorted = densities.map((item) => item.char).join('');
    this.cache.set(key, sorted);
    return sorted;
  }

  measureChar(char, fontFamily, sampleSize, threshold) {
    const g = this.p.createGraphics(sampleSize, sampleSize);
    g.pixelDensity(1);
    g.background(255);
    g.fill(0);
    g.noStroke();
    g.textAlign(this.p.CENTER, this.p.CENTER);
    g.textFont(fontFamily);
    g.textSize(sampleSize * 0.8);
    g.text(char, sampleSize / 2, sampleSize / 2 + sampleSize * 0.06);
    g.loadPixels();

    let count = 0;
    const pixels = g.pixels;
    for (let i = 0; i < pixels.length; i += 4) {
      const brightness = pixels[i];
      if (brightness < threshold) {
        count += 1;
      }
    }

    g.remove();
    return count / (sampleSize * sampleSize);
  }

  clearCache() {
    this.cache.clear();
  }
}
