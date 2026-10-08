import { parseVideoId } from './youtube.ts';

export const MAX_TILES = 4;

export interface State {
  ids: string[];
  focus: string | null;
}

/** State disimpan di URL hash supaya bisa di-share: #v=ID1,ID2&f=ID1 */
export function encodeState(s: State): string {
  const p = new URLSearchParams();
  if (s.ids.length) p.set('v', s.ids.join(','));
  if (s.focus) p.set('f', s.focus);
  const out = p.toString().replace(/%2C/g, ',');
  return out ? `#${out}` : '';
}

export function decodeState(hash: string): State {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const ids: string[] = [];
  for (const raw of (p.get('v') ?? '').split(',')) {
    const id = parseVideoId(raw);
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length >= MAX_TILES) break;
  }
  const f = parseVideoId(p.get('f') ?? '');
  return { ids, focus: f && ids.includes(f) ? f : null };
}
