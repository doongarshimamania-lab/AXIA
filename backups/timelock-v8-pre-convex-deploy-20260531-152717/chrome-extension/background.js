// TIMELock Chrome Extension - Background Service Worker
// Manages extension state, token validation, and evidence collection

// Extension state
let state = {
  isConnected: false,
  convexUrl: null,
  token: null,
  userId: null,
  evidenceSessionId: null,
  isCollecting: false,
  eventBuffer: [],
  lastFlush: Date.now(),
};

// Constants
const FLUSH_INTERVAL = 5000; // 5 seconds
const MAX_BUFFER_SIZE = 100;

// Initialize state from storage
chrome.storage.local.get(['state'], (result) => {
  if (result.state) {
    state = { ...state, ...result.state };
    console.log('TIMELock: State restored from storage:', state);
  }
});

// Save state to storage
function saveState() {
  chrome.storage.local.set({ state }, () => {
    console.log('TIMELock: State saved to storage');
  });
}

// Detect current platform from URL
function detectPlatform(url) {
  if (!url) return 'client';
  const urlLower = url.toLowerCase();
  if (urlLower.includes('upwork.com')) return 'upwork';
  if (urlLower.includes('fiverr.com')) return 'fiverr';
  if (urlLower.includes('toptal.com')) return 'toptal';
  if (urlLower.includes('freelancer.com')) return 'freelancer';
  return 'client';
}

// Buffer and flush events
function bufferEvent(event) {
  state.eventBuffer.push(event);
  
  if (state.eventBuffer.length >= MAX_BUFFER_SIZE || Date.now() - state.lastFlush >= FLUSH_INTERVAL) {
    flushEvents();
  }
}

async function flushEvents() {
  if (state.eventBuffer.length === 0 || !state.isCollecting || !state.evidenceSessionId) {
    return;
  }

  const eventsToSend = [...state.eventBuffer];
  state.eventBuffer = [];
  state.lastFlush = Date.now();

  try {
    // CRITICAL: Convert .convex.cloud to .convex.site for HTTP Actions
    const httpActionsUrl = state.convexUrl.replace('.convex.cloud', '.convex.site');
    const recordUrl = `${httpActionsUrl}/api/extension/record`;
    
    const response = await fetch(recordUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: state.token,
        evidenceSessionId: state.evidenceSessionId,
        events: eventsToSend,
      }),
    });

    if (!response.ok) {
      console.error('TIMELock: Failed to flush events:', response.status);
      // Re-add events to buffer on failure
      state.eventBuffer.unshift(...eventsToSend);
    } else {
      console.log(`TIMELock: Flushed ${eventsToSend.length} events`);
    }
  } catch (error) {
    console.error('TIMELock: Error flushing events:', error);
    // Re-add events to buffer on error
    state.eventBuffer.unshift(...eventsToSend);
  }
}

// Handle connection
async function handleConnect(pairingCode) {
  console.log('TIMELock: Connecting with pairing code...');
  
  // Parse pairing code: format is "convexUrl::token"
  const parts = pairingCode.split('::');
  if (parts.length !== 2) {
    throw new Error('Invalid pairing code format. Expected: convexUrl::token');
  }

  let convexUrl = parts[0].trim();
  const token = parts[1].trim();

  // Remove trailing slash from convexUrl if present
  if (convexUrl.endsWith('/')) {
    convexUrl = convexUrl.slice(0, -1);
  }

  console.log('TIMELock: Extracted from pairing code:', {
    convexUrl,
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 8) + '...',
    tokenSuffix: '...' + token.substring(token.length - 8),
    isHex: /^[0-9a-f]+$/i.test(token),
    fullTokenForDebug: token // TEMPORARY: Remove after debugging
  });

  // CRITICAL: Convert .convex.cloud to .convex.site for HTTP Actions
  const httpActionsUrl = convexUrl.replace('.convex.cloud', '.convex.site');
  const validateUrl = `${httpActionsUrl}/api/extension/validate`;
  
  console.log('TIMELock: Validation request details:', {
    originalConvexUrl: convexUrl,
    httpActionsUrl: httpActionsUrl,
    validateUrl: validateUrl,
    method: 'POST',
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 8) + '...'
  });

  // Validate token with backend
  try {
    const validateResponse = await fetch(validateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    console.log('TIMELock: Validation response details:', {
      status: validateResponse.status,
      statusText: validateResponse.statusText,
      headers: Object.fromEntries(validateResponse.headers.entries()),
      url: validateResponse.url
    });

    // ENHANCED: Read response body once and log it
    const responseText = await validateResponse.text();
    console.log('TIMELock: Raw response body:', {
      content: responseText,
      firstChars: responseText.substring(0, 100),
      isEmpty: responseText.length === 0,
      lastChars: responseText.substring(Math.max(0, responseText.length - 100)),
      length: responseText.length
    });

    if (!validateResponse.ok) {
      // ENHANCED: Better error handling for non-OK responses
      let errorData;
      try {
        errorData = responseText ? JSON.parse(responseText) : { error: 'Empty response body from server' };
      } catch (parseError) {
        console.error('TIMELock: Failed to parse error response:', parseError);
        throw new Error(`Token validation failed: ${validateResponse.status}. Response body: ${responseText}`);
      }
      throw new Error(errorData.error || `Token validation failed: ${validateResponse.status}`);
    }

    // ENHANCED: Parse success response with better error handling
    let data;
    try {
      if (!responseText || responseText.length === 0) {
        throw new Error('Empty response body from server');
      }
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('TIMELock: Failed to parse success response:', parseError);
      throw new Error(`Invalid JSON response from server: ${responseText}`);
    }

    if (!data.userId) {
      throw new Error('Invalid response: missing userId');
    }

    // Update state
    state.isConnected = true;
    state.convexUrl = convexUrl; // Store original .convex.cloud URL
    state.token = token;
    state.userId = data.userId;
    saveState();

    console.log('TIMELock: Connected successfully:', {
      userId: data.userId,
      convexUrl: convexUrl
    });

    return { success: true, userId: data.userId };
  } catch (error) {
    console.error('TIMELock: Connection error:', error);
    throw error;
  }
}

// Start evidence collection
async function startEvidenceCollection() {
  if (!state.isConnected || state.isCollecting) {
    console.log('TIMELock: Cannot start collection - not connected or already collecting');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const platform = detectPlatform(tab?.url);
    const sessionId = `session_${Date.now()}`;

    // CRITICAL: Convert .convex.cloud to .convex.site for HTTP Actions
    const httpActionsUrl = state.convexUrl.replace('.convex.cloud', '.convex.site');
    const startUrl = `${httpActionsUrl}/api/extension/start`;

    const response = await fetch(startUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: state.token,
        sessionId,
        platform,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start evidence session: ${response.status}`);
    }

    const data = await response.json();
    state.evidenceSessionId = data.evidenceSessionId;
    state.isCollecting = true;
    saveState();

    console.log('TIMELock: Evidence collection started:', {
      sessionId,
      evidenceSessionId: data.evidenceSessionId,
      platform,
    });

    // Start periodic flush
    chrome.alarms.create('flushEvents', { periodInMinutes: 1 });
  } catch (error) {
    console.error('TIMELock: Failed to start evidence collection:', error);
  }
}

// Stop evidence collection
async function stopEvidenceCollection() {
  if (!state.isCollecting) {
    return;
  }

  // Flush remaining events
  await flushEvents();

  try {
    // CRITICAL: Convert .convex.cloud to .convex.site for HTTP Actions
    const httpActionsUrl = state.convexUrl.replace('.convex.cloud', '.convex.site');
    const finalizeUrl = `${httpActionsUrl}/api/extension/finalize`;

    await fetch(finalizeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: state.token,
        evidenceSessionId: state.evidenceSessionId,
      }),
    });

    console.log('TIMELock: Evidence collection finalized');
  } catch (error) {
    console.error('TIMELock: Failed to finalize evidence session:', error);
  }

  state.isCollecting = false;
  state.evidenceSessionId = null;
  chrome.alarms.clear('flushEvents');
  saveState();
}

// Handle disconnect
function handleDisconnect() {
  stopEvidenceCollection();
  state = {
    isConnected: false,
    convexUrl: null,
    token: null,
    userId: null,
    evidenceSessionId: null,
    isCollecting: false,
    eventBuffer: [],
    lastFlush: Date.now(),
  };
  saveState();
  console.log('TIMELock: Disconnected');
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('TIMELock: Received message:', message.type);

  if (message.type === 'CONNECT') {
    handleConnect(message.pairingCode)
      .then((result) => {
        sendResponse(result);
        startEvidenceCollection();
      })
      .catch((error) => {
        console.error('TIMELock: Connection error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === 'DISCONNECT') {
    handleDisconnect();
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_STATE') {
    sendResponse({ state });
    return true;
  }

  if (message.type === 'EVIDENCE_EVENT') {
    if (state.isCollecting) {
      bufferEvent(message.event);
    }
    sendResponse({ success: true });
    return true;
  }

  console.warn('TIMELock: Unknown message type:', message.type);
  sendResponse({ success: false, error: 'Unknown message type' });
  return true;
});

// Periodic event flush
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'flushEvents') {
    flushEvents();
  }
});

// Handle tab updates to detect platform changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && state.isCollecting) {
    const platform = detectPlatform(changeInfo.url);
    bufferEvent({
      t: Date.now(),
      kind: 'platform_status',
      data: { platform },
      url: changeInfo.url,
    });
  }
});

console.log('TIMELock: Background service worker initialized');
