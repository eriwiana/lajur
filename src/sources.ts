// A source is a string key "<kind>:<name>", e.g. "yt:dQw4w9WgXcQ" or "tw:somechannel". The key
// identifies a tile everywhere (tile map, URL hash). Platform URLs are built here; YouTube
// specifics stay in youtube.ts.
import { parseVideoId, chatUrl as ytChatUrl, playerUrl as ytPlayerUrl } from './youtube.ts';

export type Kind = 'yt' | 'tw' | 'kick';

export const kindOf = (key: string): Kind => key.slice(0, key.indexOf(':')) as Kind;
export const nameOf = (key: string): string => key.slice(key.indexOf(':') + 1);

type Channel = 'tw' | 'kick';
const CHANNEL_RE: Record<Channel, RegExp> = { tw: /^[a-z0-9_]{1,25}$/, kick: /^[a-z0-9_-]{1,25}$/ };
const CHANNEL_HOSTS: Record<Channel, string[]> = {
  tw: ['twitch.tv', 'www.twitch.tv', 'm.twitch.tv'],
  kick: ['kick.com', 'www.kick.com'],
};
// Single-segment site pages that look like a channel URL but are not one.
const NOT_CHANNELS = new Set([
  'videos',
  'directory',
  'downloads',
  'login',
  'search',
  'settings',
  'popout',
  'categories',
]);

const ytKey = (s: string) => {
  const id = parseVideoId(s);
  return id && `yt:${id}`;
};

function channelKey(kind: Channel, name: string): string | null {
  const n = name.toLowerCase();
  return CHANNEL_RE[kind].test(n) && !NOT_CHANNELS.has(n) ? `${kind}:${n}` : null;
}

/**
 * Parse a pasted URL, a stored key, or a bare YouTube ID into a source key; null if unrecognised.
 * Old shared links stored bare YouTube IDs, so those keep working. Bare channel names are not
 * accepted: they could belong to either Twitch or Kick.
 */
export function parseSource(input: string): string | null {
  const s = input.trim();
  const stored = s.match(/^(yt|tw|kick):(.+)$/);
  if (stored) return stored[1] === 'yt' ? ytKey(stored[2]) : channelKey(stored[1] as Channel, stored[2]);
  const yt = ytKey(s);
  if (yt) return yt;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const kind = (Object.keys(CHANNEL_HOSTS) as Channel[]).find((k) => CHANNEL_HOSTS[k].includes(host));
  const name = url.pathname.match(/^\/([^/]+)\/?$/)?.[1];
  return kind && name ? channelKey(kind, name) : null;
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

/** Player embed URL. Twitch and Kick have no audio API, so `audible` is baked into the URL. */
export function playerUrl(key: string, origin: string, hostname: string, audible: boolean): string {
  const name = nameOf(key);
  const muted = String(!audible);
  switch (kindOf(key)) {
    case 'tw':
      return `https://player.twitch.tv/?${new URLSearchParams({ channel: name, parent: hostname, muted, autoplay: 'true' })}`;
    case 'kick':
      return `https://player.kick.com/${name}?${new URLSearchParams({ autoplay: 'true', muted })}`;
    default:
      return ytPlayerUrl(name, origin);
  }
}

export function chatUrl(key: string, hostname: string): string {
  const name = nameOf(key);
  switch (kindOf(key)) {
    case 'tw':
      return `https://www.twitch.tv/embed/${name}/chat?${new URLSearchParams({ parent: hostname })}&darkpopout`;
    case 'kick':
      return `https://kick.com/popout/${name}/chat`;
    default:
      return ytChatUrl(name, hostname);
  }
}
