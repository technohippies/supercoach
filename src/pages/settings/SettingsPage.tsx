import { Component, createSignal, createEffect } from 'solid-js';
import SettingsPageView from './SettingsPageView';
import { useSettings } from '../../context/SettingsContext';
import type { TtsProviderOption } from '../../features/models/TtsProviderPanel';
import type { SttProviderOption } from '../../features/models/SttProviderPanel';
import type { FunctionConfig /*, DomainDetail*/ } from '../../services/storage/types';
import { DEFAULT_ELEVENLABS_MODEL_ID } from '../../shared/constants';

// --- Locally Define SttModelStatus as a workaround ---
// Ideally, this type SttModelStatus would be exported from SttProviderPanel.tsx or a shared types file
type SttModelStatus = 'not-checked' | 'not-downloaded' | 'downloading' | 'downloaded' | 'error';

interface SettingsPageProps {
  onNavigateBack?: () => void;
}

const SettingsPage: Component<SettingsPageProps> = (props) => {
  const settings = useSettings();

  // State for the active section within the page
  const [activeSection, setActiveSection] = createSignal<string | null>('tts');

  // Effect to potentially set initial active section based on config/load status
  createEffect(() => {
    if (settings.loadStatus() === 'ready' && !activeSection()) {
      // Optionally set a default section if none is active after load
      // setActiveSection('llm');
    }
    // Or navigate based on onboarding state if needed
  });

  // --- Get Transient States via Context Function --- 
  const llmTransientState = settings.getTransientState('LLM');
  const embeddingTransientState = settings.getTransientState('Embedding');
  const ttsTestAudio = settings.ttsTestAudio; // Get the audio signal accessor

  // --- Define TTS Provider Options --- 
  const availableTtsProviders: TtsProviderOption[] = [
      { id: 'elevenlabs', name: 'ElevenLabs', logoUrl: '/images/tts-providers/elevenlabs.png' },
      // { id: 'kokoro', name: 'Kokoro (Local)', logoUrl: '/images/tts-providers/kokoro.png' },
  ];

  // --- NEW: Define STT Provider Options for the Application ---
  const sttProvidersList: SttProviderOption[] = [ // Renamed variable to avoid conflict
      { id: 'moonshine', name: 'Moonshine (Local)', logoUrl: '/images/llm-providers/moonshine.png' },
      { id: 'elevenlabs', name: 'ElevenLabs', logoUrl: '/images/llm-providers/11-labs.png', requiresApiKey: true },
  ];

  // --- State Management for TTS Panel --- 
  const selectedTtsProviderId = () => settings.config.ttsConfig?.providerId;
  const [elevenLabsApiKeySignal, setElevenLabsApiKeySignal] = createSignal(settings.config.ttsConfig?.apiKey || '');
  
  // Testing State 
  const [isElTesting /*, setIsElTesting */] = createSignal(false);
  const [ttsError, setTtsError] = createSignal<Error | null>(null);

  // --- NEW: STT State Management ---
  const [selectedSttProviderIdSignal, setSelectedSttProviderIdSignal] = createSignal<string | undefined>(undefined); // Default to undefined
  const [elevenLabsScribeApiKeySignal, setElevenLabsScribeApiKeySignal] = createSignal(''); // Default to empty
  const [isElevenLabsScribeTestingSignal, setIsElevenLabsScribeTestingSignal] = createSignal(false);
  const [moonshineModelStatusSignal, setMoonshineModelStatusSignal] = createSignal<SttModelStatus>('not-checked'); 
  const [moonshineDownloadProgressSignal, setMoonshineDownloadProgressSignal] = createSignal(0);
  const [isMoonshineSttTestingSignal, setIsMoonshineSttTestingSignal] = createSignal(false);
  const [isSttRecordingActiveSignal, setIsSttRecordingActiveSignal] = createSignal(false);
  const [sttTestResultSignal, setSttTestResultSignal] = createSignal<string | null>(null);
  const [sttTestErrorSignal, setSttTestErrorSignal] = createSignal<Error | null>(null);
  const [webGpuSupportedSignal, setWebGpuSupportedSignal] = createSignal<boolean | undefined>(undefined);

  createEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
      (navigator as any).gpu.requestAdapter()
        .then((adapter: any) => setWebGpuSupportedSignal(!!adapter)) // Ensure setWebGpuSupportedSignal is used
        .catch(() => setWebGpuSupportedSignal(false));
    } else {
      setWebGpuSupportedSignal(false);
    }
  });

  // --- Effect to request Moonshine model status from background ---
  createEffect(() => {
    const currentSection = activeSection();
    const currentSttProvider = selectedSttProviderIdSignal();
    console.log('[SettingsPage] STT Status Check Effect: Active Section:', currentSection, 'Selected STT Provider:', currentSttProvider);

    // Only check if STT section is active and Moonshine is selected
    if (currentSection === 'stt' && currentSttProvider === 'moonshine') {
      console.log('[SettingsPage] Requesting Moonshine model status from background script.');
      setMoonshineModelStatusSignal('not-checked'); // Reset to 'not-checked' before asking
      browser.runtime.sendMessage({ type: 'GET_MOONSHINE_MODEL_STATUS', timestamp: Date.now() })
        .then(response => {
          if (response && response.status) {
            console.log('[SettingsPage] Received immediate model status response (should be rare):', response.status);
            setMoonshineModelStatusSignal(response.status);
          }
        })
        .catch(error => {
          console.error('[SettingsPage] Error sending GET_MOONSHINE_MODEL_STATUS:', error);
          setMoonshineModelStatusSignal('error'); 
        });
    }
  });

  // --- Listener for background script messages (e.g., model status updates) ---
  createEffect(() => {
    const messageListener = (message: any) => { // Removed sender as it's not used
      if (message.type === 'MOONSHINE_MODEL_STATUS_RESPONSE') {
        console.log('[SettingsPage] Received MOONSHINE_MODEL_STATUS_RESPONSE from background:', message.status);
        setMoonshineModelStatusSignal(message.status);
        if (message.status === 'downloaded') {
          setMoonshineDownloadProgressSignal(100); // Ensure progress is full on downloaded
        } else if (message.status !== 'downloading') {
          setMoonshineDownloadProgressSignal(0); // Reset progress if not downloading
        }
      } else if (message.type === 'MOONSHINE_DOWNLOAD_PROGRESS') {
        console.log('[SettingsPage] Received MOONSHINE_DOWNLOAD_PROGRESS from background:', message.progress);
        setMoonshineModelStatusSignal('downloading'); 
        setMoonshineDownloadProgressSignal(message.progress);
      }
    };

    browser.runtime.onMessage.addListener(messageListener);
    console.log('[SettingsPage] Added listener for background messages.');

    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
      console.log('[SettingsPage] Removed listener for background messages.');
    };
  });
  
  // --- NEW: STT Action Handlers ---
  const handleSelectSttProvider = (providerId: string | undefined) => {
    console.log(`[SettingsPage] STT Provider selected: ${providerId}`);
    setSelectedSttProviderIdSignal(providerId); // Update local signal

    // TODO: Persist this selection to UserConfiguration.sttConfig when it's defined
    // const currentSttConfig = settings.config.sttConfig || {};
    // settings.updateUserConfiguration({ 
    //   sttConfig: {
    //     ...currentSttConfig,
    //     providerId: providerId,
    //     apiKey: providerId === 'elevenlabs' ? elevenLabsScribeApiKeySignal() : null,
    //   }
    // });
    setSttTestResultSignal(null);
    setSttTestErrorSignal(null);
    if (providerId !== 'moonshine') { // Reset moonshine status if another provider is selected
        setMoonshineModelStatusSignal('not-checked');
        setMoonshineDownloadProgressSignal(0);
    } else {
        // If moonshine is selected, trigger a status check
        // The effect listening to activeSection and selectedSttProviderIdSignal will handle this
    }
  };

  const handleElevenLabsScribeApiKeyChange = (apiKey: string) => {
    setElevenLabsScribeApiKeySignal(apiKey);
    // TODO: Persist this to UserConfiguration.sttConfig when it's defined
    // if (selectedSttProviderIdSignal() === 'elevenlabs') {
    //   settings.updateUserConfiguration({
    //     sttConfig: { ...settings.config.sttConfig, providerId: 'elevenlabs', apiKey: apiKey }
    //   });
    // }
  };

  const handleTestElevenLabsScribe = () => {
    console.log('[SettingsPage] Testing ElevenLabs...');
    setIsElevenLabsScribeTestingSignal(true);
    setSttTestResultSignal(null);
    setSttTestErrorSignal(null);
    // Simulate API call - replace with actual logic using settings.testConnection or similar
    setTimeout(() => {
      setIsElevenLabsScribeTestingSignal(false);
      if (Math.random() > 0.3) setSttTestResultSignal('ElevenLabs: Live test transcription!');
      else setSttTestErrorSignal(new Error('ElevenLabs: Live API key invalid.'));
    }, 1500);
  };

  const handleDownloadMoonshineModel = () => {
    console.log('[SettingsPage] Requesting Moonshine model download from background script.');
    // Ensure status is 'downloading' immediately for UI feedback, background will confirm/send progress
    setMoonshineModelStatusSignal('downloading'); 
    setMoonshineDownloadProgressSignal(0); // Reset progress
    
    browser.runtime.sendMessage({ type: 'DOWNLOAD_MOONSHINE_MODEL', timestamp: Date.now() })
      .catch(error => {
        console.error('[SettingsPage] Error sending DOWNLOAD_MOONSHINE_MODEL message:', error);
        setMoonshineModelStatusSignal('error');
        setSttTestErrorSignal(new Error('Failed to initiate model download.'));
      });
  };

  const handleTestMoonshine = () => {
    console.log('[SettingsPage] Testing Moonshine...');
    setIsSttRecordingActiveSignal(true);
    setTimeout(() => {
        setIsSttRecordingActiveSignal(false);
        setIsMoonshineSttTestingSignal(true);
        setSttTestResultSignal(null);
        setSttTestErrorSignal(null);
        // Simulate transcription - replace with actual logic
        setTimeout(() => {
          setIsMoonshineSttTestingSignal(false);
          setSttTestResultSignal('Moonshine: Live local transcription!');
        }, 1500);
    }, 1000);
  };

  // --- Focus Mode State and Handlers ---
  const isFocusModeActiveSignal = () => settings.config.enableFocusMode ?? false;
  const focusModeBlockedDomainsSignal = () => settings.config.focusModeBlockedDomains ?? [];
  // For now, use general loading status. Can be refined if needed.
  const isFocusModeLoadingSignal = () => settings.loadStatus() === 'pending'; 

  const handleToggleFocusMode = (isEnabled: boolean) => {
    console.log(`[SettingsPage] Focus Mode Toggled: ${isEnabled}`);
    // Assuming a context method like this exists or will be added:
    settings.updateUserConfiguration({ enableFocusMode: isEnabled });
  };

  const handleAddFocusDomain = (domainName: string) => {
    console.log(`[SettingsPage] Add Blocked Domain: ${domainName}`);
    const currentDomains = settings.config.focusModeBlockedDomains ?? [];
    if (!currentDomains.some(d => d.name.toLowerCase() === domainName.toLowerCase())) {
      const updatedDomains = [...currentDomains, { name: domainName }];
      // Assuming a context method like this exists or will be added:
      settings.updateUserConfiguration({ focusModeBlockedDomains: updatedDomains });
    } else {
      console.warn("[SettingsPage] Domain already exists:", domainName);
    }
  };

  const handleRemoveFocusDomain = (domainName: string) => {
    console.log(`[SettingsPage] Remove Blocked Domain: ${domainName}`);
    const currentDomains = settings.config.focusModeBlockedDomains ?? [];
    const updatedDomains = currentDomains.filter(d => d.name.toLowerCase() !== domainName.toLowerCase());
    // Assuming a context method like this exists or will be added:
    settings.updateUserConfiguration({ focusModeBlockedDomains: updatedDomains });
  };

  // --- Handlers for TTS Panel --- 
  const handleSelectTtsProvider = (providerId: string | undefined) => {
      console.log(`[SettingsPage] TTS Provider selected: ${providerId}`);
      const newConfig: Partial<FunctionConfig> = { 
          providerId: providerId, 
          modelId: providerId === 'elevenlabs' ? DEFAULT_ELEVENLABS_MODEL_ID : undefined,
          apiKey: providerId === 'elevenlabs' ? elevenLabsApiKeySignal() : undefined
      };
      settings.updateTtsConfig(newConfig as FunctionConfig); 
      setTtsError(null);
  };

  const handleElevenLabsApiKeyChange = (apiKey: string) => {
      setElevenLabsApiKeySignal(apiKey);
      settings.updateTtsConfig({ 
          providerId: 'elevenlabs', 
          modelId: DEFAULT_ELEVENLABS_MODEL_ID, 
          apiKey: apiKey 
      });
  };

  const handleTestElevenLabs = () => {
    console.log('[SettingsPage] Testing ElevenLabs...');
    const config = settings.config.ttsConfig;
    if (!config || config.providerId !== 'elevenlabs') {
        console.error("[SettingsPage] Cannot test ElevenLabs: Incorrect or missing config.");
        setTtsError(new Error("ElevenLabs configuration is not selected."));
        return;
    }
    void settings.testConnection('TTS', config); 
  };

  const playAudioBlob = (blob: Blob | null) => {
    if (!blob) {
      console.warn("[SettingsPage] playAudioBlob called with null blob.");
      return;
    }
    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url); 
      audio.onerror = (e) => {
        console.error("[SettingsPage] Error playing audio:", e);
        URL.revokeObjectURL(url); 
      };
      void audio.play(); 
      console.log("[SettingsPage] Attempting to play audio blob...");
    } catch (error) {
      console.error("[SettingsPage] Error creating audio object URL or playing:", error);
    }
  };

  return (
    <SettingsPageView
      // Standard Props
      loadStatus={settings.loadStatus} 
      config={settings.config} 
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onBackClick={props.onNavigateBack ?? (() => { console.warn("onBackClick called but no handler provided"); })}
      
      // LLM Props
      llmTransientState={llmTransientState}
      llmProviderOptions={settings.llmProviderOptions}
      onLlmSelectProvider={(provider) => { void settings.handleSelectProvider('LLM', provider); }}
      onLlmSelectModel={(modelId) => { void settings.handleSelectModel('LLM', modelId); }}
      onLlmTestConnection={(config: FunctionConfig) => { void settings.testConnection('LLM', config); }}
      
      // Embedding Props
      embeddingTransientState={embeddingTransientState}
      embeddingProviderOptions={settings.embeddingProviderOptions}
      onEmbeddingSelectProvider={(provider) => { void settings.handleSelectProvider('Embedding', provider); }}
      onEmbeddingSelectModel={(modelId) => { void settings.handleSelectModel('Embedding', modelId); }}
      onEmbeddingTestConnection={(config: FunctionConfig) => { void settings.testConnection('Embedding', config); }}

      // TTS Props
      availableTtsProviders={availableTtsProviders}
      selectedTtsProviderId={selectedTtsProviderId} 
      onSelectTtsProvider={(providerId) => { handleSelectTtsProvider(providerId); }}
      elevenLabsApiKey={elevenLabsApiKeySignal} 
      onElevenLabsApiKeyChange={(apiKey) => { handleElevenLabsApiKeyChange(apiKey); }}
      isElevenLabsTesting={isElTesting}
      onTestElevenLabs={() => { void handleTestElevenLabs(); }}
      ttsTestAudioData={ttsTestAudio} 
      onTtsPlayAudio={() => { void playAudioBlob(ttsTestAudio()); }}
      ttsTestError={ttsError}

      // Redirects Props
      onRedirectSettingChange={(service, update) => settings.handleRedirectSettingChange(service, update)}

      // Focus Mode Props
      isFocusModeActive={isFocusModeActiveSignal}
      isFocusModeLoading={isFocusModeLoadingSignal}
      focusModeBlockedDomains={focusModeBlockedDomainsSignal}
      onFocusModeToggle={handleToggleFocusMode}
      onFocusModeAddDomain={handleAddFocusDomain}
      onFocusModeRemoveDomain={handleRemoveFocusDomain}

      // --- Pass STT Props to SettingsPageView ---
      availableSttProviders={sttProvidersList} // Use the renamed variable
      selectedSttProviderId={selectedSttProviderIdSignal}
      onSelectSttProvider={handleSelectSttProvider}
      elevenLabsScribeApiKey={elevenLabsScribeApiKeySignal}
      onElevenLabsScribeApiKeyChange={handleElevenLabsScribeApiKeyChange}
      isElevenLabsScribeTesting={isElevenLabsScribeTestingSignal}
      onTestElevenLabsScribe={handleTestElevenLabsScribe}
      moonshineModelStatus={moonshineModelStatusSignal}
      moonshineDownloadProgress={moonshineDownloadProgressSignal}
      onDownloadMoonshineModel={handleDownloadMoonshineModel}
      isMoonshineSttTesting={isMoonshineSttTestingSignal}
      onTestMoonshine={handleTestMoonshine}
      isSttRecordingActive={isSttRecordingActiveSignal}
      sttTestResult={sttTestResultSignal}
      sttTestError={sttTestErrorSignal}
      webGpuSupported={webGpuSupportedSignal}
    />
  );
};

export default SettingsPage;
