import { ImageManager } from './image_manager.js';
import { Renderer } from './renderer.js';
import { CharsetManager } from './charset_manager.js';
import { FontManager } from './font_manager.js';
import { createUI } from './ui.js';

const defaultParams = {
  cols: 100,
  renderMode: 'overlay',
  charset: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん　',
  charsetMode: 'auto',
  invert: false,
  gamma: 1.0,
  alphaThreshold: 10,
  imageAlpha: 255,
  textAlpha: 255,
  backgroundColor: '#222222',
  letterSpacing: 1.0,
  jitter: 0.0,
  fontScale: 1.4,
  densitySampleSize: 64,
  densityThreshold: 180,
  fontFamily: 'Nico Moji',
};

const params = { ...defaultParams };

const dom = {
  canvasWrap: document.getElementById('canvas-wrap'),
  emptyState: document.getElementById('empty-state'),
  status: document.getElementById('status'),
  sampleSelect: document.getElementById('sampleSelect'),
  refreshSamples: document.getElementById('refreshSamples'),
  fileInput: document.getElementById('fileInput'),
  dropZone: document.getElementById('dropZone'),
};

const CHARSET_WARNING =
  'charsetは日本語（ひらがな/カタカナ/漢字）と空白のみ許可です。';

function setStatus(message, kind = 'info') {
  dom.status.textContent = message || '';
  dom.status.classList.remove('is-success', 'is-error');
  if (kind === 'success') {
    dom.status.classList.add('is-success');
  }
  if (kind === 'error') {
    dom.status.classList.add('is-error');
  }
}

function setEmptyVisible(isVisible) {
  dom.emptyState.classList.toggle('is-visible', isVisible);
}

function sanitizeCharset(input) {
  if (!input) {
    return { value: '', removed: false };
  }
  const allowed = /[^\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\u3000-\u303F\\s]/g;
  const cleaned = input.replace(allowed, '');
  return { value: cleaned, removed: cleaned !== input };
}

async function fetchSampleManifest() {
  try {
    const response = await fetch('assets/samples/manifest.json', {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Manifest not found');
    }
    const data = await response.json();
    return Array.isArray(data.samples) ? data.samples : [];
  } catch (error) {
    console.warn('Failed to load manifest', error);
    return [];
  }
}

async function ensureTweakpane() {
  if (window.Tweakpane) {
    return window.Tweakpane;
  }

  const sources = [
    'https://cdn.jsdelivr.net/npm/tweakpane@4.0.3/dist/tweakpane.min.js',
    'https://unpkg.com/tweakpane@4.0.3/dist/tweakpane.min.js',
  ];

  for (const src of sources) {
    try {
      const mod = await import(src);
      if (mod) {
        return mod;
      }
    } catch (error) {
      console.warn(error);
    }
  }

  return window.Tweakpane || null;
}

const sketch = (p) => {
  let imageManager;
  let renderer;
  let charsetManager;
  let fontManager;
  let canvasRenderer;
  let pendingRedraw = false;
  let currentSamples = [];

  const requestRedraw = () => {
    if (pendingRedraw) {
      return;
    }
    pendingRedraw = true;
    requestAnimationFrame(() => {
      pendingRedraw = false;
      p.redraw();
    });
  };

  const updateLayout = () => {
    const margin = 56;
    const maxW = Math.max(240, p.windowWidth - margin * 2);
    const maxH = Math.max(240, p.windowHeight - margin * 2);
    imageManager.updateViewport(maxW, maxH);

    const { width, height } = imageManager.getDisplaySize();
    if (width && height) {
      p.resizeCanvas(width, height);
    } else {
      p.resizeCanvas(Math.min(960, maxW), Math.min(640, maxH));
    }
  };

  const updateSamplesUI = (samples) => {
    currentSamples = samples;
    dom.sampleSelect.innerHTML = '';

    if (!samples.length) {
      const option = document.createElement('option');
      option.textContent = 'No samples found';
      dom.sampleSelect.append(option);
      dom.sampleSelect.disabled = true;
      setStatus('assets/samples/manifest.json を更新してください。', 'info');
      return;
    }

    dom.sampleSelect.disabled = false;
    samples.forEach((sample) => {
      const option = document.createElement('option');
      option.value = sample.file;
      option.textContent = sample.label || sample.file;
      dom.sampleSelect.append(option);
    });
    dom.sampleSelect.selectedIndex = 0;
    const selected = samples[0];
    imageManager.loadSample(selected.file, selected.label || selected.file);
  };

  const reloadManifest = async () => {
    const samples = await fetchSampleManifest();
    updateSamplesUI(samples);
  };

  const saveCurrent = () => {
    if (!imageManager?.image) {
      setStatus('画像が読み込まれていません。', 'error');
      return;
    }
    const base = imageManager.sourceBase || 'image';
    const unixTime = Math.floor(Date.now() / 1000);
    const filename = `${base}-Hiramosa-${unixTime}`;
    p.saveCanvas(canvasRenderer.elt, filename, 'png');
    setStatus(`Saved: ${filename}.png`, 'success');
  };

  const canHandleShortcut = () => {
    const el = document.activeElement;
    if (!el) return true;
    const tag = el.tagName?.toLowerCase();
    return tag !== 'input' && tag !== 'textarea' && !el.isContentEditable;
  };

  p.setup = async () => {
    canvasRenderer = p.createCanvas(800, 600);
    canvasRenderer.parent(dom.canvasWrap);
    p.noLoop();

    renderer = new Renderer(p);
    charsetManager = new CharsetManager(p);
    fontManager = new FontManager(p);
    fontManager.applyFont(params.fontFamily);

    imageManager = new ImageManager(p, {
      onChange: () => {
        updateLayout();
        requestRedraw();
      },
      onStatus: setStatus,
    });

    const tweakpaneRef = await ensureTweakpane();
    if (!tweakpaneRef) {
      setStatus('Tweakpane の読み込みに失敗しました。ネットワークを確認してください。', 'error');
    }

    const pane = createUI(params, {
      onParamsChange: (event) => {
        const key = event?.presetKey ?? event?.target?.key;
        if (key === 'charset') {
          const result = sanitizeCharset(params.charset);
          if (result.removed) {
            params.charset = result.value;
            pane?.refresh();
            setStatus(CHARSET_WARNING, 'error');
          } else if (dom.status.textContent === CHARSET_WARNING) {
            setStatus('', 'info');
          }
        }
        if (['charset', 'charsetMode', 'densitySampleSize', 'densityThreshold'].includes(key)) {
          charsetManager.invalidate();
        }
        if (key === 'fontFamily') {
          setStatus('Font selected. Click "Load Font" to apply.', 'info');
        }
        requestRedraw();
      },
      onLoadFont: async () => {
        setStatus(`Loading font: ${params.fontFamily}`, 'info');
        const ok = await fontManager.loadFont(params.fontFamily);
        if (ok) {
          charsetManager.invalidate();
          setStatus(`Font applied: ${params.fontFamily}`, 'success');
          requestRedraw();
        } else {
          setStatus(`Failed to load font: ${params.fontFamily}`, 'error');
        }
      },
      onReset: () => {
        Object.keys(defaultParams).forEach((key) => {
          params[key] = defaultParams[key];
        });
        charsetManager.invalidate();
        fontManager.applyFont(params.fontFamily);
        pane?.refresh();
        setStatus('Parameters reset to defaults.', 'success');
        requestRedraw();
      },
      onSave: () => {
        saveCurrent();
      },
    }, tweakpaneRef);

    dom.sampleSelect.addEventListener('change', () => {
      const selected = currentSamples.find(
        (item) => item.file === dom.sampleSelect.value,
      );
      if (selected) {
        imageManager.loadSample(selected.file, selected.label || selected.file);
      }
    });

    dom.refreshSamples.addEventListener('click', () => {
      reloadManifest();
    });

    dom.fileInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) {
        imageManager.loadLocalFile(file);
      }
    });

    if (dom.dropZone) {
      const setDrag = (active) => {
        dom.dropZone.classList.toggle('is-dragover', active);
      };

      dom.dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        setDrag(true);
      });

      dom.dropZone.addEventListener('dragleave', () => setDrag(false));
      dom.dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        setDrag(false);
        const file = event.dataTransfer?.files?.[0];
        if (file) {
          imageManager.loadLocalFile(file);
        }
      });

      dom.dropZone.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          dom.fileInput?.click();
        }
      });
    }

    const toggleButton = document.getElementById('togglePanel');
    if (toggleButton) {
      const ui = document.getElementById('ui');
      const updateToggle = (isCollapsed) => {
        toggleButton.textContent = isCollapsed ? 'Show Panel' : 'Hide Panel';
      };

      ui.classList.add('is-collapsed');
      updateToggle(true);

      toggleButton.addEventListener('click', () => {
        const isCollapsed = ui.classList.toggle('is-collapsed');
        updateToggle(isCollapsed);
      });
    }

    document.addEventListener('keydown', (event) => {
      if (!canHandleShortcut()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'p') {
        event.preventDefault();
        const ui = document.getElementById('ui');
        const isCollapsed = ui.classList.toggle('is-collapsed');
        const toggleButton = document.getElementById('togglePanel');
        if (toggleButton) {
          toggleButton.textContent = isCollapsed ? 'Show Panel' : 'Hide Panel';
        }
      }
      if (key === 's') {
        event.preventDefault();
        saveCurrent();
      }
    });

    updateLayout();
    reloadManifest();
    setEmptyVisible(true);
  };

  p.draw = () => {
    const activeFont = fontManager.currentFont || params.fontFamily;
    const activeCharset = charsetManager.getActiveCharset(params, activeFont);

    const state = {
      image: imageManager.image,
      displayW: p.width,
      displayH: p.height,
      activeCharset,
      fontFamily: activeFont,
    };

    renderer.render(params, state);
    setEmptyVisible(!imageManager.image);
  };

  p.windowResized = () => {
    updateLayout();
    requestRedraw();
  };
};

new p5(sketch);
