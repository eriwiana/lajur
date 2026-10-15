// Everything that depends on YouTube behaviour or URLs is isolated in this module.
// If YouTube changes its embed or chat, the fix belongs here.

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const PATH_ID_RE = /^\/(?:live|embed|shorts|v)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/;
const SHORT_ID_RE = /^\/([A-Za-z0-9_-]{11})(?:\/|$)/;
const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);

/** Extract the video ID from a raw ID or a YouTube URL. Returns null if invalid. */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (ID_RE.test(s)) return s;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host === 'youtu.be') {
    return url.pathname.match(SHORT_ID_RE)?.[1] ?? null;
  }
  if (!YT_HOSTS.has(host)) return null;

  const v = url.searchParams.get('v');
  if (v && ID_RE.test(v)) return v;

  const m = url.pathname.match(PATH_ID_RE);
  return m ? m[1] : null;
}

export function playerUrl(id: string, origin: string): string {
  const p = new URLSearchParams({
    enablejsapi: '1',
    autoplay: '1',
    mute: '1',
    playsinline: '1',
    origin,
  });
  return `https://www.youtube.com/embed/${id}?${p}`;
}

/** Video title via YouTube's public oEmbed. Null on failure; the caller falls back to the ID. */
export async function fetchTitle(id: string): Promise<string | null> {
  const p = new URLSearchParams({ url: `https://www.youtube.com/watch?v=${id}`, format: 'json' });
  try {
    const res = await fetch(`https://www.youtube.com/oembed?${p}`);
    if (!res.ok) return null;
    const { title } = await res.json();
    return typeof title === 'string' && title ? title : null;
  } catch {
    return null;
  }
}

export function chatUrl(id: string, hostname: string): string {
  const p = new URLSearchParams({ v: id, embed_domain: hostname, dark_theme: '1' });
  return `https://www.youtube.com/live_chat?${p}`;
}

// Player control via postMessage. This IFrame API protocol is not well documented
// for direct use, so it is kept in one place.
function send(iframe: HTMLIFrameElement, func: string, args: unknown[] = []): void {
  iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

export function setAudio(iframe: HTMLIFrameElement, on: boolean): void {
  if (on) {
    send(iframe, 'unMute');
    send(iframe, 'setVolume', [100]);
  } else {
    send(iframe, 'mute');
  }
}

// Commands sent before the player inside the iframe is ready are silently dropped
// (the iframe `load` event fires earlier than the player). Ask the player to report
// in through the 'listening' handshake; it then reports when it is ready.
export function listen(iframe: HTMLIFrameElement): void {
  iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
}

interface PlayerHandlers {
  ready: (source: MessageEventSource) => void;
  error: (source: MessageEventSource, code: number) => void;
}

// The only listener for player messages; every player event comes in through here.
export function onPlayerEvents(h: PlayerHandlers): void {
  window.addEventListener('message', (e) => {
    if (e.origin !== 'https://www.youtube.com' || !e.source || typeof e.data !== 'string') return;
    try {
      const { event, info } = JSON.parse(e.data);
      if (event === 'onReady' || event === 'initialDelivery') h.ready(e.source);
      else if (event === 'onError' && typeof info === 'number') h.error(e.source, info);
    } catch {
      /* not a JSON message */
    }
  });
}

/** IFrame API error codes: 2 invalid ID, 5 failed to load, 100 missing/private, 101/150 embedding disabled. */
export function errorMessage(code: number): string {
  if (code === 101 || code === 150) return 'The video owner disabled embedding';
  if (code === 100) return 'Video not found or private';
  if (code === 2) return 'Invalid video ID';
  return 'Player failed to load';
}
