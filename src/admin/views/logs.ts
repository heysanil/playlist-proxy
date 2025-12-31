import { layout } from "./layout";

export function logsPage(): string {
    const content = `
    <div class="card">
      <div class="card-header">
        <h2>HTTP Logs</h2>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span class="badge" id="connection-status">Connecting...</span>
          <button class="btn btn-sm btn-ghost" id="clear-logs">Clear</button>
          <button class="btn btn-sm btn-ghost" id="pause-btn">Pause</button>
        </div>
      </div>

      <div id="logs-container" class="logs-container">
        <div class="empty-state" id="empty-logs">
          <p>No logs yet. HTTP requests will appear here in real-time.</p>
        </div>
      </div>
    </div>

    <style>
      .logs-container {
        max-height: 70vh;
        overflow-y: auto;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
        font-size: 0.75rem;
        background: var(--bg);
        border-radius: var(--radius);
        padding: 0.5rem;
      }

      .log-entry {
        display: grid;
        grid-template-columns: 80px 45px 55px 1fr 60px;
        gap: 0.75rem;
        padding: 0.375rem 0.5rem;
        border-bottom: 1px solid var(--border);
        align-items: center;
      }

      .log-entry:hover {
        background: var(--bg-secondary);
      }

      .log-timestamp {
        color: var(--text-muted);
      }

      .log-method {
        font-weight: 600;
        text-transform: uppercase;
      }

      .log-status {
        font-weight: 600;
        padding: 0.125rem 0.375rem;
        border-radius: 3px;
        text-align: center;
      }

      .log-status.status-2xx {
        color: var(--success);
        background: rgba(34, 197, 94, 0.1);
      }

      .log-status.status-3xx {
        color: #22d3ee;
        background: rgba(34, 211, 238, 0.1);
      }

      .log-status.status-4xx {
        color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
      }

      .log-status.status-5xx {
        color: var(--danger);
        background: rgba(239, 68, 68, 0.1);
      }

      .log-path {
        color: var(--text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .log-duration {
        color: var(--text-muted);
        text-align: right;
      }

      #connection-status.connected {
        background: rgba(34, 197, 94, 0.2);
        color: var(--success);
      }

      #connection-status.disconnected {
        background: rgba(239, 68, 68, 0.2);
        color: var(--danger);
      }

      #pause-btn.paused {
        background: var(--accent);
        color: white;
      }
    </style>

    <script>
      (function() {
        let eventSource = null;
        let isPaused = false;
        let pendingLogs = [];
        const MAX_LOGS = 500;

        function getStatusClass(status) {
          if (status >= 500) return 'status-5xx';
          if (status >= 400) return 'status-4xx';
          if (status >= 300) return 'status-3xx';
          return 'status-2xx';
        }

        function formatDuration(ms) {
          if (ms < 1000) return ms.toFixed(0) + 'ms';
          return (ms / 1000).toFixed(2) + 's';
        }

        function formatTimestamp(isoString) {
          return isoString.slice(11, 23);
        }

        function createLogEntry(entry) {
          const logEl = document.createElement('div');
          logEl.className = 'log-entry';

          const timestamp = document.createElement('span');
          timestamp.className = 'log-timestamp';
          timestamp.textContent = formatTimestamp(entry.timestamp);

          const method = document.createElement('span');
          method.className = 'log-method';
          method.textContent = entry.method;

          const status = document.createElement('span');
          status.className = 'log-status ' + getStatusClass(entry.status);
          status.textContent = entry.status;

          const path = document.createElement('span');
          path.className = 'log-path';
          path.textContent = entry.path;
          path.title = entry.path;

          const duration = document.createElement('span');
          duration.className = 'log-duration';
          duration.textContent = formatDuration(entry.duration);

          logEl.appendChild(timestamp);
          logEl.appendChild(method);
          logEl.appendChild(status);
          logEl.appendChild(path);
          logEl.appendChild(duration);

          return logEl;
        }

        function addLogEntry(entry) {
          const container = document.getElementById('logs-container');
          const emptyState = document.getElementById('empty-logs');

          if (emptyState) {
            emptyState.remove();
          }

          const logEl = createLogEntry(entry);
          container.appendChild(logEl);

          // Remove old entries if we exceed max
          while (container.children.length > MAX_LOGS) {
            container.removeChild(container.firstChild);
          }

          // Auto-scroll to bottom
          container.scrollTop = container.scrollHeight;
        }

        function connectSSE() {
          const statusEl = document.getElementById('connection-status');
          statusEl.textContent = 'Connecting...';
          statusEl.className = 'badge';

          eventSource = new EventSource('/admin/logs/stream');

          eventSource.onopen = function() {
            statusEl.textContent = 'Live';
            statusEl.className = 'badge connected';
          };

          eventSource.onmessage = function(event) {
            const entry = JSON.parse(event.data);
            if (isPaused) {
              pendingLogs.push(entry);
              if (pendingLogs.length > MAX_LOGS) {
                pendingLogs.shift();
              }
            } else {
              addLogEntry(entry);
            }
          };

          eventSource.onerror = function() {
            statusEl.textContent = 'Disconnected';
            statusEl.className = 'badge disconnected';
            eventSource.close();
            // Reconnect after 3 seconds
            setTimeout(connectSSE, 3000);
          };
        }

        function clearLogs() {
          const container = document.getElementById('logs-container');
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          const emptyState = document.createElement('div');
          emptyState.className = 'empty-state';
          emptyState.id = 'empty-logs';
          const p = document.createElement('p');
          p.textContent = 'No logs yet. HTTP requests will appear here in real-time.';
          emptyState.appendChild(p);
          container.appendChild(emptyState);
          pendingLogs = [];
        }

        function togglePause() {
          const btn = document.getElementById('pause-btn');
          isPaused = !isPaused;

          if (isPaused) {
            btn.textContent = 'Resume';
            btn.classList.add('paused');
          } else {
            btn.textContent = 'Pause';
            btn.classList.remove('paused');
            // Add any pending logs
            pendingLogs.forEach(addLogEntry);
            pendingLogs = [];
          }
        }

        // Attach event listeners
        document.getElementById('clear-logs').addEventListener('click', clearLogs);
        document.getElementById('pause-btn').addEventListener('click', togglePause);

        // Connect on page load
        connectSSE();

        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
          if (eventSource) {
            eventSource.close();
          }
        });
      })();
    </script>
  `;

    return layout("Logs", content, "/admin/logs");
}
