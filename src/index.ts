#!/usr/bin/env bun

import { parseArgs } from "util";

const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        help: { type: "boolean", short: "h" },
        port: { type: "string", short: "p" },
        verbose: { type: "boolean", short: "v" },
        "data-dir": { type: "string", short: "d", default: "./data" },
    },
    allowPositionals: true,
});

const command = positionals[0];

function printHelp() {
    console.log(`
playlist-proxy - M3U and EPG proxy server

Commands:
  serve             Start the proxy server

Options:
  -d, --data-dir    Data directory for SQLite database (default: ./data)
  -p, --port        Override server port
  -v, --verbose     Enable verbose logging
  -h, --help        Show this help message

Examples:
  playlist-proxy serve
  playlist-proxy serve --port 8080
  playlist-proxy serve --verbose
  playlist-proxy serve --data-dir /var/lib/playlist-proxy
`);
}

async function main() {
    if (values.help || !command) {
        printHelp();
        process.exit(0);
    }

    switch (command) {
        case "serve": {
            const { serve } = await import("./cli/serve");
            await serve({
                port: values.port ? Number.parseInt(values.port, 10) : undefined,
                verbose: values.verbose || false,
                dataDir: values["data-dir"],
            });
            break;
        }
        default:
            console.error(`Unknown command: ${command}`);
            printHelp();
            process.exit(1);
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
