# playlist-proxy

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
