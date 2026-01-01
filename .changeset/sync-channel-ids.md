---
"playlist-proxy": minor
---

Add option to sync channel-id and tvg-id with tvg-chno during M3U renumbering

- New `syncChannelIds` option per source to force channel-id and tvg-id attributes to match the updated tvg-chno value
- EPG rewriter now also updates `<lcn>` tags to match remapped channel IDs
- Channel mappings now include both tvg-id and tvg-chno as keys for better EPG compatibility
