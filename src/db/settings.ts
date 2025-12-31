import type { ChannelRenumberMode, ProxyConfig } from "../config/schema";
import { getDb } from "./index";
import {
    type DbSource,
    createSource,
    deleteSource,
    getAllSources,
    getAllSourcesAsConfig,
} from "./sources";

export interface Settings {
    port: number;
    hostname: string | null;
    protocol: "http" | "https";
    proxyStreams: boolean;
    cacheDuration: number;
}

export function getSetting(key: string): string | null {
    const db = getDb();
    const row = db
        .query<{ value: string }, [string]>("SELECT value FROM settings WHERE key = ?")
        .get(key);
    return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
    const db = getDb();
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
}

export function getAllSettings(): Record<string, string> {
    const db = getDb();
    const rows = db
        .query<{ key: string; value: string }, []>("SELECT key, value FROM settings")
        .all();

    const settings: Record<string, string> = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }
    return settings;
}

export function getSettings(): Settings {
    const raw = getAllSettings();

    return {
        port: Number.parseInt(raw.port || "3000", 10),
        hostname: raw.hostname || null,
        protocol: (raw.protocol as "http" | "https") || "http",
        proxyStreams: raw.proxy_streams === "true",
        cacheDuration: Number.parseInt(raw.cache_duration || "300", 10),
    };
}

export function updateSettings(settings: Partial<Settings>): void {
    if (settings.port !== undefined) {
        setSetting("port", String(settings.port));
    }
    if (settings.hostname !== undefined) {
        setSetting("hostname", settings.hostname || "");
    }
    if (settings.protocol !== undefined) {
        setSetting("protocol", settings.protocol);
    }
    if (settings.proxyStreams !== undefined) {
        setSetting("proxy_streams", String(settings.proxyStreams));
    }
    if (settings.cacheDuration !== undefined) {
        setSetting("cache_duration", String(settings.cacheDuration));
    }
}

// Build full ProxyConfig from database
export function getFullConfig(): ProxyConfig {
    const settings = getSettings();
    const sources = getAllSourcesAsConfig();

    return {
        port: settings.port,
        hostname: settings.hostname,
        protocol: settings.protocol,
        sources,
        channelRenumber: { type: "none" }, // Global renumber not used with per-source config
        proxyStreams: settings.proxyStreams,
        cacheDuration: settings.cacheDuration,
    };
}

// Export all settings and sources for backup
export interface ExportData {
    version: number;
    exportedAt: string;
    settings: Settings;
    sources: Array<{
        name: string;
        m3uUrl: string;
        epgUrl: string | null;
        channelRenumberType: string;
        channelRenumberValue: number | null;
    }>;
}

export function getExportData(): ExportData {
    const settings = getSettings();
    const sources = getAllSources();

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        sources: sources.map((s) => ({
            name: s.name,
            m3uUrl: s.m3u_url,
            epgUrl: s.epg_url,
            channelRenumberType: s.channel_renumber_type,
            channelRenumberValue: s.channel_renumber_value,
        })),
    };
}

// Import settings and sources from backup
export function importData(data: ExportData): void {
    if (!data.version || !data.settings || !data.sources) {
        throw new Error("Invalid import data format");
    }

    // Update settings
    updateSettings(data.settings);

    // Delete all existing sources
    const existingSources = getAllSources();
    for (const source of existingSources) {
        deleteSource(source.id);
    }

    // Create new sources from import
    for (const source of data.sources) {
        createSource({
            name: source.name,
            m3uUrl: source.m3uUrl,
            epgUrl: source.epgUrl || undefined,
            channelRenumberType: source.channelRenumberType as
                | "none"
                | "starting-index"
                | "addition",
            channelRenumberValue: source.channelRenumberValue ?? undefined,
        });
    }
}
