import type { ProxyConfig, SourceConfig } from "../../config/schema";
import { type M3URewriteResult, rewriteM3U } from "../../parsers/m3u";

interface CacheEntry {
    content: string;
    channelMappings: Map<string, string>;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export type { M3URewriteResult };

/**
 * Get cached channel mappings for EPG sync
 */
export function getCachedChannelMappings(sourceName: string): Map<string, string> | null {
    const cached = cache.get(`m3u:${sourceName}`);
    return cached?.channelMappings || null;
}

export async function handleM3U(
    req: Request,
    config: ProxyConfig,
    source: SourceConfig
): Promise<Response> {
    const requestUrl = new URL(req.url);
    const requestHostname = requestUrl.host;

    const cacheKey = `m3u:${source.name}`;
    const cached = cache.get(cacheKey);

    // Check cache
    if (cached && config.cacheDuration > 0) {
        const age = (Date.now() - cached.timestamp) / 1000;
        if (age < config.cacheDuration) {
            // Re-apply transformations with current request hostname
            const result = rewriteM3U(cached.content, config, source, requestHostname);
            return new Response(result.content, {
                headers: {
                    "Content-Type": "application/x-mpegurl",
                    "X-Cache": "HIT",
                },
            });
        }
    }

    // Fetch fresh content
    try {
        const response = await fetch(source.m3uUrl);

        if (!response.ok) {
            return new Response(`Upstream error: ${response.status}`, {
                status: 502,
            });
        }

        const rawContent = await response.text();

        // Cache the raw content
        const result = rewriteM3U(rawContent, config, source, requestHostname);

        cache.set(cacheKey, {
            content: rawContent,
            channelMappings: result.channelMappings,
            timestamp: Date.now(),
        });

        return new Response(result.content, {
            headers: {
                "Content-Type": "application/x-mpegurl",
                "X-Cache": "MISS",
            },
        });
    } catch (error) {
        return new Response(`Failed to fetch upstream: ${error}`, {
            status: 502,
        });
    }
}
