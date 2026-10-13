import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeState, encodeState, MAX_TILES } from '../src/state.ts';
import { chatUrl, parseMany, parseVideoId, playerUrl } from '../src/youtube.ts';

const ID = 'dQw4w9WgXcQ';
const ID2 = 'jNQXAC9IVRw';
const ID3 = 'aqz-KE-bpKQ';
const ID4 = '9bZkp7q19f0';
const ID5 = 'kJQP7kiw5Fk';

test('parseVideoId: ID mentah', () => {
  assert.equal(parseVideoId(ID), ID);
  assert.equal(parseVideoId(`  ${ID}  `), ID);
  assert.equal(parseVideoId(ID3), ID3); // mengandung '-'
});

test('parseVideoId: berbagai format URL', () => {
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

test('parseVideoId: input tidak valid', () => {
  const bad = [
    '',
    '   ',
    'halo',
    'abc',
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://evil.com/youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/@channel',
    'https://www.youtube.com/watch?v=pendek',
    'https://www.youtube.com/live/pendek',
    'https://youtu.be/dQw4w9WgXcQterlalupanjang',
  ];
  for (const b of bad) assert.equal(parseVideoId(b), null, JSON.stringify(b));
});

test('parseMany: pisah spasi/koma/baris, dedupe, laporkan invalid', () => {
  const r = parseMany(`${ID}, https://youtu.be/${ID2}\n${ID}  nonsense`);
  assert.deepEqual(r.ids, [ID, ID2]);
  assert.deepEqual(r.invalid, ['nonsense']);
});

test('URL builder: parameter di-encode', () => {
  const p = playerUrl(ID, 'http://localhost:5173');
  assert.ok(p.startsWith(`https://www.youtube.com/embed/${ID}?`));
  assert.ok(p.includes('mute=1'));
  assert.ok(p.includes('origin=http%3A%2F%2Flocalhost%3A5173'));
  assert.equal(
    chatUrl(ID, 'localhost'),
    `https://www.youtube.com/live_chat?v=${ID}&embed_domain=localhost&dark_theme=1`,
  );
});

test('state: round-trip lewat hash', () => {
  const s = { ids: [ID, ID2], focus: ID2, layout: 'grid' as const };
  const h = encodeState(s);
  assert.equal(h, `#v=${ID},${ID2}&f=${ID2}`);
  assert.deepEqual(decodeState(h), s);
});

test('state: hash kosong dan rusak', () => {
  assert.deepEqual(decodeState(''), { ids: [], focus: null, layout: 'grid' });
  assert.equal(encodeState({ ids: [], focus: null, layout: 'grid' }), '');
  assert.deepEqual(decodeState('#v=bukan-id,,%%%'), { ids: [], focus: null, layout: 'grid' });
});

test('state: batas tile, dedupe, fokus harus ada di daftar', () => {
  const h = `#v=${ID},${ID2},${ID3},${ID4},${ID5}&f=${ID5}`;
  const s = decodeState(h);
  assert.equal(s.ids.length, MAX_TILES);
  assert.equal(s.focus, null); // ID5 terpotong oleh batas
  assert.deepEqual(decodeState(`#v=${ID},${ID}`).ids, [ID]);
  assert.equal(decodeState(`#v=${ID}&f=${ID2}`).focus, null);
});

test('state: layout non-default ikut di hash dan kembali utuh', () => {
  const s = { ids: [ID, ID2], focus: ID, layout: 'focus' as const };
  const h = encodeState(s);
  assert.equal(h, `#v=${ID},${ID2}&f=${ID}&l=focus`);
  assert.deepEqual(decodeState(h), s);
});

test('state: layout default tidak ditulis ke hash', () => {
  assert.ok(!encodeState({ ids: [ID], focus: null, layout: 'grid' }).includes('l='));
});

test('state: layout tidak dikenal jatuh ke grid', () => {
  assert.equal(decodeState(`#v=${ID}&l=diagonal`).layout, 'grid');
  assert.equal(decodeState(`#v=${ID}&l=`).layout, 'grid');
});
