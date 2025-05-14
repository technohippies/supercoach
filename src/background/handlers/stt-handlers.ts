console.log('[stt-handlers.ts] Loaded');

// Placeholder for checking model files (e.g., in Cache API)
async function checkMoonshineModelFiles(): Promise<boolean> {
  console.log('[stt-handlers.ts] checkMoonshineModelFiles: Checking for model files (placeholder)...');
  // TODO: Implement actual check against Cache API or IndexedDB
  // For now, simulate model not being downloaded
  return Promise.resolve(false); 
}

// Placeholder for downloading model files
async function downloadMoonshineModelFiles(): Promise<void> {
  console.log('[stt-handlers.ts] downloadMoonshineModelFiles: Starting download (placeholder)...');
  // Simulate download progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += 20;
    if (progress <= 100) {
      console.log(`[stt-handlers.ts] Download progress: ${progress}%`);
      // Send progress to all relevant UI parts (e.g., settings page)
      browser.runtime.sendMessage({ type: 'MOONSHINE_DOWNLOAD_PROGRESS', progress: progress })
        .catch(e => console.warn('[stt-handlers.ts] Error sending progress update:', e));
    }
    if (progress >= 100) {
      clearInterval(interval);
      console.log('[stt-handlers.ts] Model download complete (placeholder).');
      // TODO: Actually store the model files
      // Send final status update
      browser.runtime.sendMessage({ type: 'MOONSHINE_MODEL_STATUS_RESPONSE', status: 'downloaded' })
        .catch(e => console.warn('[stt-handlers.ts] Error sending download complete status:', e));
      // The original sendResponse for the DOWNLOAD_MOONSHINE_MODEL message itself can be simple acknowledgement
      // sendResponse({ success: true, message: "Download process finished." }); 
      // However, typically the message that initiated this is fire-and-forget, progress is sent via separate messages.
    }
  }, 500); // Simulate 2.5 second download
}


browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[stt-handlers.ts] Received message:', message);

  if (message.type === 'GET_MOONSHINE_MODEL_STATUS') {
    console.log('[stt-handlers.ts] Handling GET_MOONSHINE_MODEL_STATUS');
    sendResponse({ received: true, message: "Status check initiated." }); // Acknowledge receipt
    checkMoonshineModelFiles()
      .then(isDownloaded => {
        const status = isDownloaded ? 'downloaded' : 'not-downloaded';
        console.log(`[stt-handlers.ts] Responding to GET_MOONSHINE_MODEL_STATUS with: ${status}`);
        // sendResponse({ type: 'MOONSHINE_MODEL_STATUS_RESPONSE', status: status }); // This is what SettingsPage expects
        // Important: To send to the original caller, use sendResponse.
        // To broadcast to any listener (like SettingsPage having its own listener), use browser.runtime.sendMessage.
        // SettingsPage.tsx has its own listener, so we use runtime.sendMessage for async updates.
        browser.runtime.sendMessage({ type: 'MOONSHINE_MODEL_STATUS_RESPONSE', status: status })
            .catch(e => console.warn('[stt-handlers.ts] Error sending status response:', e));
        // If the message sender expects a direct response via sendResponse, ensure it's called.
        // For this specific message, SettingsPage doesn't strictly rely on sendResponse for this, 
        // but it's good practice if the sender might await it.
        // sendResponse({ immediateStatusCheck: status }); // Example if direct response was needed.
      })
      .catch(error => {
        console.error('[stt-handlers.ts] Error checking model status:', error);
        browser.runtime.sendMessage({ type: 'MOONSHINE_MODEL_STATUS_RESPONSE', status: 'error' })
            .catch(e => console.warn('[stt-handlers.ts] Error sending error status response:', e));
        // sendResponse({ error: 'Failed to check model status' });
      });
    return true; // Indicates that sendResponse will be called asynchronously
  }

  if (message.type === 'DOWNLOAD_MOONSHINE_MODEL') {
    console.log('[stt-handlers.ts] Handling DOWNLOAD_MOONSHINE_MODEL');
    sendResponse({ received: true, message: "Download process initiated." }); // Acknowledge receipt
    downloadMoonshineModelFiles() // Removed sendResponse from here as it was not used by the function as designed
      .then(() => {
        console.log('[stt-handlers.ts] downloadMoonshineModelFiles promise resolved.');
        // No need for sendResponse here if main job is done via separate messages
      })
      .catch(error => {
        console.error('[stt-handlers.ts] Error initiating model download:', error);
        // sendResponse({ success: false, error: 'Failed to initiate download' });
        browser.runtime.sendMessage({ type: 'MOONSHINE_MODEL_STATUS_RESPONSE', status: 'error' })
            .catch(e => console.warn('[stt-handlers.ts] Error sending download error status:', e));
      });
    return true; // Indicates that sendResponse will be called asynchronously (or not at all if broadcasting)
  }

  // Return false or undefined if sendResponse is not called or not called asynchronously
  // return false;
});

export {}; // Make this a module if no other exports are present yet 