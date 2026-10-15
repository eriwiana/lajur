import './style.css';
import { chatUrl, kindOf, nameOf, parseMany, playerUrl } from './sources.ts';
import { decodeState, encodeState, MAX_TILES, type State } from './state.ts';
import { errorMessage, fetchTitle, listen, onPlayerEvents, setAudio } from './youtube.ts';

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
const chatLink = $<HTMLAnchorElement>('chat-link');

interface Tile {
  key: string;
  el: HTMLElement;
  iframe: HTMLIFrameElement;
  label: HTMLElement;
  name: string;
  error?: string;
  audible: boolean;
  focusBtn: HTMLButtonElement;
}

const tiles = new Map<string, Tile>();
let focusId: string | null = null;

function say(text: string): void {
  message.textContent = text;
}

function currentState(): State {
  return { keys: [...tiles.keys()], focus: focusId };
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
  const on = t.key === focusId;
  if (kindOf(t.key) === 'yt') {
    setAudio(t.iframe, on);
    return;
  }
  // ponytail: Twitch and Kick have no audio API, so a change reloads the player with the new
  // muted flag. Add the Twitch embed SDK if the reload flash matters.
  if (t.audible === on) return;
  t.audible = on;
  t.iframe.src = playerUrl(t.key, location.origin, location.hostname, on);
}

function renderLabel(t: Tile): void {
  const text = t.error ? `${t.name} · ${t.error}` : t.name;
  t.label.textContent = text;
  t.label.title = text;
}

function createTile(key: string): Tile {
  const id = nameOf(key);
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
  focusBtn.textContent = 'Focus';
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'secondary';
  removeBtn.textContent = 'Remove';
  bar.append(label, focusBtn, removeBtn);
  el.append(frame, bar);

  const tile: Tile = { key, el, iframe, label, name: id, focusBtn, audible: key === focusId };
  if (kindOf(key) === 'yt') {
    fetchTitle(id).then((title) => {
      if (!title) return;
      tile.name = title;
      renderLabel(tile);
    });
    // A new player starts muted (mute=1). The iframe `load` event is too early for audio commands:
    // register with the player and apply audio when it reports ready (see onPlayerEvents below).
    iframe.addEventListener('load', () => listen(iframe));
  }
  iframe.src = playerUrl(key, location.origin, location.hostname, tile.audible);

  focusBtn.addEventListener('click', () => setFocus(key));
  removeBtn.addEventListener('click', () => removeTile(key));
  return tile;
}

const tileOf = (source: MessageEventSource) =>
  [...tiles.values()].find((t) => t.iframe.contentWindow === source);

onPlayerEvents({
  ready: (source) => {
    const t = tileOf(source);
    if (t) applyAudio(t);
  },
  error: (source, code) => {
    const t = tileOf(source);
    if (!t) return;
    t.el.classList.add('error');
    t.error = errorMessage(code);
    renderLabel(t);
  },
});

function setFocus(id: string | null): void {
  focusId = id;
  for (const t of tiles.values()) {
    const on = t.key === id;
    t.el.classList.toggle('active', on);
    t.focusBtn.textContent = on ? 'Active' : 'Focus';
    applyAudio(t);
  }
  // Only one chat iframe is alive; swap its src when focus moves.
  if (id) {
    chat.src = chatUrl(id, location.hostname);
    chatTitle.textContent = `Chat: ${nameOf(id)}`;
    // Kick has no documented chat embed; its popout may refuse framing, so always offer a link.
    chatLink.hidden = kindOf(id) !== 'kick';
    chatLink.href = chat.src;
  } else {
    chat.removeAttribute('src');
    chatLink.hidden = true;
    chatTitle.textContent = 'Pick a tile and click "Focus" to open its chat.';
  }
  syncUrl();
}

function addTiles(keys: string[]): void {
  let skippedFull = 0;
  // Focus the first tile up front so a Twitch/Kick player is created with sound, not reloaded.
  const autoFocus = !focusId && keys.length ? keys[0] : null;
  if (autoFocus) focusId = autoFocus;
  for (const key of keys) {
    if (tiles.has(key)) continue;
    if (tiles.size >= MAX_TILES) {
      skippedFull++;
      continue;
    }
    const t = createTile(key);
    tiles.set(key, t);
    grid.append(t.el);
  }
  layout();
  if (skippedFull) say(`At most ${MAX_TILES} tiles. ${skippedFull} stream(s) not added.`);
  if (autoFocus) setFocus(autoFocus);
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
  // Set first so addTiles does not auto-focus the first tile (the chat would load twice).
  focusId = s.focus;
  addTiles(s.keys);
  if (s.focus) setFocus(s.focus);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  say('');
  const { keys, invalid } = parseMany(input.value);
  if (!keys.length) {
    say(invalid.length ? `Not recognised: ${invalid.join(', ')}` : 'Enter a YouTube, Twitch or Kick URL.');
    return;
  }
  addTiles(keys);
  if (invalid.length) say(`Not recognised: ${invalid.join(', ')}`);
  input.value = '';
  input.focus();
});

clearBtn.addEventListener('click', () => {
  say('');
  clearAll();
});

window.addEventListener('hashchange', loadFromHash);

layout();
loadFromHash();
