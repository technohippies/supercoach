// stories/pages/settings/SettingsPageView.stories.tsx
import { action } from '@storybook/addon-actions'; // For logging handler calls
// Use createEffect from solid-js
import { createSignal, createEffect, type Accessor } from 'solid-js'; 
import SettingsPageView from '../../../src/pages/settings/SettingsPageView';
import type { UserConfiguration, RedirectSettings, RedirectServiceSetting, FunctionConfig, DomainDetail } from '../../../src/services/storage/types';
import type { ProviderOption } from '../../../src/features/models/ProviderSelectionPanel';
import type { ModelOption } from '../../../src/features/models/ModelSelectionPanel';
// Import the exported status types
import type { SettingsLoadStatus, FetchStatus, TestStatus } from '../../../src/context/SettingsContext'; 
import type { TtsProviderOption } from '../../../src/features/models/TtsProviderPanel'; // Added for TTS
// --- Import STT Types ---
import type { SttProviderOption } from '../../../src/features/models/SttProviderPanel'; // Removed SttModelStatus from import

// --- Locally Define SttModelStatus as a workaround ---
// Ideally, this type SttModelStatus would be exported from SttProviderPanel.tsx
type SttModelStatus = 'not-checked' | 'not-downloaded' | 'downloading' | 'downloaded' | 'error';

// --- Mock Data ---

const mockLlmProviderOptions: ProviderOption[] = [
    { id: 'ollama', name: 'Ollama', defaultBaseUrl: 'http://localhost:11434', logoUrl: '/images/llm-providers/ollama.png' },
    { id: 'jan', name: 'Jan', defaultBaseUrl: 'http://localhost:1337', logoUrl: '/images/llm-providers/jan.png' },
    { id: 'lmstudio', name: 'LM Studio', defaultBaseUrl: 'ws://127.0.0.1:1234', logoUrl: '/images/llm-providers/lmstudio.png' },
];
const mockEmbeddingProviderOptions: ProviderOption[] = [...mockLlmProviderOptions];
const mockAvailableTtsProviders: TtsProviderOption[] = [
    { id: 'browser', name: 'Browser TTS', logoUrl: '' },
    { id: 'elevenlabs', name: 'ElevenLabs', logoUrl: '/images/llm-providers/11-labs.png' },
];
const mockTtsProviderOptions: ProviderOption[] = [];

// --- NEW Mock STT Providers ---
const mockAvailableSttProviders: SttProviderOption[] = [
    { id: 'moonshine', name: 'Moonshine (Local)', logoUrl: '/images/llm-providers/moonshine.png' },
    { id: 'elevenlabs', name: 'ElevenLabs', logoUrl: '/images/llm-providers/11-labs.png', requiresApiKey: true },
];

const mockRedirectSettings: RedirectSettings = {
  GitHub: { isEnabled: true, chosenInstance: '' },
  ChatGPT: { isEnabled: false, chosenInstance: '' },
  'X (Twitter)': { isEnabled: true, chosenInstance: '' },
  Reddit: { isEnabled: true, chosenInstance: '' },
  Twitch: { isEnabled: false, chosenInstance: '' },
  YouTube: { isEnabled: true, chosenInstance: '' },
  'YouTube Music': { isEnabled: true, chosenInstance: '' },
  Medium: { isEnabled: true, chosenInstance: '' },
  Bluesky: { isEnabled: false, chosenInstance: '' },
  Pixiv: { isEnabled: true, chosenInstance: '' },
  Soundcloud: { isEnabled: true, chosenInstance: '' },
  Genius: { isEnabled: false, chosenInstance: '' },
};

const mockInitialConfig: UserConfiguration = {
    nativeLanguage: 'en',
    targetLanguage: 'es',
    llmConfig: null,
    embeddingConfig: null,
    ttsConfig: {
      providerId: 'browser', // Default TTS provider
      apiKey: null,
      modelId: '', // Changed from null to empty string
    },
    redirectSettings: mockRedirectSettings,
    focusModeBlockedDomains: [], // Renamed from userBlockedDomains
    enableFocusMode: false, // Renamed from isFocusModeActive
    onboardingComplete: true,
};

const mockLlmConfigSelected: FunctionConfig = {
    providerId: 'ollama',
    modelId: 'llama3:latest',
    baseUrl: 'http://localhost:11434'
};

const mockInitialBlockedDomains: DomainDetail[] = [
  { name: 'example.com' }, { name: 'another.com' }, { name: 'distracting.net' }
];

// Helper type for the transient state accessors expected by the ViewProps
interface TransientStateAccessors {
  localModels: Accessor<ModelOption[]>;
  remoteModels: Accessor<ModelOption[]>;
  fetchStatus: Accessor<FetchStatus>;
  fetchError: Accessor<Error | null>;
  testStatus: Accessor<TestStatus>;
  testError: Accessor<Error | null>;
  showSpinner: Accessor<boolean>;
}


// Helper to create mock transient state accessors
const createMockTransientState = (
    localModels: ModelOption[] = [],
    remoteModels: ModelOption[] = [],
    fetchStatus: FetchStatus = 'idle',
    fetchError: Error | null = null,
    testStatus: TestStatus = 'idle',
    testError: Error | null = null,
    showSpinner: boolean = false
): TransientStateAccessors => ({ // Ensure return type matches interface
    localModels: () => localModels,
    remoteModels: () => remoteModels,
    fetchStatus: () => fetchStatus,
    fetchError: () => fetchError,
    testStatus: () => testStatus,
    testError: () => testError,
    showSpinner: () => showSpinner,
});

// --- Story Definition ---
export default {
  title: 'Pages/Settings/SettingsPageView',
  component: SettingsPageView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
     initialActiveSection: {
        control: { type: 'select' },
        options: ['llm', 'embedding', 'tts', 'redirects', null],
        description: 'Initial active section to display',
        name: 'Initial Section'
     },
     initialLoadStatus: {
         control: { type: 'select' },
         options: ['pending', 'ready', 'errored'],
         description: 'Simulate initial load status',
         name: 'Load Status'
     },
     config: { table: { disable: true } },
     llmTransientState: { table: { disable: true } },
     embeddingTransientState: { table: { disable: true } },
     ttsTransientState: { table: { disable: true } },
     llmProviderOptions: { table: { disable: true } },
     embeddingProviderOptions: { table: { disable: true } },
     ttsProviderOptions: { table: { disable: true } },
     onSectionChange: { action: 'onSectionChange' },
     onLlmSelectProvider: { action: 'onLlmSelectProvider' },
     onLlmSelectModel: { action: 'onLlmSelectModel' },
     onLlmTestConnection: { action: 'onLlmTestConnection' },
     onEmbeddingSelectProvider: { action: 'onEmbeddingSelectProvider' },
     onEmbeddingSelectModel: { action: 'onEmbeddingSelectModel' },
     onEmbeddingTestConnection: { action: 'onEmbeddingTestConnection' },
     onRedirectSettingChange: { action: 'onRedirectSettingChange' },
     onBackClick: { action: 'onBackClick' },
     isFocusModeActive: { control: 'boolean', name: 'Focus Mode Active' },
     isFocusModeLoading: { control: 'boolean', name: 'Focus Mode Loading' },
     focusModeBlockedDomains: { control: 'object', name: 'Focus Mode Blocked Domains' },
     onFocusModeToggle: { action: 'onFocusModeToggle' },
     onFocusModeAddDomain: { action: 'onFocusModeAddDomain' },
     onFocusModeRemoveDomain: { action: 'onFocusModeRemoveDomain' },
     availableTtsProviders: { table: { disable: true }, name: 'Available TTS Providers' },
     selectedTtsProviderId: { control: 'text', name: 'Selected TTS Provider ID' },
     onSelectTtsProvider: { action: 'onSelectTtsProvider' },
     elevenLabsApiKey: { control: 'text', name: 'ElevenLabs API Key' },
     onElevenLabsApiKeyChange: { action: 'onElevenLabsApiKeyChange' },
     isElevenLabsTesting: { control: 'boolean', name: 'ElevenLabs Testing' },
     onTestElevenLabs: { action: 'onTestElevenLabs' },
     ttsTestAudioData: { control: 'object', name: 'TTS Test Audio Data (Blob)' },
     onTtsPlayAudio: { action: 'onTtsPlayAudio' },
     ttsTestError: { control: 'object', name: 'TTS Test Error' },
     // --- STT ArgTypes ---
     availableSttProviders: { table: { disable: true }, name: 'Available STT Providers' },
     selectedSttProviderId: { control: 'text', name: 'Selected STT Provider ID' },
     onSelectSttProvider: { action: 'onSelectSttProvider' },
     
     elevenLabsScribeApiKey: { control: 'text', name: 'ElevenLabs API Key' },
     onElevenLabsScribeApiKeyChange: { action: 'onElevenLabsScribeApiKeyChange' },
     isElevenLabsScribeTesting: { control: 'boolean', name: 'ElevenLabs Testing' },
     onTestElevenLabsScribe: { action: 'onTestElevenLabsScribe' },

     moonshineModelStatus: { 
        control: { type: 'select' },
        options: ['not-checked', 'not-downloaded', 'downloading', 'downloaded', 'error'] as SttModelStatus[],
        name: 'Moonshine Model Status' 
     },
     moonshineDownloadProgress: { control: { type: 'range', min: 0, max: 100, step: 1 }, name: 'Moonshine Download Progress' },
     onDownloadMoonshineModel: { action: 'onDownloadMoonshineModel' },
     isMoonshineSttTesting: { control: 'boolean', name: 'Moonshine STT Testing' },
     onTestMoonshine: { action: 'onTestMoonshine' },

     isSttRecordingActive: { control: 'boolean', name: 'STT Recording Active' },
     sttTestResult: { control: 'text', name: 'STT Test Result (Transcription)' },
     sttTestError: { control: 'object', name: 'STT Test Error' },
     webGpuSupported: { 
        control: { type: 'radio' },
        options: [true, false, undefined],
        name: 'WebGPU Supported (for STT)'
     },
  },
  args: {
    initialActiveSection: 'llm',
    initialLoadStatus: 'ready',
    config: mockInitialConfig,
    llmTransientState: createMockTransientState([], []),
    embeddingTransientState: createMockTransientState([], []),
    ttsTransientState: createMockTransientState([], []),
    isFocusModeActive: false,
    isFocusModeLoading: false,
    focusModeBlockedDomains: mockInitialBlockedDomains,
    availableTtsProviders: mockAvailableTtsProviders,
    selectedTtsProviderId: 'browser',
    elevenLabsApiKey: '',
    isElevenLabsTesting: false,
    ttsTestAudioData: null,
    ttsTestError: null,
    // --- STT Default Args ---
    availableSttProviders: mockAvailableSttProviders, // Initialize with mock data
    selectedSttProviderId: undefined,
    elevenLabsScribeApiKey: '',
    isElevenLabsScribeTesting: false,
    moonshineModelStatus: 'not-checked' as SttModelStatus,
    moonshineDownloadProgress: 0,
    isMoonshineSttTesting: false,
    isSttRecordingActive: false,
    sttTestResult: null,
    sttTestError: null,
    webGpuSupported: undefined,
  }
};

// --- Base Render Function ---
const BaseRender = (args: any) => {
    // Simulate activeSection state needed for sidebar interaction within the story
    const [activeSection, setActiveSection] = createSignal<string | null>(args.initialActiveSection);

    // Update internal signal when control arg changes
    createEffect(() => setActiveSection(args.initialActiveSection));

    // Signals for props that require accessors
    const [isFocusModeActiveSignal, setIsFocusModeActiveSignal] = createSignal(args.isFocusModeActive);
    createEffect(() => setIsFocusModeActiveSignal(args.isFocusModeActive));
    
    const [isFocusModeLoadingSignal, setIsFocusModeLoadingSignal] = createSignal(args.isFocusModeLoading);
    createEffect(() => setIsFocusModeLoadingSignal(args.isFocusModeLoading));

    const [focusModeBlockedDomainsSignal, setFocusModeBlockedDomainsSignal] = createSignal<DomainDetail[]>(args.focusModeBlockedDomains);
    createEffect(() => setFocusModeBlockedDomainsSignal(args.focusModeBlockedDomains));
    
    const [selectedTtsProviderIdSignal, setSelectedTtsProviderIdSignal] = createSignal<string | undefined>(args.selectedTtsProviderId);
    createEffect(() => setSelectedTtsProviderIdSignal(args.selectedTtsProviderId));

    const [elevenLabsApiKeySignal, setElevenLabsApiKeySignal] = createSignal<string>(args.elevenLabsApiKey);
    createEffect(() => setElevenLabsApiKeySignal(args.elevenLabsApiKey));
    
    const [isElevenLabsTestingSignal, setIsElevenLabsTestingSignal] = createSignal<boolean>(args.isElevenLabsTesting);
    createEffect(() => setIsElevenLabsTestingSignal(args.isElevenLabsTesting));

    const [ttsTestAudioDataSignal, setTtsTestAudioDataSignal] = createSignal<Blob | null>(args.ttsTestAudioData);
    createEffect(() => setTtsTestAudioDataSignal(args.ttsTestAudioData));
    
    const [ttsTestErrorSignal, setTtsTestErrorSignal] = createSignal<Error | null>(args.ttsTestError);
    createEffect(() => setTtsTestErrorSignal(args.ttsTestError));

    // --- NEW STT State Signals ---
    const [selectedSttProviderIdSignal, setSelectedSttProviderIdSignal] = createSignal<string | undefined>(args.selectedSttProviderId);
    createEffect(() => setSelectedSttProviderIdSignal(args.selectedSttProviderId));

    const [elevenLabsScribeApiKeySignal, setElevenLabsScribeApiKeySignal] = createSignal<string>(args.elevenLabsScribeApiKey);
    createEffect(() => setElevenLabsScribeApiKeySignal(args.elevenLabsScribeApiKey));

    const [isElevenLabsScribeTestingSignal, setIsElevenLabsScribeTestingSignal] = createSignal<boolean>(args.isElevenLabsScribeTesting);
    createEffect(() => setIsElevenLabsScribeTestingSignal(args.isElevenLabsScribeTesting));

    const [moonshineModelStatusSignal, setMoonshineModelStatusSignal] = createSignal<SttModelStatus>(args.moonshineModelStatus as SttModelStatus);
    createEffect(() => setMoonshineModelStatusSignal(args.moonshineModelStatus as SttModelStatus));

    const [moonshineDownloadProgressSignal, setMoonshineDownloadProgressSignal] = createSignal<number>(args.moonshineDownloadProgress);
    createEffect(() => setMoonshineDownloadProgressSignal(args.moonshineDownloadProgress));

    const [isMoonshineSttTestingSignal, setIsMoonshineSttTestingSignal] = createSignal<boolean>(args.isMoonshineSttTesting);
    createEffect(() => setIsMoonshineSttTestingSignal(args.isMoonshineSttTesting));

    const [isSttRecordingActiveSignal, setIsSttRecordingActiveSignal] = createSignal<boolean>(args.isSttRecordingActive);
    createEffect(() => setIsSttRecordingActiveSignal(args.isSttRecordingActive));

    const [sttTestResultSignal, setSttTestResultSignal] = createSignal<string | null>(args.sttTestResult);
    createEffect(() => setSttTestResultSignal(args.sttTestResult));

    const [sttTestErrorSignal, setSttTestErrorSignal] = createSignal<Error | null>(args.sttTestError);
    createEffect(() => setSttTestErrorSignal(args.sttTestError));

    const [webGpuSupportedSignal, setWebGpuSupportedSignal] = createSignal<boolean | undefined>(args.webGpuSupported);
    createEffect(() => setWebGpuSupportedSignal(args.webGpuSupported));

    // Construct the full props object expected by SettingsPageView
    // Ensure all required props are provided, using args for overrides
    const viewProps = {
        loadStatus: () => args.initialLoadStatus as SettingsLoadStatus,
        config: args.config, // Use the potentially overridden config from args
        activeSection: activeSection, // Use the signal accessor
        llmTransientState: args.llmTransientState,
        embeddingTransientState: args.embeddingTransientState,
        ttsTransientState: args.ttsTransientState,
        llmProviderOptions: mockLlmProviderOptions, // Use fixed mock options
        embeddingProviderOptions: mockEmbeddingProviderOptions,
        ttsProviderOptions: mockTtsProviderOptions,
        onSectionChange: (section: string | null) => {
            action('onSectionChange')(section); // Log the action
            setActiveSection(section); // Update the signal for UI feedback
            // Note: Storybook controls won't update automatically here,
            // but the UI within the story will reflect the change.
        },
        // Pass actions directly for other handlers
        onLlmSelectProvider: action('onLlmSelectProvider'),
        onLlmSelectModel: action('onLlmSelectModel'),
        onLlmTestConnection: action('onLlmTestConnection'),
        onEmbeddingSelectProvider: action('onEmbeddingSelectProvider'),
        onEmbeddingSelectModel: action('onEmbeddingSelectModel'),
        onEmbeddingTestConnection: action('onEmbeddingTestConnection'),
        onRedirectSettingChange: async (service: string, update: Pick<RedirectServiceSetting, 'isEnabled'>) => {
            action('onRedirectSettingChange')(service, update);
        },
        onBackClick: action('onBackClick'),
        // TTS Props
        availableTtsProviders: args.availableTtsProviders,
        selectedTtsProviderId: selectedTtsProviderIdSignal,
        onSelectTtsProvider: (providerId: string | undefined) => {
            action('onSelectTtsProvider')(providerId);
            setSelectedTtsProviderIdSignal(providerId);
        },
        elevenLabsApiKey: elevenLabsApiKeySignal,
        onElevenLabsApiKeyChange: (apiKey: string) => {
            action('onElevenLabsApiKeyChange')(apiKey);
            setElevenLabsApiKeySignal(apiKey);
        },
        isElevenLabsTesting: isElevenLabsTestingSignal,
        onTestElevenLabs: () => {
            action('onTestElevenLabs')();
            setIsElevenLabsTestingSignal(true);
            // Simulate API call
            setTimeout(() => {
                setIsElevenLabsTestingSignal(false);
                // setTtsTestAudioDataSignal(new Blob(['mock audio data'], { type: 'audio/mpeg' })); 
                // Or set an error: 
                // setTtsTestErrorSignal(new Error("ElevenLabs API Key invalid"));
            }, 1500);
        },
        ttsTestAudioData: ttsTestAudioDataSignal,
        onTtsPlayAudio: action('onTtsPlayAudio'),
        ttsTestError: ttsTestErrorSignal,
        // Focus Mode Props
        isFocusModeActive: isFocusModeActiveSignal,
        isFocusModeLoading: isFocusModeLoadingSignal,
        focusModeBlockedDomains: focusModeBlockedDomainsSignal,
        onFocusModeToggle: (isEnabled: boolean) => {
            action('onFocusModeToggle')(isEnabled);
            setIsFocusModeActiveSignal(isEnabled);
        },
        onFocusModeAddDomain: (domainName: string) => {
            action('onFocusModeAddDomain')(domainName);
            setFocusModeBlockedDomainsSignal(prev => [...prev, { name: domainName }]);
        },
        onFocusModeRemoveDomain: (domainName: string) => {
            action('onFocusModeRemoveDomain')(domainName);
            setFocusModeBlockedDomainsSignal(prev => prev.filter(d => d.name !== domainName));
        },
        // --- NEW STT Props for SettingsPageView ---
        availableSttProviders: args.availableSttProviders, // Pass directly from args
        selectedSttProviderId: selectedSttProviderIdSignal,
        onSelectSttProvider: (providerId: string | undefined) => {
            action('onSelectSttProvider')(providerId);
            setSelectedSttProviderIdSignal(providerId);
            // Simulate clearing old test results when provider changes
            setSttTestResultSignal(null);
            setSttTestErrorSignal(null);
        },
        elevenLabsScribeApiKey: elevenLabsScribeApiKeySignal,
        onElevenLabsScribeApiKeyChange: (key: string) => {
            action('onElevenLabsScribeApiKeyChange')(key);
            setElevenLabsScribeApiKeySignal(key);
        },
        isElevenLabsScribeTesting: isElevenLabsScribeTestingSignal,
        onTestElevenLabsScribe: () => {
            action('onTestElevenLabsScribe')();
            setIsElevenLabsScribeTestingSignal(true);
            setSttTestResultSignal(null);
            setSttTestErrorSignal(null);
            setTimeout(() => {
                setIsElevenLabsScribeTestingSignal(false);
                if (Math.random() > 0.3) setSttTestResultSignal('ElevenLabs: Test transcription successful!');
                else setSttTestErrorSignal(new Error('ElevenLabs: API key invalid (simulated).'));
            }, 1500);
        },
        moonshineModelStatus: moonshineModelStatusSignal,
        moonshineDownloadProgress: moonshineDownloadProgressSignal,
        onDownloadMoonshineModel: () => {
            action('onDownloadMoonshineModel')();
            setMoonshineModelStatusSignal('downloading');
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                setMoonshineDownloadProgressSignal(progress);
                if (progress >= 100) {
                    clearInterval(interval);
                    if (Math.random() > 0.2) setMoonshineModelStatusSignal('downloaded');
                    else setMoonshineModelStatusSignal('error');
                }
            }, 200);
        },
        isMoonshineSttTesting: isMoonshineSttTestingSignal,
        onTestMoonshine: () => {
            action('onTestMoonshine')();
            setIsSttRecordingActiveSignal(true); // Indicate recording started
            // After a short delay, transition to testing/transcribing state for Moonshine
            setTimeout(() => {
                setIsSttRecordingActiveSignal(false);
                setIsMoonshineSttTestingSignal(true);
                setSttTestResultSignal(null);
                setSttTestErrorSignal(null);
                setTimeout(() => {
                    setIsMoonshineSttTestingSignal(false);
                    if (Math.random() > 0.3) setSttTestResultSignal('Moonshine: Local transcription successful!');
                    else setSttTestErrorSignal(new Error('Moonshine: Transcription failed (simulated).'));
                }, 2000);
            }, 1000); // Simulate some recording time
        },
        isSttRecordingActive: isSttRecordingActiveSignal,
        sttTestResult: sttTestResultSignal,
        sttTestError: sttTestErrorSignal,
        webGpuSupported: webGpuSupportedSignal,
    };

    // Validate required props are present (basic check)
    if (!viewProps.loadStatus || !viewProps.config || !viewProps.activeSection || !viewProps.llmTransientState) {
        console.error("[Storybook Render Error] Missing required props for SettingsPageView");
        return <div>Error: Missing required props</div>;
    }


    return <SettingsPageView {...viewProps} />;
};

// --- Stories ---

export const Default = {
  render: BaseRender,
  args: {
    initialActiveSection: 'llm',
    initialLoadStatus: 'ready',
    config: mockInitialConfig,
    llmTransientState: createMockTransientState([], []),
  },
};

export const Loading = {
  render: BaseRender,
  args: {
    initialLoadStatus: 'pending',
    initialActiveSection: null,
  },
};

export const LoadError = {
  render: BaseRender,
  args: {
    initialLoadStatus: 'errored',
    initialActiveSection: null,
  },
};

export const LLM_ModelsReady = {
  render: BaseRender,
  args: {
    initialActiveSection: 'llm',
    initialLoadStatus: 'ready',
    config: { ...mockInitialConfig, llmConfig: { providerId: 'ollama', modelId: '', baseUrl: 'http://localhost:11434' } },
    llmTransientState: createMockTransientState(
        [ { id: 'llama3:latest', name: 'llama3:latest' }, { id: 'mistral:latest', name: 'mistral:latest' } ],
        [],
        'success'
    ),
  },
};

export const LLM_TestReady = {
  render: BaseRender,
  args: {
    initialActiveSection: 'llm',
    initialLoadStatus: 'ready',
    config: { ...mockInitialConfig, llmConfig: mockLlmConfigSelected },
    llmTransientState: createMockTransientState(
        [ { id: 'llama3:latest', name: 'llama3:latest' }, { id: 'mistral:latest', name: 'mistral:latest' } ],
        [],
        'success',
        null,
        'idle'
    ),
  },
};

export const LLM_TestSuccess = {
  render: BaseRender,
  args: {
    ...LLM_TestReady.args, // Inherit base args
    // Override only the necessary part of the transient state
    llmTransientState: createMockTransientState(
        LLM_TestReady.args.llmTransientState.localModels(),
        LLM_TestReady.args.llmTransientState.remoteModels(),
        'success',
        null,
        'success'
    ),
  },
};

export const LLM_TestError = {
  render: BaseRender,
  args: {
     ...LLM_TestReady.args, // Inherit base args
     // Override only the necessary part of the transient state
     llmTransientState: createMockTransientState(
        LLM_TestReady.args.llmTransientState.localModels(),
        LLM_TestReady.args.llmTransientState.remoteModels(),
        'success',
        null,
        'error',
        new Error('Connection failed: Timeout')
    ),
  },
};

export const Redirects = {
  render: BaseRender,
  args: {
    initialActiveSection: 'redirects',
    initialLoadStatus: 'ready',
    config: mockInitialConfig, // Use default config which includes redirects
  },
};

export const FocusMode = {
  render: BaseRender,
  args: {
    initialActiveSection: 'focusmode',
    initialLoadStatus: 'ready',
    config: { 
      ...mockInitialConfig, 
      isFocusModeActive: true, 
      userBlockedDomains: [{name: 'facebook.com'}, {name: 'twitter.com'}] 
    },
    isFocusModeActive: true, // Control this via args for Storybook control panel
    isFocusModeLoading: false,
    focusModeBlockedDomains: [{name: 'facebook.com'}, {name: 'twitter.com'}], // Control this too
  },
};

export const TTS_Section = {
  render: BaseRender,
  args: {
    initialActiveSection: 'tts',
    initialLoadStatus: 'ready',
    config: {
      ...mockInitialConfig,
      ttsConfig: { providerId: 'elevenlabs', apiKey: 'test-key', modelId: 'eleven_multilingual_v2', voiceId: 'somevoice' }
    },
    selectedTtsProviderId: 'elevenlabs',
    elevenLabsApiKey: 'test-key',
    isElevenLabsTesting: false,
    ttsTestAudioData: null,
    ttsTestError: null,
  }
};

// TODO: Add stories for Embedding and Reader sections