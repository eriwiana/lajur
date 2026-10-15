# Lajur

Watch up to four YouTube, Twitch or Kick live streams on one page, mixed freely. Live chat follows the stream you focus on. You sign in with your own account inside each platform's official chat embed.

> Status: v0.1. Tested on desktop Chromium and Safari only. Firefox is untested.

## Run it

Lajur ships as a tiny container (under 3 MB, runs as a non-root user).

```bash
docker build -t lajur .
docker run --rm -p 8080:8080 lajur     # then open http://localhost:8080
```

To check the code, build the `test` target. It runs the style check, type check and unit tests, and fails if any of them break:

```bash
docker build --target test .
```

Open it through `localhost` or your own domain, not `file://`. The chat embeds (YouTube, Twitch) need a real hostname.

For live-reload development, use Node 22 and `npm run dev` instead.

## Deploy

The image is plain static hosting on port 8080, so it runs on any container platform (Docker, Fly.io, Railway, Cloud Run, Kubernetes, a VPS). Put it behind HTTPS on your own domain. Video and chat only work on the domain the page is served from, so test once after each deploy.

## How to use

1. Paste one or more YouTube, Twitch or Kick links (or YouTube video IDs) and click **Add**.
2. Click **Focus** on a tile. That tile gets sound and the big slot, the others are muted and stacked on the right, and chat switches to it.
3. Your videos and focus are saved in the page URL, so you can share or refresh it.

Recognised links: YouTube `watch?v=`, `youtu.be/`, `/live/`, `/embed/`, `/shorts/` and bare video IDs; Twitch `twitch.tv/<channel>`; Kick `kick.com/<channel>`.

## Project layout

| File | Purpose |
| --- | --- |
| `src/youtube.ts` | Everything that depends on YouTube: links, embeds, audio control |
| `src/sources.ts` | Source keys (`yt:`, `tw:`, `kick:`), link parsing, Twitch and Kick embed URLs |
| `src/state.ts` | Saving and restoring the page state |
| `src/main.ts` | The interface |

## Known limits

- Some videos cannot be embedded, and chat can be off or members-only. A tile shows the reason when YouTube reports one.
- Videos start muted because browsers block autoplay with sound. After opening a shared link, click **Focus** once to hear audio.
- Audio control relies on YouTube behaviour that is not formally documented. It may stop working if YouTube changes it.
- Chat uses the Google account that is active on youtube.com in your browser, and needs third-party cookies for youtube.com. If "Sign in to chat" picks the wrong account, change your default Google account, use a separate browser profile, or allow third-party cookies for this site. The page cannot choose the account for you.
- Chat colours are controlled by the platform and can differ between browsers.
- Twitch and Kick players have no audio API, so focusing a tile reloads those players with sound on (and the previous one muted). Expect a brief flash.
- Twitch embeds only play on `localhost` or the domain the page is served from.
- Kick has no documented chat embed. The popout chat may refuse to load in the sidebar, so an "Open chat in a new tab" link is shown for Kick tiles.

## Compliance

Lajur only shows the platforms' official embeds. Please do not add proxies, downloads, or ad blocking. Anyone who deploys it is responsible for following the terms of service and embed policies of YouTube, Twitch and Kick.

Lajur is not affiliated with or endorsed by YouTube, Google, Twitch or Kick.

## Contributing

Issues and pull requests are welcome. Run the `test` target (or `npm run lint`, `npm run typecheck` and `npm test`) before pushing. All changes go through pull requests.

## License

[MIT](LICENSE)

## AI assistance

Lajur was developed with the assistance of Claude Sonnet 5.5 (Anthropic), used through Claude Code for
the whole development process. The assistant helped explore the code, draft changes, write tests and
prepare pull requests.

The maintainer directed the work and is responsible for it. Every change goes through a pull request,
the automated checks (style, type check, unit tests, container build) and human review before it is
merged. The assistant is a tool, not an author: it holds no copyright and carries no accountability for
the code.

Some behaviour depends on third-party embeds (YouTube, Twitch, Kick) and was only checked as far as the
maintainer could test it. See [Known limits](#known-limits). Please report anything that looks wrong.
