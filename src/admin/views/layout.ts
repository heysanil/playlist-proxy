export function layout(title: string, content: string, currentPath = "/"): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - playlist-proxy</title>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>
    :root {
      --bg: #0f0f0f;
      --bg-secondary: #1a1a1a;
      --bg-tertiary: #252525;
      --text: #e0e0e0;
      --text-muted: #888;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --success: #22c55e;
      --danger: #ef4444;
      --danger-hover: #dc2626;
      --border: #333;
      --radius: 6px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }

    header h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }

    header h1 span {
      color: var(--accent);
    }

    nav {
      display: flex;
      gap: 1rem;
    }

    nav a {
      color: var(--text-muted);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      transition: all 0.2s;
    }

    nav a:hover {
      color: var(--text);
      background: var(--bg-secondary);
    }

    nav a.active {
      color: var(--accent);
      background: var(--bg-secondary);
    }

    h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }

    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin-bottom: 1rem;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-title {
      font-weight: 600;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    input, select {
      width: 100%;
      padding: 0.75rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      font-size: 0.875rem;
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--accent);
    }

    input::placeholder {
      color: var(--text-muted);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border: none;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover);
    }

    .btn-danger {
      background: var(--danger);
      color: white;
    }

    .btn-danger:hover {
      background: var(--danger-hover);
    }

    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
    }

    .btn-ghost:hover {
      color: var(--text);
      background: var(--bg-tertiary);
    }

    .btn-sm {
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
    }

    .source-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem;
      background: var(--bg-tertiary);
      border-radius: var(--radius);
      margin-bottom: 0.5rem;
    }

    .source-info h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .source-info p {
      font-size: 0.75rem;
      color: var(--text-muted);
      word-break: break-all;
    }

    .source-actions {
      display: flex;
      gap: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted);
    }

    .url-display {
      font-family: monospace;
      font-size: 0.75rem;
      padding: 0.5rem;
      background: var(--bg-tertiary);
      border-radius: var(--radius);
      margin-top: 0.5rem;
      word-break: break-all;
    }

    .url-display a {
      color: var(--accent);
      text-decoration: none;
    }

    .url-display a:hover {
      text-decoration: underline;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      border-radius: var(--radius);
      background: var(--bg-tertiary);
      color: var(--text-muted);
    }

    .badge-success {
      background: rgba(34, 197, 94, 0.2);
      color: var(--success);
    }

    .inline-form {
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
    }

    .inline-form .form-group {
      flex: 1;
      margin-bottom: 0;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
    }

    .htmx-indicator {
      opacity: 0;
      transition: opacity 200ms ease-in;
    }

    .htmx-request .htmx-indicator {
      opacity: 1;
    }

    .htmx-request.htmx-indicator {
      opacity: 1;
    }

    .toast {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      padding: 1rem 1.5rem;
      background: var(--success);
      color: white;
      border-radius: var(--radius);
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1><span>playlist</span>-proxy</h1>
      <nav>
        <a href="/admin" class="${currentPath === "/admin" ? "active" : ""}">Sources</a>
        <a href="/admin/logs" class="${currentPath === "/admin/logs" ? "active" : ""}">Logs</a>
        <a href="/admin/settings" class="${currentPath === "/admin/settings" ? "active" : ""}">Settings</a>
      </nav>
    </header>
    <main>
      ${content}
    </main>
  </div>
</body>
</html>`;
}
