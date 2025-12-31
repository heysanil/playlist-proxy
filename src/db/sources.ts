import type { ChannelRenumberMode, SourceConfig } from "../config/schema";
import { getDb } from "./index";

export interface DbSource {
    id: number;
    name: string;
    m3u_url: string;
    epg_url: string | null;
    channel_renumber_type: string;
    channel_renumber_value: number | null;
    created_at: string;
    updated_at: string;
}

export interface CreateSourceInput {
    name: string;
    m3uUrl: string;
    epgUrl?: string;
    channelRenumberType?: "none" | "starting-index" | "addition";
    channelRenumberValue?: number;
}

export interface UpdateSourceInput {
    name?: string;
    m3uUrl?: string;
    epgUrl?: string | null;
    channelRenumberType?: "none" | "starting-index" | "addition";
    channelRenumberValue?: number | null;
}

export function getAllSources(): DbSource[] {
    const db = getDb();
    return db.query<DbSource, []>("SELECT * FROM sources ORDER BY name").all();
}

export function getSourceById(id: number): DbSource | null {
    const db = getDb();
    return db.query<DbSource, [number]>("SELECT * FROM sources WHERE id = ?").get(id);
}

export function getSourceByName(name: string): DbSource | null {
    const db = getDb();
    return db.query<DbSource, [string]>("SELECT * FROM sources WHERE name = ?").get(name);
}

export function createSource(input: CreateSourceInput): DbSource {
    const db = getDb();
    const result = db.run(
        `INSERT INTO sources (name, m3u_url, epg_url, channel_renumber_type, channel_renumber_value)
     VALUES (?, ?, ?, ?, ?)`,
        [
            input.name,
            input.m3uUrl,
            input.epgUrl || null,
            input.channelRenumberType || "none",
            input.channelRenumberValue ?? null,
        ]
    );

    return getSourceById(Number(result.lastInsertRowid))!;
}

export function updateSource(id: number, input: UpdateSourceInput): DbSource | null {
    const db = getDb();
    const existing = getSourceById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.name !== undefined) {
        updates.push("name = ?");
        values.push(input.name);
    }
    if (input.m3uUrl !== undefined) {
        updates.push("m3u_url = ?");
        values.push(input.m3uUrl);
    }
    if (input.epgUrl !== undefined) {
        updates.push("epg_url = ?");
        values.push(input.epgUrl);
    }
    if (input.channelRenumberType !== undefined) {
        updates.push("channel_renumber_type = ?");
        values.push(input.channelRenumberType);
    }
    if (input.channelRenumberValue !== undefined) {
        updates.push("channel_renumber_value = ?");
        values.push(input.channelRenumberValue);
    }

    if (updates.length === 0) return existing;

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    db.run(`UPDATE sources SET ${updates.join(", ")} WHERE id = ?`, values);

    return getSourceById(id);
}

export function deleteSource(id: number): boolean {
    const db = getDb();
    const result = db.run("DELETE FROM sources WHERE id = ?", [id]);
    return result.changes > 0;
}

// Convert DB source to config format
export function dbSourceToConfig(source: DbSource): SourceConfig {
    let channelRenumber: ChannelRenumberMode | undefined;

    if (
        source.channel_renumber_type === "starting-index" &&
        source.channel_renumber_value !== null
    ) {
        channelRenumber = { type: "starting-index", startFrom: source.channel_renumber_value };
    } else if (
        source.channel_renumber_type === "addition" &&
        source.channel_renumber_value !== null
    ) {
        channelRenumber = { type: "addition", addValue: source.channel_renumber_value };
    }

    return {
        name: source.name,
        m3uUrl: source.m3u_url,
        epgUrl: source.epg_url || undefined,
        channelRenumber,
    };
}

export function getAllSourcesAsConfig(): SourceConfig[] {
    return getAllSources().map(dbSourceToConfig);
}
