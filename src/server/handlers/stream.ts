import type { ProxyConfig } from "../../config/schema";

export async function handleStream(req: Request, config: ProxyConfig): Promise<Response> {
    if (!config.proxyStreams) {
        return new Response("Stream proxying is disabled", { status: 403 });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Extract the encoded URL from /stream/{encodedUrl}
    const encodedUrl = path.replace(/^\/stream\//, "");

    if (!encodedUrl) {
        return new Response("Missing stream URL", { status: 400 });
    }

    let targetUrl: string;
    try {
        targetUrl = decodeURIComponent(encodedUrl);
    } catch {
        return new Response("Invalid stream URL encoding", { status: 400 });
    }

    // Validate it's a valid URL
    try {
        new URL(targetUrl);
    } catch {
        return new Response("Invalid stream URL", { status: 400 });
    }

    // Proxy the request
    try {
        const response = await fetch(targetUrl, {
            headers: {
                // Forward some headers that might be needed
                "User-Agent": req.headers.get("User-Agent") || "playlist-proxy/1.0",
                Accept: req.headers.get("Accept") || "*/*",
                Range: req.headers.get("Range") || "",
            },
        });

        // Create response headers
        const headers = new Headers();

        // Forward relevant headers from upstream
        const headersToForward = [
            "Content-Type",
            "Content-Length",
            "Content-Range",
            "Accept-Ranges",
            "Cache-Control",
        ];

        for (const header of headersToForward) {
            const value = response.headers.get(header);
            if (value) {
                headers.set(header, value);
            }
        }

        headers.set("X-Proxied-From", new URL(targetUrl).hostname);

        return new Response(response.body, {
            status: response.status,
            headers,
        });
    } catch (error) {
        return new Response(`Failed to proxy stream: ${error}`, { status: 502 });
    }
}
