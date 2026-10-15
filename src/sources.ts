// A source is a string key "<kind>:<name>", e.g. "yt:dQw4w9WgXcQ". The key identifies a tile
// everywhere (tile map, URL hash). Platform modules only ever see the name part.
import { parseVideoId } from './youtube.ts';

export const nameOf = (key: string): string => key.slice(key.indexOf(':') + 1);

/**
 * Parse a pasted URL, a bare ID, or a stored key into a source key; null if unrecognised.
 * Old shared links stored bare YouTube IDs, so those keep working.
 */
export function parseSource(input: string): string | null {
  const id = parseVideoId(input.replace(/^yt:/, ''));
  return id && `yt:${id}`;
}

/** Split several inputs (spaces, commas, newlines) and parse each one. */
export function parseMany(input: string): { keys: string[]; invalid: string[] } {
  const keys: string[] = [];
  const invalid: string[] = [];
  for (const part of input.split(/[\s,]+/).filter(Boolean)) {
    const key = parseSource(part);
    if (key) {
      if (!keys.includes(key)) keys.push(key);
    } else {
      invalid.push(part);
    }
  }
  return { keys, invalid };
}
