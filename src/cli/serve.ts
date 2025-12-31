import pc from "picocolors";
import { loadConfigFromDb } from "../config/loader";
import { initDb } from "../db";
import { createServer } from "../server";
import { info, setLoggerOptions } from "../utils/logger";

interface ServeOptions {
    config?: string;
    port?: number;
    verbose?: boolean;
    dataDir?: string;
}

export async function serve(options: ServeOptions) {
    // Set up logger
    setLoggerOptions({ verbose: options.verbose || false });

    // Initialize database
    const dataDir = options.dataDir || "./data";
    initDb(dataDir);

    const config = loadConfigFromDb();

    if (options.port) {
        config.port = options.port;
    }

    const server = createServer(config);

    // Pretty startup banner
    console.log();
    console.log(pc.bold(pc.cyan("  playlist-proxy")), pc.dim("v1.0.0"));
    console.log();
    console.log(pc.green("  ✓"), "Server running on", pc.bold(pc.white(server.url.toString())));
    console.log();

    // List endpoints
    console.log(pc.dim("  Endpoints:"));

    if (config.sources.length === 0) {
        console.log(pc.dim("    ├─"), pc.yellow("No sources configured"));
        console.log(pc.dim("    │  └─"), "Add sources via", pc.cyan(`${server.url}admin`));
    } else {
        for (const source of config.sources) {
            console.log(pc.dim("    ├─"), pc.yellow(source.name));
            console.log(
                pc.dim("    │  ├─"),
                "M3U:",
                pc.cyan(`${server.url}${source.name}/playlist.m3u`)
            );
            if (source.epgUrl) {
                console.log(
                    pc.dim("    │  └─"),
                    "EPG:",
                    pc.cyan(`${server.url}${source.name}/epg.xml`)
                );
            } else {
                console.log(pc.dim("    │  └─"), "EPG:", pc.dim("not configured"));
            }
        }
    }

    console.log(pc.dim("    ├─"), "Admin:", pc.cyan(`${server.url}admin`));
    console.log(pc.dim("    └─"), "Health:", pc.cyan(`${server.url}health`));
    console.log();

    // Show config summary
    console.log(pc.dim("  Config:"));
    console.log(pc.dim("    ├─"), "Data dir:", pc.white(dataDir));
    console.log(
        pc.dim("    ├─"),
        "Proxy streams:",
        config.proxyStreams ? pc.green("yes") : pc.dim("no")
    );
    console.log(pc.dim("    ├─"), "Cache duration:", pc.white(`${config.cacheDuration}s`));
    console.log(pc.dim("    └─"), "Verbose:", options.verbose ? pc.green("yes") : pc.dim("no"));
    console.log();

    info("Server started, waiting for requests...");
    console.log();
}
