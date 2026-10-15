import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMany } from '../src/sources.ts';
import { decodeState, encodeState, MAX_TILES } from '../src/state.ts';
import { chatUrl, errorMessage, fetchTitle, parseVideoId, playerUrl } from '../src/youtube.ts';

const ID = 'dQw4w9WgXcQ';
const ID2 = 'jNQXAC9IVRw';
const ID3 = 'aqz-KE-bpKQ';
const ID4 = '9bZkp7q19f0';
const ID5 = 'kJQP7kiw5Fk';

test('parseVideoId: raw ID', () => {
  assert.equal(parseVideoId(ID), ID);
  assert.equal(parseVideoId(`  ${ID}  `), ID);
  assert.equal(parseVideoId(ID3), ID3); // contains '-'
});

test('parseVideoId: URL formats', () => {
  const urls = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/live/${ID}?feature=share`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `www.youtube.com/watch?v=${ID}`,
    `youtube.com/live/${ID}`,
  ];
  for (const u of urls) assert.equal(parseVideoId(u), ID, u);
});

test('parseVideoId: invalid input', () => {
  const bad = [
    '',
    '   ',
    'hello',
    'abc',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://evil.com/youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/@channel',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/live/short',
    'https://youtu.be/dQw4w9WgXcQtoolong',
  ];
  for (const b of bad) assert.equal(parseVideoId(b), null, JSON.stringify(b));
});

test('parseMany: splits on space/comma/newline, dedupes, reports invalid', () => {
  const r = parseMany(`${ID}, https://youtu.be/${ID2}\n${ID}  nonsense`);
  assert.deepEqual(r.keys, [`yt:${ID}`, `yt:${ID2}`]);
  assert.deepEqual(r.invalid, ['nonsense']);
});

test('URL builders: params are encoded', () => {
  const p = playerUrl(ID, 'http://localhost:5173');
  assert.ok(p.startsWith(`https://www.youtube.com/embed/${ID}?`));
  assert.ok(p.includes('mute=1'));
  assert.ok(p.includes('origin=http%3A%2F%2Flocalhost%3A5173'));
  assert.equal(
    chatUrl(ID, 'localhost'),
    `https://www.youtube.com/live_chat?v=${ID}&embed_domain=localhost&dark_theme=1`,
  );
});

test('state: round-trips through the hash', () => {
  const s = { keys: [`yt:${ID}`, `yt:${ID2}`], focus: `yt:${ID2}` };
  const h = encodeState(s);
  assert.equal(h, `#v=yt:${ID},yt:${ID2}&f=yt:${ID2}`);
  assert.deepEqual(decodeState(h), s);
});

test('state: empty and broken hash', () => {
  assert.deepEqual(decodeState(''), { keys: [], focus: null });
  assert.equal(encodeState({ keys: [], focus: null }), '');
  assert.deepEqual(decodeState('#v=not-an-id,,%%%'), { keys: [], focus: null });
});

test('state: tile cap, dedupe, focus must be in the list', () => {
  const h = `#v=${ID},${ID2},${ID3},${ID4},${ID5}&f=${ID5}`;
  const s = decodeState(h);
  assert.equal(s.keys.length, MAX_TILES);
  assert.equal(s.focus, null); // ID5 was cut off by the cap
  assert.deepEqual(decodeState(`#v=${ID},yt:${ID}`).keys, [`yt:${ID}`]);
  assert.equal(decodeState(`#v=${ID}&f=${ID2}`).focus, null);
});

test('errorMessage: 101 and 150 both mean embedding is disabled', () => {
  assert.equal(errorMessage(101), errorMessage(150));
  assert.match(errorMessage(101), /embed/);
});

test('errorMessage: unknown code falls back to the generic message', () => {
  assert.equal(errorMessage(999), 'Player failed to load');
});

test('fetchTitle: reads the title from oEmbed', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ title: 'Live Title' }));
  assert.equal(await fetchTitle(ID), 'Live Title');
});

test('fetchTitle: null on a failed response or network error', async (t) => {
  const f = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }));
  assert.equal(await fetchTitle(ID), null);
  f.mock.mockImplementation(async () => {
    throw new TypeError('network');
  });
  assert.equal(await fetchTitle(ID), null);
});

test('state: legacy hash with bare video IDs still decodes', () => {
  const s = decodeState(`#v=${ID},${ID2}&f=${ID2}`);
  assert.deepEqual(s.keys, [`yt:${ID}`, `yt:${ID2}`]);
  assert.equal(s.focus, `yt:${ID2}`);
});
