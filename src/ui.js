const FONT_OPTIONS = {
  'Nico Moji': 'Nico Moji',
  'M PLUS 1p': 'M PLUS 1p',
  'Sawarabi Mincho': 'Sawarabi Mincho',
  'Dela Gothic One': 'Dela Gothic One',
  DotGothic16: 'DotGothic16',
  'Cherry Bomb One': 'Cherry Bomb One',
  'Aoboshi One': 'Aoboshi One',
  'Kiwi Maru': 'Kiwi Maru',
  'Potta One': 'Potta One',
};

export function createUI(params, handlers, tweakpaneRef = null) {
  const TweakpaneRef = tweakpaneRef || window.Tweakpane;
  if (!TweakpaneRef) {
    return null;
  }

  const pane = new TweakpaneRef.Pane({
    container: document.getElementById('pane'),
  });

  const grid = pane.addFolder({ title: 'Grid', expanded: false });
  grid.addBinding(params, 'cols', { min: 20, max: 150, step: 1 });
  grid.addBinding(params, 'renderMode', {
    options: { Overlay: 'overlay', 'Text Only': 'textOnly' },
  });
  grid.addBinding(params, 'letterSpacing', { min: 0.5, max: 2.0, step: 0.1 });
  grid.addBinding(params, 'jitter', { min: 0, max: 2.0, step: 0.01 });

  const noise = pane.addFolder({ title: 'Noise', expanded: false });
  noise.addBinding(params, 'noiseSeed', {
    label: 'Seed',
    min: 0,
    max: 1_000_000,
    step: 1,
  });
  noise.addBinding(params, 'noiseFrequencyX', {
    label: 'FrequencyX',
    min: 0.005,
    max: 0.209,
    step: 0.005,
  });
  noise.addBinding(params, 'noiseFrequencyY', {
    label: 'FrequencyY',
    min: 0.005,
    max: 0.200,
    step: 0.005,
  });
  noise.addBinding(params, 'noiseThreshold', {
    label: 'Threshold',
    min: 0.0,
    max: 1.0,
    step: 0.05,
  });

  const font = pane.addFolder({ title: 'Font', expanded: false });
  font.addBinding(params, 'fontFamily', { options: FONT_OPTIONS });
  font.addBinding(params, 'fontScale', { label: 'FontSize', min: 0.5, max: 2.5, step: 0.1 });
  const loadButton = font.addButton({ title: 'Load Font' });
  loadButton.on('click', () => handlers.onLoadFont?.());

  const charset = pane.addFolder({ title: 'Charset', expanded: false });
  charset.addBinding(params, 'charset');
  charset.addBinding(params, 'charsetMode', {
    options: { Auto: 'auto', Manual: 'manual' },
  });

  const density = charset.addFolder({ title: 'Density', expanded: false });
  density.addBinding(params, 'densitySampleSize', {
    label: 'sampleSize',
    min: 32,
    max: 128,
    step: 1,
  });
  density.addBinding(params, 'densityThreshold', {
    label: 'threshold',
    min: 0,
    max: 255,
    step: 1,
  });

  const tone = pane.addFolder({ title: 'Tone', expanded: false });
  tone.addBinding(params, 'gamma', { min: 0.3, max: 3.0, step: 0.01 });
  tone.addBinding(params, 'invert');
  tone.addBinding(params, 'alphaThreshold', { min: 0, max: 255, step: 1 });

  const alpha = pane.addFolder({ title: 'Alpha', expanded: false });
  alpha.addBinding(params, 'imageAlpha', { min: 0, max: 255, step: 1 });
  alpha.addBinding(params, 'textAlpha', { min: 0, max: 255, step: 1 });
  alpha.addBinding(params, 'backgroundColor', { view: 'color' });

  const resetButton = pane.addButton({ title: 'RESET PARAMS' });
  resetButton.on('click', () => handlers.onReset?.());

  const saveButton = pane.addButton({ title: 'SAVE PNG' });
  saveButton.on('click', () => handlers.onSave?.());

  pane.on('change', (event) => handlers.onParamsChange?.(event));
  return pane;
}
