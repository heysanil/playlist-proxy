---
"playlist-proxy": patch
---

Fix logo/icon URL proxying to use the same proxy path as streams

- Logo URLs in M3U (tvg-logo, etc.) are now proxied via `/stream/` when proxy mode is enabled
- EPG icon URLs (src attributes) are now proxied via `/stream/` when proxy mode is enabled
- URLs are left unchanged when proxy mode is disabled
