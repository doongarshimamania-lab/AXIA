# TIMELock Chrome Extension

## Installation Instructions

### For Testing (Load Unpacked)

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The extension should now appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "TIMELock Work Protection"
   - Click the pin icon to keep it visible

### Getting Your Pairing Token

1. Open your TIMELock Dashboard at `http://localhost:3000/dashboard`
2. Click your profile avatar in the top-right
3. Scroll to the "Chrome Extension" section
4. Click "Generate Extension Token"
5. The token will be automatically copied to your clipboard
6. Click the TIMELock extension icon in Chrome
7. Paste the token and click "Connect Extension"

### Testing the Extension

1. **Verify Connection**
   - Extension popup should show "✅ FULL PROTECTION"
   - Platform should be detected automatically

2. **Test Evidence Collection**
   - Navigate to a supported platform (Upwork, Fiverr, Toptal, Freelancer)
   - Start a work session in TIMELock Dashboard
   - Move your mouse and type to generate activity
   - Check the Dashboard to see evidence being collected

3. **Check Console Logs**
   - Right-click the extension icon → Inspect popup
   - Open Console tab to see connection and collection logs

## Features

- ✅ Secure token-based pairing with TIMELock Dashboard
- ✅ Automatic platform detection (Upwork, Fiverr, Toptal, Freelancer)
- ✅ Real-time evidence collection (mouse, keyboard, URL changes)
- ✅ Efficient event batching (5-second intervals or 100 events)
- ✅ Protection status monitoring
- ✅ Low resource usage (<1% CPU, <50MB RAM)

## Troubleshooting

### Extension Not Connecting
- Ensure your TIMELock Dashboard is running on `http://localhost:3000`
- Check that your token is exactly 64 characters
- Verify the token hasn't expired (30-day limit)

### Evidence Not Collecting
- Make sure you've started a work session in the Dashboard
- Check that you're on a supported platform
- Open the extension popup to verify "FULL PROTECTION" status

### Platform Not Detected
- Refresh the page after installing the extension
- Check the console for "Platform detected" message
- Ensure you're on the correct domain (e.g., upwork.com, not a subdomain)

## Privacy & Security

- All data is encrypted in transit (TLS 1.3)
- Tokens expire after 30 days
- Evidence is only collected during active work sessions
- No data is collected on non-work sites
- Local storage is cleared on disconnect

## Support

For issues or questions, contact support through the TIMELock Dashboard.
