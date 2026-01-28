export class FontManager {
  constructor(p) {
    this.p = p;
    this.currentFont = '';
  }

  applyFont(fontFamily) {
    if (!fontFamily) {
      return;
    }
    this.currentFont = fontFamily;
    this.p.textFont(fontFamily);
  }

  async loadFont(fontFamily) {
    if (!fontFamily) {
      return false;
    }
    try {
      await document.fonts.load(`16px "${fontFamily}"`);
      this.applyFont(fontFamily);
      return true;
    } catch (error) {
      console.warn('Font load failed:', fontFamily, error);
      return false;
    }
  }
}
