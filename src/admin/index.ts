import { getExportData, getSettings, importData, updateSettings } from "../db/settings";
import {
    type DbSource,
    createSource,
    deleteSource,
    getAllSources,
    getSourceById,
    updateSource,
} from "../db/sources";
import { type LogEntry, addLogListener, getLogBuffer } from "../utils/logger";
import { logsPage } from "./views/logs";
import { settingsPage } from "./views/settings";
import { sourceEditForm, sourceItem, sourcesList, sourcesPage } from "./views/sources";

export async function handleAdmin(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const baseUrl = `${url.protocol}//${url.host}/`;

    // GET /admin - Sources page
    if (path === "/admin" && method === "GET") {
        const sources = getAllSources();
        return html(sourcesPage(sources, baseUrl));
    }

    // GET /admin/logs - Logs page
    if (path === "/admin/logs" && method === "GET") {
        return html(logsPage());
    }

    // GET /admin/logs/stream - SSE endpoint for log streaming
    if (path === "/admin/logs/stream" && method === "GET") {
        return createLogStream();
    }

    // GET /admin/export - Export all settings and sources as JSON
    if (path === "/admin/export" && method === "GET") {
        const data = getExportData();
        return new Response(JSON.stringify(data, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": "attachment; filename=playlist-proxy-config.json",
            },
        });
    }

    // POST /admin/import - Import settings and sources from JSON
    if (path === "/admin/import" && method === "POST") {
        try {
            const text = await req.text();
            const data = JSON.parse(text);
            importData(data);
            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: String(error) }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    // GET /admin/settings - Settings page
    if (path === "/admin/settings" && method === "GET") {
        const settings = getSettings();
        return html(settingsPage(settings));
    }

    // POST /admin/settings - Update settings
    if (path === "/admin/settings" && method === "POST") {
        const formData = await req.formData();

        updateSettings({
            port: Number.parseInt(formData.get("port") as string, 10) || 3000,
            hostname: (formData.get("hostname") as string) || null,
            protocol: (formData.get("protocol") as "http" | "https") || "http",
            proxyStreams: formData.get("proxy_streams") === "on",
            cacheDuration: Number.parseInt(formData.get("cache_duration") as string, 10) || 300,
        });

        return new Response(null, { status: 204 });
    }

    // POST /admin/sources - Create source
    if (path === "/admin/sources" && method === "POST") {
        const formData = await req.formData();

        try {
            createSource({
                name: formData.get("name") as string,
                m3uUrl: formData.get("m3u_url") as string,
                epgUrl: (formData.get("epg_url") as string) || undefined,
                channelRenumberType:
                    (formData.get("channel_renumber_type") as
                        | "none"
                        | "starting-index"
                        | "addition") || "none",
                channelRenumberValue: formData.get("channel_renumber_value")
                    ? Number.parseFloat(formData.get("channel_renumber_value") as string)
                    : undefined,
            });

            const sources = getAllSources();
            return html(sourcesList(sources, baseUrl));
        } catch (error) {
            return new Response(`Error: ${error}`, { status: 400 });
        }
    }

    // GET /admin/sources/:id - Get single source (for cancel edit)
    const sourceMatch = path.match(/^\/admin\/sources\/(\d+)$/);
    if (sourceMatch && method === "GET") {
        const id = Number.parseInt(sourceMatch[1], 10);
        const source = getSourceById(id);
        if (!source) {
            return new Response("Source not found", { status: 404 });
        }
        return html(sourceItem(source, baseUrl));
    }

    // GET /admin/sources/:id/edit - Edit form
    const editMatch = path.match(/^\/admin\/sources\/(\d+)\/edit$/);
    if (editMatch && method === "GET") {
        const id = Number.parseInt(editMatch[1], 10);
        const source = getSourceById(id);
        if (!source) {
            return new Response("Source not found", { status: 404 });
        }
        return html(sourceEditForm(source, baseUrl));
    }

    // PUT /admin/sources/:id - Update source
    if (sourceMatch && method === "PUT") {
        const id = Number.parseInt(sourceMatch[1], 10);
        const formData = await req.formData();

        const updated = updateSource(id, {
            name: formData.get("name") as string,
            m3uUrl: formData.get("m3u_url") as string,
            epgUrl: (formData.get("epg_url") as string) || null,
            channelRenumberType:
                (formData.get("channel_renumber_type") as "none" | "starting-index" | "addition") ||
                "none",
            channelRenumberValue: formData.get("channel_renumber_value")
                ? Number.parseFloat(formData.get("channel_renumber_value") as string)
                : null,
        });

        if (!updated) {
            return new Response("Source not found", { status: 404 });
        }

        return html(sourceItem(updated, baseUrl));
    }

    // DELETE /admin/sources/:id - Delete source
    if (sourceMatch && method === "DELETE") {
        const id = Number.parseInt(sourceMatch[1], 10);
        deleteSource(id);
        const sources = getAllSources();
        return html(sourcesList(sources, baseUrl));
    }

    return new Response("Not Found", { status: 404 });
}

function html(content: string): Response {
    return new Response(content, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

function createLogStream(): Response {
    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            // Send existing logs first
            const existingLogs = getLogBuffer();
            for (const entry of existingLogs.slice(-50)) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
            }

            // Subscribe to new logs
            const unsubscribe = addLogListener((entry: LogEntry) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(entry)}\n\n`));
                } catch {
                    // Stream closed, unsubscribe
                    unsubscribe();
                }
            });

            // Handle stream close
            return () => {
                unsubscribe();
            };
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
