import { fitRect } from './utils.js';

export class ImageManager {
  constructor(p, callbacks = {}) {
    this.p = p;
    this.onChange = callbacks.onChange;
    this.onStatus = callbacks.onStatus;
    this.image = null;
    this.displayW = 0;
    this.displayH = 0;
    this.maxW = 0;
    this.maxH = 0;
    this.sourceBase = '';
  }

  updateViewport(maxW, maxH) {
    this.maxW = maxW;
    this.maxH = maxH;
    if (this.image) {
      this.computeDisplaySize();
    }
  }

  computeDisplaySize() {
    const { width, height } = fitRect(
      this.image.width,
      this.image.height,
      this.maxW,
      this.maxH,
    );
    this.displayW = width;
    this.displayH = height;
  }

  getDisplaySize() {
    return { width: this.displayW, height: this.displayH };
  }

  loadSample(url, label = url) {
    if (!url) {
      return;
    }
    this.loadImage(url, label, false);
  }

  loadLocalFile(file) {
    if (!file) {
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    this.loadImage(objectUrl, file.name, true);
  }

  loadImage(url, label, revoke) {
    this.onStatus?.(`Loading: ${label}`, 'info');
    this.p.loadImage(
      url,
      (img) => {
        if (revoke) {
          URL.revokeObjectURL(url);
        }
        this.image = img;
        this.sourceBase = this.extractBaseName(label || url);
        this.computeDisplaySize();
        this.onStatus?.(`Loaded: ${label}`, 'success');
        this.onChange?.();
      },
      () => {
        if (revoke) {
          URL.revokeObjectURL(url);
        }
        this.image = null;
        this.sourceBase = '';
        this.onStatus?.(`Failed to load: ${label}`, 'error');
        this.onChange?.();
      },
    );
  }

  extractBaseName(label) {
    if (!label) {
      return 'image';
    }
    const parts = label.split('/').pop() || label;
    const dotIndex = parts.lastIndexOf('.');
    if (dotIndex > 0) {
      return parts.slice(0, dotIndex);
    }
    return parts;
  }
}
