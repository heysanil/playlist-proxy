import type { ChannelRenumberMode } from "../config/schema";

/**
 * Calculates the new channel number based on the renumbering mode
 */
export function calculateNewChannelNumber(
    mode: ChannelRenumberMode,
    currentChannelNumber: string | null,
    index: number
): string | null {
    if (mode.type === "none") {
        return currentChannelNumber;
    }

    if (mode.type === "starting-index") {
        return String(mode.startFrom + index);
    }

    if (mode.type === "addition") {
        if (currentChannelNumber === null) {
            return null;
        }
        const num = Number.parseFloat(currentChannelNumber);
        if (Number.isNaN(num)) {
            return currentChannelNumber;
        }
        return String(num + mode.addValue);
    }

    return currentChannelNumber;
}

/**
 * Channel ID mapping for syncing M3U tvg-id to EPG channel IDs
 */
export interface ChannelMapping {
    originalId: string;
    newChannelNumber: string;
}

export function createChannelMappings(
    channels: Array<{ tvgId: string | null; newChannelNumber: string | null }>
): Map<string, string> {
    const mapping = new Map<string, string>();

    for (const channel of channels) {
        if (channel.tvgId && channel.newChannelNumber) {
            mapping.set(channel.tvgId, channel.newChannelNumber);
        }
    }

    return mapping;
}
