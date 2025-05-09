/**
 * This is the main background script for the extension.
 * It orchestrates database initialization, context menu setup, and message handling.
 */
import { defineBackground } from '#imports';
import { ensureDbInitialized } from '../src/services/db/init';
import { seedInitialTags } from '../src/services/db/tags';
import { setupContextMenu } from '../src/background/setup/context-menu-setup';
import { registerMessageHandlers } from '../src/background/handlers/message-handlers';
// import { loadDictionaries } from '../src/background/setup/dictionary-setup'; // Removed

// Import handler registration functions
import { registerContextMenuHandlers } from '../src/background/handlers/context-menu-handler';
// Import storage to check onboarding status
import { userConfigurationStorage } from '../src/services/storage/storage';
// Use WXT's browser namespace
import { browser } from 'wxt/browser';
// Remove the problematic import
// import type { WebNavigation } from 'wxt/browser/webNavigation'; 

// Removed unused import:
// import type { UserConfiguration, RedirectServiceSetting } from '../src/services/storage/types';
// Correct import path for constants
import { REDIRECT_SERVICES } from '../src/shared/constants'; // Only need REDIRECT_SERVICES here now

console.log('[Scarlett BG Entrypoint] Script loaded. Defining background...');

// --- Redirect Logic ---

// Type alias for the details object from onBeforeNavigate listener
type OnBeforeNavigateDetails = Parameters<Parameters<typeof browser.webNavigation.onBeforeNavigate.addListener>[0]>[0];

// Define hostname checks (can be expanded)
const serviceHostChecks: { [key: string]: (host: string) => boolean } = {
    'GitHub': (host) => host.endsWith('github.com'),
    'ChatGPT': (host) => host.endsWith('chatgpt.com') || host.endsWith('chat.openai.com'), // Example, needs adjustment
    'X (Twitter)': (host) => host.endsWith('twitter.com') || host.endsWith('x.com'),
    'Reddit': (host) => host.endsWith('reddit.com') || host.endsWith('redd.it'),
    'Twitch': (host) => host.endsWith('twitch.tv'),
    'YouTube': (host) => host.endsWith('youtube.com') || host.endsWith('youtu.be'),
    'Medium': (host) => host.endsWith('medium.com'),
    'Bluesky': (host) => host.endsWith('bsky.app'),
    'Pixiv': (host) => host.endsWith('pixiv.net'),
    'Soundcloud': (host) => host.endsWith('soundcloud.com'),
    'Genius': (host) => host.endsWith('genius.com'),
    // Add more precise checks as needed
};

// Use inferred type from browser.webNavigation
async function handleNavigation(details: OnBeforeNavigateDetails): Promise<void> {
  // --- ADDED: Log entry and basic details --- 
  console.log(`[Redirect] handleNavigation called for URL: ${details.url}, FrameId: ${details.frameId}`);

  // Ignore non-top-level frames and non-http(s) URLs
  if (details.frameId !== 0 || !details.url || !details.url.startsWith('http')) {
    // --- ADDED: Log exit reason --- 
    console.log(`[Redirect] Exiting: Not a top-level HTTP(S) frame.`);
    return;
  }

  try {
    const config = await userConfigurationStorage.getValue();
    // --- ADDED: Log loaded config BEFORE the check --- 
    console.log('[Redirect] Loaded config:', JSON.stringify(config, null, 2)); 

    // Check for settings existence AND onboarding completion
    if (!config?.redirectSettings || !config.onboardingComplete) {
      // --- ADDED: Log specific exit reason --- 
      const reason = !config?.redirectSettings ? 'Redirect settings missing' : 'Onboarding incomplete';
      console.log(`[Redirect] Exiting: ${reason}. (Onboarding complete: ${config?.onboardingComplete})`);
      return;
    }

    const currentUrl = new URL(details.url);
    const originalHost = currentUrl.hostname;
    // --- ADDED: Log host being checked --- 
    console.log(`[Redirect] Checking host: ${originalHost}`);

    // Iterate through defined redirectable services
    for (const serviceName of REDIRECT_SERVICES) {
      const lowerCaseServiceName = serviceName.toLowerCase(); // Get lowercase version
      // Read settings using lowercase key
      const serviceSetting = config.redirectSettings[lowerCaseServiceName];
      // Assume serviceHostChecks uses the original casing from REDIRECT_SERVICES
      const hostCheckFn = serviceHostChecks[serviceName];
      // --- ADDED: Log service check --- 
      // console.log(`[Redirect] Checking service: "${serviceName}", Enabled: ${serviceSetting?.isEnabled}, Host matches: ${hostCheckFn ? hostCheckFn(originalHost) : 'N/A'}`);

      // Check if this service is enabled (using lowercase lookup), has a check function, and the host matches
      if (serviceSetting?.isEnabled && hostCheckFn && hostCheckFn(originalHost)) {
        // Use only the chosenInstance from settings. Default is set in storage.ts.
        let instanceUrlString = serviceSetting.chosenInstance;

        // If chosenInstance is somehow empty/nullish despite defaults, skip.
        if (!instanceUrlString) {
          console.warn(`[Redirect] Service "${serviceName}" is enabled but has no chosen instance URL in settings.`);
          continue; // Skip if no instance is available
        }

        // --- ADDED: Ensure scheme exists ---
        if (!instanceUrlString.startsWith('http://') && !instanceUrlString.startsWith('https://')) {
            console.warn(`[Redirect] Instance URL "${instanceUrlString}" for "${serviceName}" is missing a scheme. Prepending https://`);
            instanceUrlString = 'https://' + instanceUrlString;
        }
        // --- End Scheme Check ---

        // --- FIXED: Use URL constructor for robust joining ---
        let newRedirectUrl: string;
        try {
            const baseUrl = new URL(instanceUrlString); // Base URL of the instance (NOW should have scheme)
            const targetUrl = new URL(details.url);   // Original URL

            // Construct the new URL, preserving path, search, and hash
            baseUrl.pathname = targetUrl.pathname;
            baseUrl.search = targetUrl.search;
            baseUrl.hash = targetUrl.hash;

            newRedirectUrl = baseUrl.toString();

        } catch (urlError) {
             console.error(`[Redirect] Error constructing new URL with instance "${instanceUrlString}" and path from "${details.url}":`, urlError);
             continue; // Skip to next service if construction fails
        }
        // --- End Fix ---

        // --- Log the actual instanceUrlString used ---
        console.log(`[Redirect] Match found for "${serviceName}". Enabled: ${serviceSetting.isEnabled}. Instance URL: ${instanceUrlString}`);
        console.log(`[Redirect] Original URL: ${details.url}`);
        console.log(`[Redirect]   -> New URL: ${newRedirectUrl}`); // Log the final constructed URL

        // Prevent redirect loops (validation should work now)
        try {
            const newUrlHost = new URL(newRedirectUrl).hostname;
             // Don't redirect if the target is the same as the origin OR if the target instance host is the *same* as the original host
            if (details.url === newRedirectUrl || newUrlHost === originalHost) {
                console.warn(`[Redirect] Loop detected or target is same as source. Aborting redirect for ${details.url}`);
                return;
            }
        } catch (e) {
             // This catch block should ideally not be hit now, but keep for safety
             console.error(`[Redirect] Invalid new URL generated even after using URL constructor: ${newRedirectUrl}`, e);
             return;
        }

        // Perform the redirect
        try {
          await browser.tabs.update(details.tabId, { url: newRedirectUrl });
          console.log(`[Redirect] Successfully redirected tab ${details.tabId} to ${newRedirectUrl}`);
          return; // Stop processing further rules once a redirect occurs
        } catch (updateError) {
          console.error(`[Redirect] Error updating tab ${details.tabId}:`, updateError);
          return; // Stop on error
        }
      }
    }
     // --- ADDED: Log if no match found AFTER loop --- 
     console.log(`[Redirect] No matching enabled rule found for ${details.url}`);

  } catch (error) {
    console.error('[Redirect] Error in handleNavigation:', error);
  }
}

export default defineBackground({
  // The main function MUST be synchronous according to WXT warning
  main() {
    console.log('[Scarlett BG Entrypoint] Background main() function running (synchronous).');

    // --- Explicitly ensure storage is touched early --- 
    userConfigurationStorage.getValue().then(() => {
        console.log('[Scarlett BG Entrypoint] userConfigurationStorage potentially initialized.');
    }).catch(err => {
        console.error('[Scarlett BG Entrypoint] Error during early storage access:', err);
    });

    // --- Synchronous Setup ---
    // Register listeners immediately when the worker starts.
    try {
        // 1. Register message listeners
        console.log('[Scarlett BG Entrypoint] Registering message handlers...');
        registerMessageHandlers();
        console.log('[Scarlett BG Entrypoint] Message handlers registered.');

        // 2. Register Context Menu Click Handler
        console.log('[Scarlett BG Entrypoint] Registering context menu handlers...');
        registerContextMenuHandlers(); // Registers the onClicked listener
        console.log('[Scarlett BG Entrypoint] Context menu handlers registered.');

        // --- Defer Async Setup to onInstalled ---
        // The main setup logic is now primarily event-driven via onInstalled

    } catch (error) {
      console.error('[Scarlett BG Entrypoint] CRITICAL ERROR during synchronous background setup:', error);
    }

    // --- Event Listeners ---
    // Use browser namespace for cross-browser compatibility
    browser.runtime.onInstalled.addListener(async (details) => {
        console.log('[Scarlett BG Entrypoint] onInstalled event triggered:', details);

        // --- Perform Async Setup Tasks on Install/Update ---
        try {
            if (details.reason === 'install' || details.reason === 'update') {
                // Setup context menus (idempotent or recreate as needed)
                // Doing this here ensures they are set up after install/update.
                console.log(`[Scarlett BG Entrypoint] Setting up context menus (reason: ${details.reason})...`);
                await setupContextMenu();
                console.log('[Scarlett BG Entrypoint] Context menu setup complete.');
            }

            if (details.reason === 'install') {
                console.log('[Scarlett BG Entrypoint] Reason is "install". Performing first-time setup...');

                // Initialize DB Schema
                console.log('[Scarlett BG Entrypoint] Ensuring database schema is applied...');
                await ensureDbInitialized();
                console.log('[Scarlett BG Entrypoint] DB schema check/application complete.');

                // Seed Initial Tags
                console.log('[Scarlett BG Entrypoint] Attempting to seed initial tags...');
                await seedInitialTags();
                console.log('[Scarlett BG Entrypoint] Initial tag seeding attempt complete.');

                // Check and Open Onboarding page
                console.log('[Scarlett BG Entrypoint] Checking onboarding status...');
                const currentConfig = await userConfigurationStorage.getValue();
                console.log('[Scarlett BG Entrypoint] Current config:', currentConfig);
                console.log('[Scarlett BG Entrypoint] Onboarding complete:', currentConfig?.onboardingComplete);

                if (currentConfig?.onboardingComplete) {
                    console.log('[Scarlett BG Entrypoint] Onboarding already marked as complete. Skipping tab creation.');
                } else {
                    console.log('[Scarlett BG Entrypoint] Onboarding not complete. Opening onboarding tab...');
                    const onboardingUrl = browser.runtime.getURL('/oninstall.html');
                    await browser.tabs.create({ url: onboardingUrl });
                    console.log(`[Scarlett BG Entrypoint] Onboarding tab created at ${onboardingUrl}`);
                }
            } else if (details.reason === 'update') {
                // Optional: Add logic specifically for updates if needed
                console.log('[Scarlett BG Entrypoint] Extension updated from version:', details.previousVersion);
                // Maybe run migrations or re-check context menus here as well
            }

        } catch(error) {
             console.error(`[Scarlett BG Entrypoint] Error during onInstalled tasks (reason: ${details.reason}):`, error);
        } finally {
            console.log(`[Scarlett BG Entrypoint] onInstalled specific tasks complete (reason: ${details.reason}).`);
        }
    });

    // --- Add Navigation Listener ---
    if (!browser.webNavigation.onBeforeNavigate.hasListener(handleNavigation)) {
        browser.webNavigation.onBeforeNavigate.addListener(handleNavigation);
        console.log('[Redirect] Added webNavigation listener.');
    } else {
         console.log('[Redirect] webNavigation listener already exists.');
    }

    // --- Final Ready Log (from synchronous main) ---
    console.log('[Scarlett BG Entrypoint] Synchronous background setup complete. Ready.');
  },

  // Include other background script options if needed, e.g.:
  // persistent: false, // for Manifest V3
  // type: 'module',   // Usually inferred by WXT
});
