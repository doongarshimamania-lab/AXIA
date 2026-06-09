// TIMELock Chrome Extension - Popup UI Controller
document.addEventListener('DOMContentLoaded', async () => {
  const pairingInput = document.getElementById('pairingInput');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const setupView = document.getElementById('setupView');
  const connectedView = document.getElementById('connectedView');
  const statusText = document.getElementById('statusText');
  const platformText = document.getElementById('platformText');

  // Get current state from background
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  const state = response.state || {};

  // Update UI based on connection state
  if (state.isConnected) {
    setupView.style.display = 'none';
    connectedView.style.display = 'block';
    statusText.textContent = state.isCollecting ? '✅ FULL PROTECTION (Collecting)' : '✅ CONNECTED';
    platformText.textContent = state.platform || 'Unknown';
  } else {
    setupView.style.display = 'block';
    connectedView.style.display = 'none';
  }

  // Auto-paste from clipboard if available
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText && clipboardText.includes('::') && clipboardText.length > 70) {
      pairingInput.value = clipboardText;
      connectBtn.disabled = false;
    }
  } catch (e) {
    // Clipboard access denied, ignore
  }

  // Enable connect button when input has valid format
  pairingInput.addEventListener('input', () => {
    const value = pairingInput.value.trim();
    const parts = value.split('::');
    const isValid = parts.length === 2 && parts[0].length > 0 && parts[1].length === 64;
    connectBtn.disabled = !isValid;
  });

  // Handle connect button click
  connectBtn.addEventListener('click', async () => {
    const pairingCode = pairingInput.value.trim();
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CONNECT',
        pairingCode: pairingCode,
      });

      if (response.success) {
        setupView.style.display = 'none';
        connectedView.style.display = 'block';
        statusText.textContent = '✅ FULL PROTECTION';
        platformText.textContent = response.platform || 'Unknown';
      } else {
        alert('Connection failed: ' + (response.error || 'Unknown error'));
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Extension';
      }
    } catch (error) {
      alert('Connection error: ' + error.message);
      connectBtn.disabled = false;
      connectBtn.textContent = 'Connect Extension';
    }
  });

  // Handle disconnect button click
  disconnectBtn.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'DISCONNECT' });
      connectedView.style.display = 'none';
      setupView.style.display = 'block';
      pairingInput.value = '';
      connectBtn.disabled = true;
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });
});
