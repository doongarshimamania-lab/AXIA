(function() {
  "use strict";

  console.log("TIMELock: Content script loaded");

  const detectPlatform = () => {
    const hostname = window.location.hostname;
    if (hostname.includes("upwork.com")) return "upwork";
    if (hostname.includes("fiverr.com")) return "fiverr";
    if (hostname.includes("toptal.com")) return "toptal";
    if (hostname.includes("freelancer.com")) return "freelancer";
    return null;
  };

  const platform = detectPlatform();
  
  if (!platform) {
    console.log("TIMELock: Not on a supported platform");
    return;
  }

  console.log("TIMELock: Platform detected:", platform);

  chrome.runtime.sendMessage({
    type: "PLATFORM_DETECTED",
    platform: platform
  }).catch(err => console.error("TIMELock: Failed to send platform detection:", err));

  let lastMouseEvent = 0;
  const MOUSE_THROTTLE = 250;

  document.addEventListener("mousemove", (e) => {
    const now = Date.now();
    if (now - lastMouseEvent > MOUSE_THROTTLE) {
      lastMouseEvent = now;
      chrome.runtime.sendMessage({
        type: "EVIDENCE_EVENT",
        event: {
          t: now,
          kind: "mouse",
          data: { x: e.clientX, y: e.clientY },
          url: window.location.href
        }
      }).catch(() => {});
    }
  }, { passive: true });

  let keyboardTimeout;
  const KEYBOARD_DEBOUNCE = 100;

  document.addEventListener("keydown", (e) => {
    clearTimeout(keyboardTimeout);
    keyboardTimeout = setTimeout(() => {
      chrome.runtime.sendMessage({
        type: "EVIDENCE_EVENT",
        event: {
          t: Date.now(),
          kind: "keyboard",
          data: { key: e.key, code: e.code },
          url: window.location.href
        }
      }).catch(() => {});
    }, KEYBOARD_DEBOUNCE);
  }, { passive: true });

  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      chrome.runtime.sendMessage({
        type: "EVIDENCE_EVENT",
        event: {
          t: Date.now(),
          kind: "url",
          data: { url: lastUrl },
          url: lastUrl
        }
      }).catch(() => {});
    }
  });

  urlObserver.observe(document, { subtree: true, childList: true });

  const sendPlatformStatus = () => {
    chrome.runtime.sendMessage({
      type: "EVIDENCE_EVENT",
      event: {
        t: Date.now(),
        kind: "platform_status",
        data: {
          visible: !document.hidden,
          userAgent: navigator.userAgent,
          language: navigator.language,
          timezone: new Date().getTimezoneOffset(),
          screenResolution: screen.width + "x" + screen.height
        },
        url: window.location.href
      }
    }).catch(() => {});
  };

  document.addEventListener("visibilitychange", sendPlatformStatus);
  sendPlatformStatus();

  console.log("TIMELock: Evidence collection started");
})();
