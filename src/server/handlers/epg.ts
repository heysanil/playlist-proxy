import type { ProxyConfig, SourceConfig } from "../../config/schema";
import { rewriteEPG } from "../../parsers/epg";
import { getCachedChannelMappings } from "./m3u";

interface CacheEntry {
    content: string;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export async function handleEPG(
    req: Request,
    config: ProxyConfig,
    source: SourceConfig
): Promise<Response> {
    if (!source.epgUrl) {
        return new Response("No EPG URL configured for this source", {
            status: 404,
        });
    }

    const requestUrl = new URL(req.url);
    const requestHostname = requestUrl.host;

    const cacheKey = `epg:${source.name}`;
    const cached = cache.get(cacheKey);

    // Get channel mappings from M3U cache
    const channelMappings = getCachedChannelMappings(source.name) || new Map();

    // Check cache
    if (cached && config.cacheDuration > 0) {
        const age = (Date.now() - cached.timestamp) / 1000;
        if (age < config.cacheDuration) {
            const rewritten = rewriteEPG(cached.content, config, requestHostname, channelMappings);
            return new Response(rewritten, {
                headers: {
                    "Content-Type": "application/xml",
                    "X-Cache": "HIT",
                },
            });
        }
    }

    // Fetch fresh content
    try {
        const response = await fetch(source.epgUrl);

        if (!response.ok) {
            return new Response(`Upstream error: ${response.status}`, {
                status: 502,
            });
        }

        const rawContent = await response.text();

        // Cache the raw content
        cache.set(cacheKey, {
            content: rawContent,
            timestamp: Date.now(),
        });

        const rewritten = rewriteEPG(rawContent, config, requestHostname, channelMappings);

        return new Response(rewritten, {
            headers: {
                "Content-Type": "application/xml",
                "X-Cache": "MISS",
            },
        });
    } catch (error) {
        return new Response(`Failed to fetch upstream: ${error}`, {
            status: 502,
        });
    }
}
