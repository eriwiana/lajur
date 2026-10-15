import { parseMany, parseSource } from './sources.ts';

export const MAX_TILES = 4;

export interface State {
  keys: string[];
  focus: string | null;
}

/** State is kept in the URL hash so it can be shared: #v=yt:ID1,yt:ID2&f=yt:ID1 */
export function encodeState(s: State): string {
  const p = new URLSearchParams();
  if (s.keys.length) p.set('v', s.keys.join(','));
  if (s.focus) p.set('f', s.focus);
  const out = p.toString().replace(/%2C/g, ',').replace(/%3A/g, ':');
  return out ? `#${out}` : '';
}

export function decodeState(hash: string): State {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const keys = parseMany(p.get('v') ?? '').keys.slice(0, MAX_TILES);
  const f = parseSource(p.get('f') ?? '');
  return { keys, focus: f && keys.includes(f) ? f : null };
}
