import assert from 'node:assert/strict';
import test from 'node:test';
import { chatUrl, kindOf, nameOf, parseMany, parseSource, playerUrl } from '../src/sources.ts';
import { decodeState, encodeState } from '../src/state.ts';

test('parseSource: Twitch channel URLs', () => {
  for (const u of ['https://www.twitch.tv/Shroud', 'twitch.tv/shroud', 'https://m.twitch.tv/shroud/?sr=a'])
    assert.equal(parseSource(u), 'tw:shroud', u);
});

test('parseSource: Kick channel URLs', () => {
  for (const u of ['https://kick.com/xqc', 'www.kick.com/XQC/', 'https://kick.com/some-name_1'])
    assert.equal(parseSource(u), `kick:${u.split('/').filter(Boolean).pop()?.toLowerCase()}`, u);
});

test('parseSource: non-channel pages and lookalike hosts are rejected', () => {
  const bad = [
    'https://www.twitch.tv/videos/123456',
    'https://www.twitch.tv/directory',
    'https://www.twitch.tv/',
    'https://nottwitch.tv/shroud',
    'https://twitch.tv.evil.com/shroud',
    'https://kick.com/xqc/clips',
    'shroud',
    'tw:bad name',
    'tw:',
  ];
  for (const b of bad) assert.equal(parseSource(b), null, b);
});

test('parseSource: stored keys round-trip and bare YouTube IDs get a prefix', () => {
  assert.equal(parseSource('tw:shroud'), 'tw:shroud');
  assert.equal(parseSource('kick:xqc'), 'kick:xqc');
  assert.equal(parseSource('dQw4w9WgXcQ'), 'yt:dQw4w9WgXcQ');
  assert.equal(parseSource('yt:dQw4w9WgXcQ'), 'yt:dQw4w9WgXcQ');
});

test('parseMany: mixes platforms and dedupes by key', () => {
  const r = parseMany('twitch.tv/shroud https://kick.com/xqc tw:shroud dQw4w9WgXcQ nope');
  assert.deepEqual(r.keys, ['tw:shroud', 'kick:xqc', 'yt:dQw4w9WgXcQ']);
  assert.deepEqual(r.invalid, ['nope']);
});

test('kindOf / nameOf split a key', () => {
  assert.equal(kindOf('kick:xqc'), 'kick');
  assert.equal(nameOf('kick:xqc'), 'xqc');
});

test('playerUrl: Twitch needs parent and carries the muted flag', () => {
  const u = new URL(playerUrl('tw:shroud', 'http://localhost:5173', 'localhost', false));
  assert.equal(u.origin, 'https://player.twitch.tv');
  assert.equal(u.searchParams.get('channel'), 'shroud');
  assert.equal(u.searchParams.get('parent'), 'localhost');
  assert.equal(u.searchParams.get('muted'), 'true');
  assert.equal(new URL(playerUrl('tw:shroud', '', 'localhost', true)).searchParams.get('muted'), 'false');
});

test('playerUrl: Kick and YouTube', () => {
  assert.equal(playerUrl('kick:xqc', '', 'h', false), 'https://player.kick.com/xqc?autoplay=true&muted=true');
  assert.equal(playerUrl('kick:xqc', '', 'h', true), 'https://player.kick.com/xqc?autoplay=true&muted=false');
  assert.ok(
    playerUrl('yt:dQw4w9WgXcQ', 'http://x', 'x', true).startsWith(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?',
    ),
  );
});

test('chatUrl: per platform', () => {
  assert.equal(
    chatUrl('tw:shroud', 'example.com'),
    'https://www.twitch.tv/embed/shroud/chat?parent=example.com&darkpopout',
  );
  assert.equal(chatUrl('kick:xqc', 'example.com'), 'https://kick.com/popout/xqc/chat');
  assert.ok(chatUrl('yt:dQw4w9WgXcQ', 'example.com').startsWith('https://www.youtube.com/live_chat?'));
});

test('state: mixed-platform hash round-trips', () => {
  const s = { keys: ['yt:dQw4w9WgXcQ', 'tw:shroud', 'kick:xqc'], focus: 'kick:xqc' };
  const h = encodeState(s);
  assert.equal(h, '#v=yt:dQw4w9WgXcQ,tw:shroud,kick:xqc&f=kick:xqc');
  assert.deepEqual(decodeState(h), s);
});
