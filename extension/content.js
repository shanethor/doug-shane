// content.js — AURA Connect LinkedIn Extension content script
// Scrapes private analytics from LinkedIn's voyager API using the user's active session

(function () {
  "use strict";

  // Listen for gather requests from background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "gather_data") {
      gatherAnalytics().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
      return true;
    }
  });

  // Auto-gather when user visits their analytics page
  if (window.location.pathname.includes("/analytics/") || window.location.pathname.includes("/dashboard/")) {
    setTimeout(() => gatherAnalytics(), 2000);
  }

  async function gatherAnalytics() {
    try {
      const csrfToken = getCookie("JSESSIONID")?.replace(/"/g, "");
      if (!csrfToken) {
        console.log("[aura-ext] No LinkedIn session found — user not logged in");
        return;
      }

      const profile = await fetchProfile(csrfToken);
      const posts = await fetchPosts(csrfToken, profile?.publicIdentifier);

      chrome.runtime.sendMessage({
        action: "content_data",
        profile: profile ? {
          linkedin_url: `https://www.linkedin.com/in/${profile.publicIdentifier}`,
          name: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
          headline: profile.headline || "",
          follower_count: profile.followersCount || 0,
          connection_count: profile.connectionsCount || 0,
          photo_url: profile.profilePicture?.displayImageUrl || null,
        } : null,
        posts,
      });

      console.log(`[aura-ext] Gathered ${posts.length} posts with analytics`);
    } catch (err) {
      console.error("[aura-ext] Error gathering analytics:", err);
    }
  }

  async function fetchProfile(csrf) {
    try {
      const resp = await fetch("https://www.linkedin.com/voyager/api/me", {
        headers: {
          "csrf-token": csrf,
          "accept": "application/vnd.linkedin.normalized+json+2.1",
        },
        credentials: "include",
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      // Extract from the normalized format
      const miniProfile = data.included?.find(i => i.$type === "com.linkedin.voyager.identity.shared.MiniProfile");
      const fullProfile = data.data || {};
      return {
        publicIdentifier: miniProfile?.publicIdentifier || fullProfile.publicIdentifier,
        firstName: miniProfile?.firstName || fullProfile.firstName,
        lastName: miniProfile?.lastName || fullProfile.lastName,
        headline: miniProfile?.occupation || fullProfile.headline,
        followersCount: fullProfile.followersCount || 0,
        connectionsCount: fullProfile.connectionsCount || 0,
        profilePicture: miniProfile?.picture || null,
      };
    } catch (e) {
      console.warn("[aura-ext] Profile fetch failed:", e);
      return null;
    }
  }

  async function fetchPosts(csrf, publicIdentifier) {
    const posts = [];
    try {
      // Use the dashboard analytics endpoint
      const resp = await fetch(
        `https://www.linkedin.com/voyager/api/identity/profileUpdatesV2?q=authorsWithAnalytics&author=urn:li:fsd_profile:${publicIdentifier || "me"}&count=20&start=0`,
        {
          headers: {
            "csrf-token": csrf,
            "accept": "application/vnd.linkedin.normalized+json+2.1",
          },
          credentials: "include",
        }
      );

      if (!resp.ok) {
        // Fallback: try the feed endpoint
        return await fetchPostsFallback(csrf);
      }

      const data = await resp.json();
      const elements = data.included || [];

      for (const el of elements) {
        if (el.$type !== "com.linkedin.voyager.feed.shared.UpdateV2" && !el.commentary) continue;

        const analytics = el.socialDetail || {};
        const postData = {
          external_post_id: el.urn || el.entityUrn || `ext_${Date.now()}_${Math.random()}`,
          post_url: el.permaLink || null,
          text: el.commentary?.text?.text || el.commentary || "",
          format: detectFormat(el),
          posted_at: el.actor?.subDescription?.text || null,
          likes: analytics.totalSocialActivityCounts?.numLikes || 0,
          comments: analytics.totalSocialActivityCounts?.numComments || 0,
          reposts: analytics.totalSocialActivityCounts?.numShares || 0,
          views: analytics.totalSocialActivityCounts?.numViews || el.numImpressions || null,
          impressions: el.numImpressions || analytics.numImpressions || null,
          engagement_rate: null,
        };

        // Calculate engagement rate if we have impressions
        if (postData.impressions && postData.impressions > 0) {
          const engagements = postData.likes + postData.comments + postData.reposts;
          postData.engagement_rate = parseFloat(((engagements / postData.impressions) * 100).toFixed(2));
        }

        posts.push(postData);
      }
    } catch (e) {
      console.warn("[aura-ext] Posts fetch failed:", e);
    }
    return posts;
  }

  async function fetchPostsFallback(csrf) {
    // Simple fallback: scrape visible posts from the DOM
    const posts = [];
    const feedItems = document.querySelectorAll('[data-urn*="activity"], .feed-shared-update-v2');
    for (const item of feedItems) {
      const text = item.querySelector('.feed-shared-text, .update-components-text')?.textContent?.trim() || "";
      const likesEl = item.querySelector('[data-test-id="social-actions__reactions-count"], .social-details-social-counts__reactions-count');
      const commentsEl = item.querySelector('[data-test-id="social-actions__comments"], .social-details-social-counts__comments');

      posts.push({
        external_post_id: item.dataset.urn || `dom_${Date.now()}_${Math.random()}`,
        text: text.substring(0, 500),
        format: "text",
        likes: parseInt(likesEl?.textContent?.replace(/\D/g, "") || "0"),
        comments: parseInt(commentsEl?.textContent?.replace(/\D/g, "") || "0"),
        reposts: 0,
        views: null,
        impressions: null,
      });
    }
    return posts;
  }

  function detectFormat(el) {
    if (el.content?.articleComponent) return "article";
    if (el.content?.carouselComponent) return "carousel";
    if (el.content?.videoComponent) return "video";
    if (el.content?.imageComponent) return "image";
    return "text";
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
  }
})();
