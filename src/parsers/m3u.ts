import type { ChannelRenumberMode, ProxyConfig, SourceConfig } from "../config/schema";
import { calculateNewChannelNumber } from "../utils/channel";

interface ParsedChannel {
    tvgId: string | null;
    originalChannelNumber: string | null;
    newChannelNumber: string | null;
}

/**
 * Extract an attribute value from an #EXTINF line
 */
function extractAttribute(line: string, attribute: string): string | null {
    const regex = new RegExp(`${attribute}="([^"]*)"`, "i");
    const match = line.match(regex);
    return match ? match[1] : null;
}

/**
 * Replace or add an attribute value in an #EXTINF line
 */
function setAttribute(line: string, attribute: string, value: string): string {
    const regex = new RegExp(`${attribute}="[^"]*"`, "i");
    if (regex.test(line)) {
        return line.replace(regex, `${attribute}="${value}"`);
    }
    // Insert after #EXTINF:-1 or similar
    return line.replace(/(#EXTINF:-?\d+)/, `$1 ${attribute}="${value}"`);
}

/**
 * Rewrite a stream URL - only if proxying is enabled
 */
function rewriteStreamUrl(url: string, proxyStreams: boolean, proxyBaseUrl: string): string {
    if (!proxyStreams) {
        // Leave stream URLs unchanged - client connects directly
        return url;
    }

    try {
        // Proxy through our server
        return `${proxyBaseUrl}/stream/${encodeURIComponent(url)}`;
    } catch {
        return url;
    }
}

/**
 * Rewrite URLs found in attribute values within a line (logos, etc.)
 */
function rewriteUrlsInLine(line: string, proxyStreams: boolean, proxyBaseUrl: string): string {
    // Match URLs in attribute values like tvg-logo="http://..."
    return line.replace(/="(https?:\/\/[^"]+)"/gi, (match, url) => {
        if (!proxyStreams) {
            // Leave URLs unchanged when not proxying
            return match;
        }
        try {
            // Proxy through our server
            return `="${proxyBaseUrl}/stream/${encodeURIComponent(url)}"`;
        } catch {
            return match;
        }
    });
}

export interface M3URewriteResult {
    content: string;
    channelMappings: Map<string, string>;
}

/**
 * Rewrite an M3U file with hostname rewriting and channel renumbering
 */
export function rewriteM3U(
    content: string,
    config: ProxyConfig,
    source: SourceConfig,
    requestHostname: string
): M3URewriteResult {
    const lines = content.split("\n");
    const result: string[] = [];
    const channelMappings = new Map<string, string>();

    // Don't append port if using request hostname (it already includes the port)
    const proxyBaseUrl = config.hostname
        ? `${config.protocol}://${config.hostname}:${config.port}`
        : `${config.protocol}://${requestHostname}`;
    const renumberMode = source.channelRenumber || config.channelRenumber;

    let channelIndex = 0;
    let i = 0;

    while (i < lines.length) {
        let line = lines[i];

        if (line.startsWith("#EXTINF:")) {
            // Parse current channel info
            const tvgId = extractAttribute(line, "tvg-id");
            const currentChno = extractAttribute(line, "tvg-chno");

            // Calculate new channel number
            const newChno = calculateNewChannelNumber(renumberMode, currentChno, channelIndex);

            // Store mapping for EPG sync (map both tvg-id and tvg-chno to handle different EPG formats)
            if (newChno) {
                if (tvgId) {
                    channelMappings.set(tvgId, newChno);
                }
                // Also map by original channel number in case EPG uses chno as channel id
                if (currentChno && currentChno !== tvgId) {
                    channelMappings.set(currentChno, newChno);
                }
            }

            // Update tvg-chno if we have a new value
            if (newChno && renumberMode.type !== "none") {
                line = setAttribute(line, "tvg-chno", newChno);

                // Optionally sync channel-id and tvg-id to match the new chno
                if (source.syncChannelIds) {
                    line = setAttribute(line, "tvg-id", newChno);
                    line = setAttribute(line, "channel-id", newChno);
                }
            }

            // Rewrite URLs in the line (logos, etc.) - proxy when enabled
            line = rewriteUrlsInLine(line, config.proxyStreams, proxyBaseUrl);

            result.push(line);
            channelIndex++;
        } else if (line.startsWith("http://") || line.startsWith("https://")) {
            // Stream URL - only rewrite if proxying is enabled
            line = rewriteStreamUrl(line.trim(), config.proxyStreams, proxyBaseUrl);
            result.push(line);
        } else {
            // Other lines (headers, comments, etc.)
            result.push(line);
        }

        i++;
    }

    return {
        content: result.join("\n"),
        channelMappings,
    };
}
