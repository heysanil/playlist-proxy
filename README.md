# playlist-proxy

A simple Bun server that proxies M3U playlist and EPG (XMLTV) files with hostname rewriting and channel renumbering capabilities. Features a web-based admin UI for easy configuration.

## Features

- **Web Admin UI** - Configure sources and settings through a simple web interface
- **Multiple Sources** - Proxy multiple M3U/EPG sources with named routes
- **Hostname Rewriting** - Automatically rewrite URLs in playlists to use your proxy's hostname
- **Channel Renumbering** - Renumber channels sequentially or add an offset to existing numbers
- **EPG Channel Sync** - Automatically sync EPG channel IDs to match renumbered M3U channels
- **Stream Proxying** - Optionally proxy stream URLs through the server
- **Caching** - In-memory caching with configurable TTL
- **Docker Ready** - Easy deployment with Docker and docker-compose

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/playlist-proxy.git
cd playlist-proxy

# Start with docker-compose
docker-compose up -d

# Open the admin UI
open http://localhost:8099/admin
```

### Using Bun Directly

```bash
# Install dependencies
bun install

# Start the server
bun run src/index.ts serve

# Open the admin UI
open http://localhost:3000/admin
```

## CLI Usage

```
playlist-proxy - M3U and EPG proxy server

Commands:
  serve             Start the proxy server

Options:
  -d, --data-dir    Data directory for SQLite database (default: ./data)
  -p, --port        Override server port (default: 3000)
  -v, --verbose     Enable verbose logging
  -h, --help        Show this help message

Examples:
  bun run src/index.ts serve
  bun run src/index.ts serve --port 8080
  bun run src/index.ts serve --verbose
  bun run src/index.ts serve --data-dir /var/lib/playlist-proxy
```

## Admin UI

Access the admin UI at `http://localhost:3000/admin` (or `http://localhost:8099/admin` with Docker) to:

- **Add/Edit/Delete Sources** - Configure M3U and EPG URLs
- **Channel Renumbering** - Set up sequential numbering or add offsets
- **Global Settings** - Configure port, hostname, caching, and stream proxying

![Admin UI Screenshot](docs/admin-screenshot.png)

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /admin` | Web admin UI |
| `GET /:source/playlist.m3u` | Proxied M3U playlist for the named source |
| `GET /:source/epg.xml` | Proxied EPG/XMLTV for the named source |
| `GET /stream/:encodedUrl` | Stream proxy (when enabled) |
| `GET /health` | Health check endpoint |

### Examples

```bash
# Get the M3U playlist for source "iptv"
curl http://localhost:3000/iptv/playlist.m3u

# Get the EPG for source "iptv"
curl http://localhost:3000/iptv/epg.xml

# Health check
curl http://localhost:3000/health
```

## Configuration

All configuration is done through the web UI and stored in a SQLite database (`data/playlist-proxy.db`).

### Channel Renumbering Modes

| Mode | Description | Example |
|------|-------------|---------|
| None | Keep original channel numbers | 7.1 → 7.1 |
| Starting Index | Sequential numbering from a start value | 100, 101, 102... |
| Addition | Add a value to existing numbers | 7.1 + 200 = 207.1 |

## Docker

### Using docker-compose (Recommended)

```yaml
services:
  playlist-proxy:
    build: .
    ports:
      - "8099:3000"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

```bash
docker-compose up -d
```

### Using Docker directly

```bash
# Build the image
docker build -t playlist-proxy .

# Run with persistent data
docker run -d \
  --name playlist-proxy \
  -p 8099:3000 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  playlist-proxy
```

### Pre-built Image

```bash
docker run -d \
  --name playlist-proxy \
  -p 8099:3000 \
  -v playlist-proxy-data:/app/data \
  --restart unless-stopped \
  ghcr.io/yourusername/playlist-proxy:latest
```

## How It Works

### M3U Processing

1. Fetches the source M3U playlist
2. Parses `#EXTINF` lines and extracts attributes (`tvg-id`, `tvg-chno`, `tvg-logo`, etc.)
3. Applies channel renumbering to `tvg-chno` attributes
4. Rewrites logo URLs to use the proxy hostname
5. Optionally rewrites stream URLs for proxying
6. Caches the result for the configured duration

### EPG Processing

1. Fetches the source EPG/XMLTV file
2. Rewrites icon/logo URLs to use the proxy hostname
3. Syncs channel IDs to match the renumbered M3U channels
4. Caches the result for the configured duration

### Stream Proxying

When enabled, stream URLs in the M3U are rewritten to go through the proxy:

```
Original: http://stream.example.com/live/channel1.m3u8
Proxied:  http://localhost:3000/stream/http%3A%2F%2Fstream.example.com%2Flive%2Fchannel1.m3u8
```

When disabled (default), stream URLs are left unchanged and clients connect directly.

## Project Structure

```
playlist-proxy/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── admin/                # Web admin UI
│   │   ├── index.ts          # Admin route handler
│   │   └── views/            # HTMX templates
│   ├── cli/
│   │   └── serve.ts          # Server startup
│   ├── config/
│   │   ├── schema.ts         # TypeScript types
│   │   └── loader.ts         # Config loader
│   ├── db/                   # SQLite database
│   │   ├── index.ts          # DB connection
│   │   ├── sources.ts        # Source CRUD
│   │   └── settings.ts       # Settings CRUD
│   ├── parsers/
│   │   ├── m3u.ts            # M3U parsing
│   │   └── epg.ts            # EPG parsing
│   ├── server/
│   │   ├── index.ts          # Bun.serve setup
│   │   └── handlers/         # Request handlers
│   └── utils/
│       ├── channel.ts        # Channel utilities
│       └── logger.ts         # Colored logging
├── data/                     # SQLite database (created on first run)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Requirements

- [Bun](https://bun.sh/) v1.0 or later (for local development)
- Docker (for containerized deployment)

## License

MIT
