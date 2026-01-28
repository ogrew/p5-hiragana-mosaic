import { DensityAnalyzer } from './density.js';

export class CharsetManager {
  constructor(p) {
    this.analyzer = new DensityAnalyzer(p);
    this.cachedKey = '';
    this.cachedCharset = '';
  }

  getActiveCharset(params, fontFamily) {
    const charset = params.charset || '';
    if (!charset.length) {
      return '';
    }

    if (params.charsetMode === 'manual') {
      return charset;
    }

    const key = `${fontFamily}|${charset}|${params.densitySampleSize}|${params.densityThreshold}`;
    if (key !== this.cachedKey) {
      this.cachedCharset = this.analyzer.getSortedCharset(charset, {
        fontFamily,
        sampleSize: params.densitySampleSize,
        threshold: params.densityThreshold,
      });
      this.cachedKey = key;
    }

    return this.cachedCharset;
  }

  invalidate() {
    this.cachedKey = '';
  }

  clearAll() {
    this.cachedKey = '';
    this.cachedCharset = '';
    this.analyzer.clearCache();
  }
}
