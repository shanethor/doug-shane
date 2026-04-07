// background.js — AURA Connect LinkedIn Extension service worker
// Handles sync requests and periodic background sync

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "sync_now") {
    handleSync().then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
    return true; // async response
  }

  if (msg.action === "content_data") {
    // Data from content script
    chrome.storage.local.set({ aura_pending_posts: msg.posts, aura_pending_profile: msg.profile });
    handleSync().then(() => {}).catch(console.error);
  }
});

// Periodic sync every 6 hours
chrome.alarms.create("linkedin-sync", { periodInMinutes: 360 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "linkedin-sync") {
    handleSync().catch(console.error);
  }
});

async function handleSync() {
  const stored = await chrome.storage.local.get([
    "aura_supabase_url", "aura_jwt",
    "aura_pending_posts", "aura_pending_profile"
  ]);

  if (!stored.aura_supabase_url || !stored.aura_jwt) {
    return { success: false, error: "Not configured" };
  }

  const posts = stored.aura_pending_posts || [];
  const profile = stored.aura_pending_profile || null;

  if (posts.length === 0 && !profile) {
    // Try to trigger content script to gather data
    try {
      const tabs = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
      if (tabs.length > 0) {
        await chrome.tabs.sendMessage(tabs[0].id, { action: "gather_data" });
        // Wait a moment for content script to respond
        await new Promise(r => setTimeout(r, 3000));
        const fresh = await chrome.storage.local.get(["aura_pending_posts", "aura_pending_profile"]);
        if (fresh.aura_pending_posts?.length > 0 || fresh.aura_pending_profile) {
          return await sendToAura(stored.aura_supabase_url, stored.aura_jwt, fresh.aura_pending_posts || [], fresh.aura_pending_profile);
        }
      }
    } catch (e) {
      console.warn("[aura-ext] Could not trigger content script:", e);
    }
    return { success: true, posts: 0, message: "No LinkedIn tab open — nothing to sync" };
  }

  return await sendToAura(stored.aura_supabase_url, stored.aura_jwt, posts, profile);
}

async function sendToAura(supabaseUrl, jwt, posts, profile) {
  const fnUrl = `${supabaseUrl}/functions/v1/linkedin-ingest`;

  const log = [];
  log.push(`[${new Date().toISOString()}] Sending ${posts.length} posts to AURA...`);

  try {
    const resp = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
      },
      body: JSON.stringify({ posts, profile }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      log.push(`ERROR: ${data.error || resp.status}`);
      await chrome.storage.local.set({ aura_sync_log: log.join("\n") });
      return { success: false, error: data.error || `HTTP ${resp.status}` };
    }

    log.push(`SUCCESS: ${data.posts_ingested} posts ingested`);
    await chrome.storage.local.set({
      aura_last_sync: new Date().toISOString(),
      aura_sync_log: log.join("\n"),
      aura_pending_posts: [],
      aura_pending_profile: null,
    });

    return { success: true, posts: data.posts_ingested };
  } catch (err) {
    log.push(`NETWORK ERROR: ${err.message}`);
    await chrome.storage.local.set({ aura_sync_log: log.join("\n") });
    return { success: false, error: err.message };
  }
}
