# Lajur

Watch up to four YouTube live streams on one page. Live chat follows the stream you focus on. You sign in with your own YouTube account through YouTube's official embeds.

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

Open it through `localhost` or your own domain, not `file://`. YouTube's chat embed needs a real hostname.

For live-reload development, use Node 22 and `npm run dev` instead.

## How to use

1. Paste one or more YouTube links or video IDs and click **Tambah** (Add).
2. Click **Fokus** (Focus) on a tile. That tile gets sound and the big slot, the others are muted and stacked on the right, and chat switches to it.
3. Your videos and focus are saved in the page URL, so you can share or refresh it.

Recognised links: `watch?v=`, `youtu.be/`, `/live/`, `/embed/`, `/shorts/`, and bare video IDs.

## Project layout

| File | Purpose |
| --- | --- |
| `src/youtube.ts` | Everything that depends on YouTube: links, embeds, audio control |
| `src/state.ts` | Saving and restoring the page state |
| `src/main.ts` | The interface |

## Known limits

- Some videos cannot be embedded, and chat can be off or members-only. A tile shows the reason when YouTube reports one.
- Videos start muted because browsers block autoplay with sound. After opening a shared link, click **Fokus** once to hear audio.
- Audio control relies on YouTube behaviour that is not formally documented. It may stop working if YouTube changes it.
- Chat uses the Google account that is active on youtube.com in your browser, and needs third-party cookies for youtube.com. If "Sign in to chat" picks the wrong account, change your default Google account, use a separate browser profile, or allow third-party cookies for this site. The page cannot choose the account for you.
- Chat colours are controlled by YouTube and can differ between browsers.
- On a deployed site, video and chat only work on the domain they were loaded from. Test after each deploy.

## Compliance

Lajur only shows YouTube's official embeds. Please do not add proxies, downloads, or ad blocking. Anyone who deploys it is responsible for following the [YouTube Terms of Service](https://www.youtube.com/t/terms) and current API and embed policies.

Lajur is not affiliated with or endorsed by YouTube or Google.

## Contributing

Issues and pull requests are welcome. Run the `test` target (or `npm run lint`, `npm run typecheck` and `npm test`) before pushing. All changes go through pull requests.

## License

[MIT](LICENSE)
