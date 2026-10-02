// Tight linear domains with room for image markers, including single-post selections.
export function fittedAxis(values, tickCount = 5) {
  const known = values.filter(Number.isFinite);
  const low = known.length ? Math.min(...known) : 0;
  const high = known.length ? Math.max(...known) : 1;
  const padding = high > low ? (high - low) * .06 : Math.max(1, high * .06);
  const min = Math.max(0, low - padding), max = high + padding;
  const rough = (max - min) / tickCount;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const step = Math.max(1, (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power);
  const ticks = [];
  for (let value = Math.ceil(min / step) * step; value <= max; value += step) ticks.push(value);
  return {min, max, ticks, scale: value => (value - min) / (max - min)};
}
