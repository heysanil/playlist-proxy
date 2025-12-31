import { handleAdmin } from "../admin";
import { loadConfigFromDb } from "../config/loader";
import type { ProxyConfig } from "../config/schema";
import { debug, logRequestVerbose } from "../utils/logger";
import { handleEPG } from "./handlers/epg";
import { handleM3U } from "./handlers/m3u";
import { handleStream } from "./handlers/stream";

export function createServer(config: ProxyConfig) {
    return Bun.serve({
        port: config.port,

        async fetch(req) {
            const start = performance.now();
            const url = new URL(req.url);
            const path = url.pathname;
            const method = req.method;

            let response: Response;
            let details: Record<string, unknown> = {};

            try {
                // Admin routes
                if (path.startsWith("/admin")) {
                    response = await handleAdmin(req);
                    details = { type: "admin" };
                }
                // Health check
                else if (path === "/health") {
                    const currentConfig = loadConfigFromDb();
                    response = Response.json({
                        status: "ok",
                        sources: currentConfig.sources.length,
                    });
                    details = { type: "health" };
                }
                // Stream proxy
                else if (path.startsWith("/stream/")) {
                    const currentConfig = loadConfigFromDb();
                    debug("Proxying stream request");
                    response = await handleStream(req, currentConfig);
                    details = { type: "stream" };
                }
                // Source routes: /:source/playlist.m3u or /:source/epg.xml
                else {
                    const match = path.match(/^\/([^/]+)\/(playlist\.m3u|epg\.xml)$/);
                    if (match) {
                        // Reload config from DB to get latest sources
                        const currentConfig = loadConfigFromDb();
                        const [, sourceName, file] = match;
                        const source = currentConfig.sources.find((s) => s.name === sourceName);

                        if (!source) {
                            response = new Response(`Source not found: ${sourceName}`, {
                                status: 404,
                            });
                            details = { type: "error", reason: "source not found" };
                        } else if (file === "playlist.m3u") {
                            debug(`Fetching M3U for source: ${sourceName}`);
                            response = await handleM3U(req, currentConfig, source);
                            details = {
                                type: "m3u",
                                source: sourceName,
                                cache: response.headers.get("X-Cache") || "N/A",
                            };
                        } else if (file === "epg.xml") {
                            if (!source.epgUrl) {
                                response = new Response(
                                    `No EPG configured for source: ${sourceName}`,
                                    {
                                        status: 404,
                                    }
                                );
                                details = { type: "error", reason: "no EPG configured" };
                            } else {
                                debug(`Fetching EPG for source: ${sourceName}`);
                                response = await handleEPG(req, currentConfig, source);
                                details = {
                                    type: "epg",
                                    source: sourceName,
                                    cache: response.headers.get("X-Cache") || "N/A",
                                };
                            }
                        } else {
                            response = new Response("Not Found", { status: 404 });
                            details = { type: "error", reason: "not found" };
                        }
                    } else {
                        response = new Response("Not Found", { status: 404 });
                        details = { type: "error", reason: "not found" };
                    }
                }
            } catch (err) {
                response = new Response(`Internal Server Error: ${err}`, { status: 500 });
                details = { type: "error", reason: String(err) };
            }

            const duration = performance.now() - start;

            // Don't log admin asset requests in non-verbose mode
            if (!path.startsWith("/admin") || details.type === "admin") {
                logRequestVerbose(method, path, response.status, duration, details);
            }

            return response;
        },
    });
}
