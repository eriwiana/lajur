// Semua yang bergantung pada perilaku/URL YouTube diisolasi di modul ini.
// Kalau YouTube mengubah embed atau chat, perbaikan cukup di sini.

const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const PATH_ID_RE = /^\/(?:live|embed|shorts|v)\/([A-Za-z0-9_-]{11})(?:[/?#]|$)/;
const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);

/** Ambil video ID dari ID mentah atau URL YouTube. Mengembalikan null kalau tidak valid. */
export function parseVideoId(input: string): string | null {
  const s = (input ?? '').trim();
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
    const id = url.pathname.slice(1, 12);
    return ID_RE.test(id) ? id : null;
  }
  if (!YT_HOSTS.has(host)) return null;

  const v = url.searchParams.get('v');
  if (v && ID_RE.test(v)) return v;

  const m = url.pathname.match(PATH_ID_RE);
  return m ? m[1] : null;
}

/** Pisahkan beberapa input (spasi, koma, baris baru) lalu parse masing-masing. */
export function parseMany(input: string): { ids: string[]; invalid: string[] } {
  const ids: string[] = [];
  const invalid: string[] = [];
  for (const part of input.split(/[\s,]+/).filter(Boolean)) {
    const id = parseVideoId(part);
    if (id) {
      if (!ids.includes(id)) ids.push(id);
    } else {
      invalid.push(part);
    }
  }
  return { ids, invalid };
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

export function chatUrl(id: string, hostname: string): string {
  const p = new URLSearchParams({ v: id, embed_domain: hostname, dark_theme: '1' });
  return `https://www.youtube.com/live_chat?${p}`;
}

// Kontrol player lewat postMessage. Ini protokol IFrame API yang tidak
// terdokumentasi rapi untuk pemakaian langsung, jadi dijaga di satu tempat.
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

// Perintah yang dikirim sebelum player di dalam iframe siap akan dibuang diam-diam
// (event `load` iframe terjadi lebih awal dari player). Minta player melapor lewat
// handshake 'listening', lalu panggil cb saat ia melaporkan siap.
export function listen(iframe: HTMLIFrameElement): void {
  iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
}

export function onPlayerReady(cb: (source: MessageEventSource) => void): void {
  window.addEventListener('message', (e) => {
    if (e.origin !== 'https://www.youtube.com' || !e.source || typeof e.data !== 'string') return;
    try {
      const { event } = JSON.parse(e.data);
      if (event === 'onReady' || event === 'initialDelivery') cb(e.source);
    } catch {
      /* bukan pesan JSON */
    }
  });
}
