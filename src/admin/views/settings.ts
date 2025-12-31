import type { Settings } from "../../db/settings";
import { layout } from "./layout";

export function settingsPage(settings: Settings): string {
    const content = `
    <div class="card">
      <div class="card-header">
        <h2>Settings</h2>
        <span class="badge badge-success" id="save-indicator" style="display: none;">Saved</span>
      </div>

      <form hx-post="/admin/settings"
            hx-swap="none"
            hx-on::after-request="if(event.detail.successful) { const badge = document.getElementById('save-indicator'); badge.style.display = 'inline-block'; setTimeout(() => badge.style.display = 'none', 2000); }">

        <div class="grid-2">
          <div class="form-group">
            <label for="port">Server Port</label>
            <input type="number" id="port" name="port" value="${settings.port}" min="1" max="65535">
          </div>

          <div class="form-group">
            <label for="hostname">Hostname Override</label>
            <input type="text" id="hostname" name="hostname" value="${settings.hostname || ""}" placeholder="Leave empty to use request hostname">
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="protocol">Protocol</label>
            <select id="protocol" name="protocol">
              <option value="http" ${settings.protocol === "http" ? "selected" : ""}>HTTP</option>
              <option value="https" ${settings.protocol === "https" ? "selected" : ""}>HTTPS</option>
            </select>
          </div>

          <div class="form-group">
            <label for="cache_duration">Cache Duration (seconds)</label>
            <input type="number" id="cache_duration" name="cache_duration" value="${settings.cacheDuration}" min="0">
          </div>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" name="proxy_streams" ${settings.proxyStreams ? "checked" : ""} style="width: auto; margin-right: 0.5rem;">
            Proxy stream URLs through this server
          </label>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
            When enabled, stream URLs in playlists will be rewritten to go through this proxy.
            This hides the original stream server from clients but adds latency.
          </p>
        </div>

        <button type="submit" class="btn btn-primary">Save Settings</button>
      </form>
    </div>

    <div class="card" style="margin-top: 1rem;">
      <div class="card-header">
        <h2>Backup & Restore</h2>
      </div>
      <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">
        Export all settings and sources to a JSON file, or import from a previously exported file.
      </p>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <a href="/admin/export" class="btn btn-primary" download="playlist-proxy-config.json">Export Config</a>
        <button type="button" class="btn btn-ghost" id="import-btn">Import Config</button>
        <input type="file" id="import-file" accept=".json" style="display: none;">
      </div>
      <div id="import-status" style="margin-top: 0.5rem; font-size: 0.875rem;"></div>
    </div>

    <div class="card" style="margin-top: 1rem;">
      <h2 style="margin-bottom: 0.5rem;">About</h2>
      <p style="color: var(--text-muted); font-size: 0.875rem;">
        playlist-proxy v1.0.0<br>
        A simple M3U and EPG proxy server with hostname rewriting and channel renumbering.
      </p>
    </div>

    <script>
      (function() {
        const importBtn = document.getElementById('import-btn');
        const importFile = document.getElementById('import-file');
        const importStatus = document.getElementById('import-status');

        importBtn.addEventListener('click', function() {
          importFile.click();
        });

        importFile.addEventListener('change', function(e) {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = function(event) {
            const content = event.target.result;

            fetch('/admin/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: content
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
              if (data.success) {
                importStatus.textContent = 'Import successful! Reloading...';
                importStatus.style.color = 'var(--success)';
                setTimeout(function() { window.location.reload(); }, 1000);
              } else {
                importStatus.textContent = 'Import failed: ' + (data.error || 'Unknown error');
                importStatus.style.color = 'var(--danger)';
              }
            })
            .catch(function(err) {
              importStatus.textContent = 'Import failed: ' + err.message;
              importStatus.style.color = 'var(--danger)';
            });
          };
          reader.readAsText(file);

          // Reset file input
          importFile.value = '';
        });
      })();
    </script>
  `;

    return layout("Settings", content, "/admin/settings");
}
