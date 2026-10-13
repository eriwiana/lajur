import { parseMany, parseVideoId } from './youtube.ts';

export const MAX_TILES = 4;

export const LAYOUTS = ['grid', 'focus', 'row', 'col'] as const;
export type Layout = (typeof LAYOUTS)[number];
export const DEFAULT_LAYOUT: Layout = 'grid';

export interface State {
  ids: string[];
  focus: string | null;
  layout: Layout;
}

/** State disimpan di URL hash supaya bisa di-share: #v=ID1,ID2&f=ID1&l=focus */
export function encodeState(s: State): string {
  const p = new URLSearchParams();
  if (s.ids.length) p.set('v', s.ids.join(','));
  if (s.focus) p.set('f', s.focus);
  if (s.layout !== DEFAULT_LAYOUT) p.set('l', s.layout);
  const out = p.toString().replace(/%2C/g, ',');
  return out ? `#${out}` : '';
}

export function decodeState(hash: string): State {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const ids = parseMany(p.get('v') ?? '').ids.slice(0, MAX_TILES);
  const f = parseVideoId(p.get('f') ?? '');
  const l = LAYOUTS.find((x) => x === p.get('l')) ?? DEFAULT_LAYOUT;
  return { ids, focus: f && ids.includes(f) ? f : null, layout: l };
}
