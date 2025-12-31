export type ChannelRenumberMode =
    | { type: "none" }
    | { type: "starting-index"; startFrom: number }
    | { type: "addition"; addValue: number };

export interface SourceConfig {
    /** Unique name for this source (used in URL routes) */
    name: string;
    /** URL to the source M3U playlist */
    m3uUrl: string;
    /** URL to the source EPG/XMLTV file (optional) */
    epgUrl?: string;
    /** Per-source channel renumbering (overrides global if set) */
    channelRenumber?: ChannelRenumberMode;
}

export interface ProxyConfig {
    /** Server port (default: 3000) */
    port: number;
    /** Hostname for URL rewriting (null = use request hostname) */
    hostname: string | null;
    /** Protocol for rewritten URLs */
    protocol: "http" | "https";
    /** Multiple M3U/EPG sources */
    sources: SourceConfig[];
    /** Global channel renumbering (can be overridden per-source) */
    channelRenumber: ChannelRenumberMode;
    /** Whether to proxy stream URLs through this server */
    proxyStreams: boolean;
    /** Cache TTL in seconds (0 = no cache) */
    cacheDuration: number;
}

export const defaultConfig: ProxyConfig = {
    port: 3000,
    hostname: null,
    protocol: "http",
    sources: [],
    channelRenumber: { type: "none" },
    proxyStreams: false,
    cacheDuration: 300,
};
