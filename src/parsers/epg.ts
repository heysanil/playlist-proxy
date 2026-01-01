import type { ProxyConfig } from "../config/schema";

/**
 * Rewrite an EPG/XMLTV file with hostname rewriting and channel ID syncing
 */
export function rewriteEPG(
    content: string,
    config: ProxyConfig,
    requestHostname: string,
    channelMappings: Map<string, string>
): string {
    const targetHost = config.hostname || requestHostname;
    const protocol = config.protocol;
    const proxyBaseUrl = `${protocol}://${targetHost}:${config.port}`;

    let result = content;

    // Rewrite icon/logo URLs in src attributes
    result = result.replace(/src="(https?:\/\/[^"]+)"/gi, (match, url) => {
        try {
            const parsed = new URL(url);
            parsed.host = targetHost;
            parsed.protocol = `${protocol}:`;
            return `src="${parsed.toString()}"`;
        } catch {
            return match;
        }
    });

    // Sync channel IDs if we have mappings
    if (channelMappings.size > 0) {
        // Replace channel id attributes in <channel> elements
        // <channel id="CNN.US"> -> <channel id="100">
        result = result.replace(/<channel\s+id="([^"]+)"/gi, (match, id) => {
            const newId = channelMappings.get(id);
            if (newId) {
                return `<channel id="${newId}"`;
            }
            return match;
        });

        // Replace channel attributes in <programme> elements
        // <programme ... channel="CNN.US"> -> <programme ... channel="100">
        result = result.replace(/(<programme[^>]*)\s+channel="([^"]+)"/gi, (match, prefix, id) => {
            const newId = channelMappings.get(id);
            if (newId) {
                return `${prefix} channel="${newId}"`;
            }
            return match;
        });

        // Update <lcn> tags within channel blocks for remapped channels
        // <channel id="100">...<lcn>1.1</lcn> -> <channel id="100">...<lcn>100</lcn>
        const remappedIds = new Set(channelMappings.values());
        result = result.replace(
            /<channel\s+id="([^"]+)"([^>]*)>([\s\S]*?)<lcn>[^<]*<\/lcn>/gi,
            (match, channelId, attrs, content) => {
                if (remappedIds.has(channelId)) {
                    return `<channel id="${channelId}"${attrs}>${content}<lcn>${channelId}</lcn>`;
                }
                return match;
            }
        );
    }

    return result;
}
