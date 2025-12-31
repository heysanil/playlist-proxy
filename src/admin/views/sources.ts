import type { DbSource } from "../../db/sources";
import { layout } from "./layout";

export function sourcesPage(sources: DbSource[], baseUrl: string): string {
    const content = `
    <div class="card">
      <div class="card-header">
        <h2>Sources</h2>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('add-form').style.display = 'block'; this.style.display = 'none';">
          + Add Source
        </button>
      </div>

      <form id="add-form" style="display: none; margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius);"
            hx-post="/admin/sources"
            hx-target="#sources-list"
            hx-swap="innerHTML"
            hx-on::after-request="if(event.detail.successful) { this.reset(); this.style.display = 'none'; document.querySelector('.card-header button').style.display = 'inline-flex'; }">
        <div class="grid-2">
          <div class="form-group">
            <label for="name">Source Name</label>
            <input type="text" id="name" name="name" placeholder="iptv" required pattern="[a-z0-9-]+" title="Lowercase letters, numbers, and dashes only">
          </div>
          <div class="form-group">
            <label for="m3u_url">M3U URL</label>
            <input type="url" id="m3u_url" name="m3u_url" placeholder="https://example.com/playlist.m3u" required>
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label for="epg_url">EPG URL (optional)</label>
            <input type="url" id="epg_url" name="epg_url" placeholder="https://example.com/epg.xml">
          </div>
          <div class="form-group">
            <label for="channel_renumber_type">Channel Renumbering</label>
            <select id="channel_renumber_type" name="channel_renumber_type" onchange="document.getElementById('renumber-value').style.display = this.value === 'none' ? 'none' : 'block'">
              <option value="none">None</option>
              <option value="starting-index">Starting Index</option>
              <option value="addition">Addition</option>
            </select>
          </div>
        </div>
        <div id="renumber-value" class="form-group" style="display: none;">
          <label for="channel_renumber_value">Renumber Value</label>
          <input type="number" id="channel_renumber_value" name="channel_renumber_value" placeholder="100">
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button type="submit" class="btn btn-primary btn-sm">Add Source</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('form').style.display = 'none'; document.querySelector('.card-header button').style.display = 'inline-flex';">Cancel</button>
        </div>
      </form>

      <div id="sources-list">
        ${sourcesList(sources, baseUrl)}
      </div>
    </div>
  `;

    return layout("Sources", content, "/admin");
}

export function sourcesList(sources: DbSource[], baseUrl: string): string {
    if (sources.length === 0) {
        return `
      <div class="empty-state">
        <p>No sources configured yet.</p>
        <p style="margin-top: 0.5rem; font-size: 0.875rem;">Click "Add Source" to get started.</p>
      </div>
    `;
    }

    return sources.map((source) => sourceItem(source, baseUrl)).join("");
}

export function sourceItem(source: DbSource, baseUrl: string): string {
    const m3uUrl = `${baseUrl}${source.name}/playlist.m3u`;
    const epgUrl = source.epg_url ? `${baseUrl}${source.name}/epg.xml` : null;

    let renumberBadge = "";
    if (source.channel_renumber_type === "starting-index") {
        renumberBadge = `<span class="badge">Start: ${source.channel_renumber_value}</span>`;
    } else if (source.channel_renumber_type === "addition") {
        renumberBadge = `<span class="badge">+${source.channel_renumber_value}</span>`;
    }

    return `
    <div class="source-item" id="source-${source.id}">
      <div class="source-info" style="flex: 1;">
        <h3>${source.name} ${renumberBadge}</h3>
        <p>M3U: ${source.m3u_url}</p>
        ${source.epg_url ? `<p>EPG: ${source.epg_url}</p>` : ""}
        <div class="url-display">
          <strong>Proxy URLs:</strong><br>
          M3U: <a href="${m3uUrl}" target="_blank">${m3uUrl}</a><br>
          ${epgUrl ? `EPG: <a href="${epgUrl}" target="_blank">${epgUrl}</a>` : ""}
        </div>
      </div>
      <div class="source-actions">
        <button class="btn btn-ghost btn-sm"
                hx-get="/admin/sources/${source.id}/edit"
                hx-target="#source-${source.id}"
                hx-swap="outerHTML">
          Edit
        </button>
        <button class="btn btn-danger btn-sm"
                hx-delete="/admin/sources/${source.id}"
                hx-target="#sources-list"
                hx-swap="innerHTML"
                hx-confirm="Are you sure you want to delete '${source.name}'?">
          Delete
        </button>
      </div>
    </div>
  `;
}

export function sourceEditForm(source: DbSource, baseUrl: string): string {
    return `
    <div class="source-item" id="source-${source.id}">
      <form style="flex: 1;"
            hx-put="/admin/sources/${source.id}"
            hx-target="#source-${source.id}"
            hx-swap="outerHTML">
        <div class="grid-2" style="margin-bottom: 1rem;">
          <div class="form-group">
            <label>Source Name</label>
            <input type="text" name="name" value="${source.name}" required pattern="[a-z0-9-]+">
          </div>
          <div class="form-group">
            <label>M3U URL</label>
            <input type="url" name="m3u_url" value="${source.m3u_url}" required>
          </div>
        </div>
        <div class="grid-2" style="margin-bottom: 1rem;">
          <div class="form-group">
            <label>EPG URL</label>
            <input type="url" name="epg_url" value="${source.epg_url || ""}">
          </div>
          <div class="form-group">
            <label>Channel Renumbering</label>
            <select name="channel_renumber_type" onchange="this.closest('form').querySelector('#edit-renumber-value').style.display = this.value === 'none' ? 'none' : 'block'">
              <option value="none" ${source.channel_renumber_type === "none" ? "selected" : ""}>None</option>
              <option value="starting-index" ${source.channel_renumber_type === "starting-index" ? "selected" : ""}>Starting Index</option>
              <option value="addition" ${source.channel_renumber_type === "addition" ? "selected" : ""}>Addition</option>
            </select>
          </div>
        </div>
        <div id="edit-renumber-value" class="form-group" style="display: ${source.channel_renumber_type === "none" ? "none" : "block"}; margin-bottom: 1rem;">
          <label>Renumber Value</label>
          <input type="number" name="channel_renumber_value" value="${source.channel_renumber_value || ""}">
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
          <button type="button" class="btn btn-ghost btn-sm"
                  hx-get="/admin/sources/${source.id}"
                  hx-target="#source-${source.id}"
                  hx-swap="outerHTML">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `;
}
