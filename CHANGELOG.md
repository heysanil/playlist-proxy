# playlist-proxy

## 1.1.1

### Patch Changes

- 19489dd: Fix logo/icon URL proxying to use the same proxy path as streams

  - Logo URLs in M3U (tvg-logo, etc.) are now proxied via `/stream/` when proxy mode is enabled
  - EPG icon URLs (src attributes) are now proxied via `/stream/` when proxy mode is enabled
  - URLs are left unchanged when proxy mode is disabled

## 1.1.0

### Minor Changes

- ef38100: Add option to sync channel-id and tvg-id with tvg-chno during M3U renumbering

  - New `syncChannelIds` option per source to force channel-id and tvg-id attributes to match the updated tvg-chno value
  - EPG rewriter now also updates `<lcn>` tags to match remapped channel IDs
  - Channel mappings now include both tvg-id and tvg-chno as keys for better EPG compatibility

## 1.0.1

### Patch Changes

- 5515dc6: Add ARM64 (Apple Silicon) support to Docker images

## 1.0.0

### Major Changes

- 18bf52c: Initial release of playlist-proxy

  - Web admin UI with dark theme (HTMX-powered)
  - SQLite database for persistent configuration
  - Multiple source support with named routes
  - Hostname rewriting for all URLs in playlists
  - Channel renumbering (starting-index or addition mode)
  - EPG channel ID syncing to match renumbered channels
  - Optional stream proxying through the server
  - Real-time HTTP logs page with SSE streaming
  - Export/import configuration as JSON
  - Docker support with persistent volume
  - Health check endpoint
