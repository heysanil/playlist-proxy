import { getFullConfig } from "../db/settings";
import type { ProxyConfig } from "./schema";

// Load config from SQLite database
export function loadConfigFromDb(): ProxyConfig {
    return getFullConfig();
}

// Re-export for backwards compatibility during transition
export async function loadConfig(_configPath?: string): Promise<ProxyConfig> {
    return loadConfigFromDb();
}
