import './style.css';
import { decodeState, encodeState, MAX_TILES, type State } from './state.ts';
import { chatUrl, listen, onPlayerReady, parseMany, playerUrl, setAudio } from './youtube.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>('add-form');
const input = $<HTMLInputElement>('add-input');
const addBtn = $<HTMLButtonElement>('add-btn');
const clearBtn = $<HTMLButtonElement>('clear-btn');
const counter = $('counter');
const message = $('message');
const grid = $('grid');
const empty = $('empty');
const chat = $<HTMLIFrameElement>('chat');
const chatTitle = $('chat-title');

interface Tile {
  id: string;
  el: HTMLElement;
  iframe: HTMLIFrameElement;
  focusBtn: HTMLButtonElement;
}

const tiles = new Map<string, Tile>();
let focusId: string | null = null;

function say(text: string): void {
  message.textContent = text;
}

function currentState(): State {
  return { ids: [...tiles.keys()], focus: focusId };
}

function syncUrl(): void {
  const hash = encodeState(currentState());
  history.replaceState(null, '', hash || location.pathname + location.search);
}

function layout(): void {
  const n = tiles.size;
  grid.dataset.count = String(n);
  counter.textContent = `${n}/${MAX_TILES}`;
  empty.hidden = n > 0;
  addBtn.disabled = n >= MAX_TILES;
  clearBtn.disabled = n === 0;
}

function applyAudio(t: Tile): void {
  setAudio(t.iframe, t.id === focusId);
}

function createTile(id: string): Tile {
  const el = document.createElement('div');
  el.className = 'tile';

  const frame = document.createElement('div');
  frame.className = 'frame';
  const iframe = document.createElement('iframe');
  iframe.title = `Player ${id}`;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  frame.append(iframe);

  const bar = document.createElement('div');
  bar.className = 'bar';
  const label = document.createElement('span');
  label.textContent = id;
  const focusBtn = document.createElement('button');
  focusBtn.type = 'button';
  focusBtn.textContent = 'Fokus';
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'secondary';
  removeBtn.textContent = 'Hapus';
  bar.append(label, focusBtn, removeBtn);
  el.append(frame, bar);

  const tile: Tile = { id, el, iframe, focusBtn };
  // Player baru mulai muted (mute=1). `load` iframe terlalu dini untuk perintah audio:
  // daftar ke player, terapkan audio saat ia lapor siap (lihat onPlayerReady di bawah).
  iframe.addEventListener('load', () => listen(iframe));
  iframe.src = playerUrl(id, location.origin);

  focusBtn.addEventListener('click', () => setFocus(id));
  removeBtn.addEventListener('click', () => removeTile(id));
  return tile;
}

onPlayerReady((source) => {
  for (const t of tiles.values()) if (t.iframe.contentWindow === source) applyAudio(t);
});

function setFocus(id: string | null): void {
  focusId = id;
  for (const t of tiles.values()) {
    const on = t.id === id;
    t.el.classList.toggle('active', on);
    t.focusBtn.textContent = on ? 'Aktif' : 'Fokus';
    applyAudio(t);
  }
  // Hanya satu iframe chat yang hidup; ganti src saat fokus pindah.
  if (id) {
    chat.src = chatUrl(id, location.hostname);
    chatTitle.textContent = `Chat: ${id}`;
  } else {
    chat.removeAttribute('src');
    chatTitle.textContent = 'Pilih satu tile lalu klik "Fokus" untuk membuka chat.';
  }
  syncUrl();
}

function addTiles(ids: string[]): void {
  let skippedFull = 0;
  for (const id of ids) {
    if (tiles.has(id)) continue;
    if (tiles.size >= MAX_TILES) {
      skippedFull++;
      continue;
    }
    const t = createTile(id);
    tiles.set(id, t);
    grid.append(t.el);
  }
  layout();
  if (skippedFull) say(`Maksimal ${MAX_TILES} tile. ${skippedFull} video tidak ditambahkan.`);
  // Otomatis fokus ke tile pertama kalau belum ada yang aktif.
  if (!focusId && tiles.size) setFocus(tiles.keys().next().value ?? null);
  else syncUrl();
}

function removeTile(id: string): void {
  const t = tiles.get(id);
  if (!t) return;
  t.el.remove();
  tiles.delete(id);
  layout();
  if (focusId === id) setFocus(tiles.size ? (tiles.keys().next().value ?? null) : null);
  else syncUrl();
}

function clearAll(): void {
  for (const t of tiles.values()) t.el.remove();
  tiles.clear();
  layout();
  setFocus(null);
}

function loadFromHash(): void {
  const s = decodeState(location.hash);
  clearAll();
  addTiles(s.ids);
  if (s.focus) setFocus(s.focus);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  say('');
  const { ids, invalid } = parseMany(input.value);
  if (!ids.length) {
    say(invalid.length ? `Tidak dikenali: ${invalid.join(', ')}` : 'Masukkan URL atau video ID YouTube.');
    return;
  }
  addTiles(ids);
  if (invalid.length) say(`Tidak dikenali: ${invalid.join(', ')}`);
  input.value = '';
  input.focus();
});

clearBtn.addEventListener('click', () => {
  say('');
  clearAll();
});

window.addEventListener('hashchange', () => {
  // Abaikan hashchange yang kita picu sendiri lewat replaceState (tidak memicu event ini).
  loadFromHash();
});

layout();
loadFromHash();
