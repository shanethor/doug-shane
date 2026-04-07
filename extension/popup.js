// popup.js — AURA Connect LinkedIn Extension popup controller

document.addEventListener("DOMContentLoaded", async () => {
  const setupView = document.getElementById("setup-view");
  const connectedView = document.getElementById("connected-view");
  const statusBox = document.getElementById("status-box");
  const connectedStatus = document.getElementById("connected-status");
  const lastSyncTime = document.getElementById("last-sync-time");
  const syncLog = document.getElementById("sync-log");

  // Load saved state
  const stored = await chrome.storage.local.get(["aura_supabase_url", "aura_jwt", "aura_last_sync", "aura_sync_log"]);

  if (stored.aura_jwt && stored.aura_supabase_url) {
    showConnected(stored);
  }

  function showConnected(data) {
    setupView.style.display = "none";
    connectedView.style.display = "block";
    if (data.aura_last_sync) {
      lastSyncTime.textContent = `Last synced: ${new Date(data.aura_last_sync).toLocaleString()}`;
    }
  }

  // Save & initial sync
  document.getElementById("save-btn").addEventListener("click", async () => {
    const url = document.getElementById("supabase-url").value.trim();
    const jwt = document.getElementById("jwt-token").value.trim();
    if (!url || !jwt) {
      statusBox.innerHTML = "<strong>⚠ Fill in both fields</strong>";
      statusBox.className = "status disconnected";
      return;
    }

    statusBox.innerHTML = "<strong>Connecting...</strong>";
    statusBox.className = "status syncing";

    await chrome.storage.local.set({ aura_supabase_url: url, aura_jwt: jwt });

    // Trigger sync via background
    chrome.runtime.sendMessage({ action: "sync_now" }, (resp) => {
      if (resp?.success) {
        chrome.storage.local.get(["aura_last_sync"], (d) => showConnected(d));
      } else {
        statusBox.innerHTML = `<strong>⚠ Sync failed</strong> — ${resp?.error || "Check credentials"}`;
        statusBox.className = "status disconnected";
      }
    });
  });

  // Manual sync
  document.getElementById("sync-now-btn").addEventListener("click", () => {
    connectedStatus.innerHTML = "<strong>⟳ Syncing...</strong>";
    connectedStatus.className = "status syncing";
    chrome.runtime.sendMessage({ action: "sync_now" }, (resp) => {
      if (resp?.success) {
        connectedStatus.innerHTML = `<strong>✓ Synced ${resp.posts || 0} posts</strong>`;
        connectedStatus.className = "status connected";
        lastSyncTime.textContent = `Last synced: ${new Date().toLocaleString()}`;
      } else {
        connectedStatus.innerHTML = `<strong>⚠ ${resp?.error || "Sync failed"}</strong>`;
        connectedStatus.className = "status disconnected";
      }
    });
  });

  // View log
  document.getElementById("view-log-btn").addEventListener("click", async () => {
    const data = await chrome.storage.local.get(["aura_sync_log"]);
    syncLog.style.display = syncLog.style.display === "none" ? "block" : "none";
    syncLog.textContent = data.aura_sync_log || "No sync log yet.";
  });

  // Disconnect
  document.getElementById("disconnect-btn").addEventListener("click", async () => {
    await chrome.storage.local.remove(["aura_jwt", "aura_supabase_url", "aura_last_sync", "aura_sync_log"]);
    setupView.style.display = "block";
    connectedView.style.display = "none";
    statusBox.innerHTML = "<strong>Disconnected</strong>";
    statusBox.className = "status disconnected";
  });
});
