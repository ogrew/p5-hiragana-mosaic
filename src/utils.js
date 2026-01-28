export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function fitRect(srcW, srcH, maxW, maxH) {
  if (!srcW || !srcH || !maxW || !maxH) {
    return { width: 0, height: 0 };
  }
  const ratio = Math.min(maxW / srcW, maxH / srcH);
  return {
    width: Math.round(srcW * ratio),
    height: Math.round(srcH * ratio),
  };
}

export function safeNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
