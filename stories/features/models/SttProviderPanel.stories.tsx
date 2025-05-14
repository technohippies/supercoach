import { createSignal, createEffect } from 'solid-js';
import { SttProviderPanel, type SttProviderOption } from '../../../src/features/models/SttProviderPanel';
import { action } from '@storybook/addon-actions';

// --- Mock Data ---
const mockMoonshineProvider: SttProviderOption = {
    id: 'moonshine',
    name: 'Moonshine',
    logoUrl: '/images/llm-providers/moonshine.png',
    requiresApiKey: false,
};

const mockElevenLabsProvider: SttProviderOption = {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    logoUrl: '/images/llm-providers/11-labs.png',
    requiresApiKey: true,
};

const mockAvailableProviders: SttProviderOption[] = [mockMoonshineProvider, mockElevenLabsProvider];

// --- Story Definition (Default Export) ---
export default {
  title: 'Features/Models/SttProviderPanel',
  component: SttProviderPanel,
  tags: ['autodocs'],
  argTypes: {
    availableProviders: { control: 'object', description: 'List of available STT providers' },
    selectedProviderId: { control: 'object', description: 'Accessor for the selected provider ID' },
    onSelectProvider: { action: 'onSelectProvider', description: 'Handler for provider selection' },
    
    elevenLabsApiKey: { control: 'object' },
    onElevenLabsApiKeyChange: { action: 'onElevenLabsApiKeyChange' },
    isElevenLabsTesting: { control: 'object' },
    onTestElevenLabs: { action: 'onTestElevenLabs' },

    isMoonshineTesting: { control: 'object' },
    onTestMoonshine: { action: 'onTestMoonshine' },
    isWebGpuSupported: { control: 'object' },

    isRecording: { control: 'object' }, 
    transcribedText: { control: 'object' },
    sttTestError: { control: 'object' },
    onStartRecording: { action: 'onStartRecording' },
    onStopRecording: { action: 'onStopRecording' },

    _selectedProviderId: { 
        control: { type: 'select' }, 
        options: [undefined, mockMoonshineProvider.id, mockElevenLabsProvider.id],
        name: 'Selected Provider (Story Control)'
    },
    _elevenLabsApiKey: { control: 'text', name: 'ElevenLabs API Key (Story Control)' },
    _isElevenLabsTesting: { control: 'boolean', name: 'ElevenLabs Testing (Story Control)' },
    _isMoonshineTesting: { control: 'boolean', name: 'Moonshine Testing (Story Control)' },
    _isWebGpuSupported: { 
        control: { type: 'radio' }, 
        options: [true, false, undefined],
        name: 'WebGPU Supported (Story Control)'
    },
    _moonshineModelStatus: {
        control: { type: 'select' },
        options: ['not-checked', 'not-downloaded', 'downloading', 'downloaded', 'error'],
        name: 'Moonshine Model Status (Story Control)'
    },
    _moonshineDownloadProgress: { control: { type: 'range', min: 0, max: 100, step: 1 }, name: 'Moonshine Progress (Story Control)' },
    _isRecording: { control: 'boolean', name: 'Is Recording (Story Control)' },
    _transcribedText: { control: 'text', name: 'Transcribed Text (Story Control)' },
    _sttTestError: { control: 'object', name: 'STT Test Error (Story Control)' },
  },
  args: {
    availableProviders: mockAvailableProviders,
    _selectedProviderId: undefined,
    _elevenLabsApiKey: '',
    _isElevenLabsTesting: false,
    _isMoonshineTesting: false,
    _isWebGpuSupported: undefined,
    _moonshineModelStatus: 'not-checked',
    _moonshineDownloadProgress: 0,
    _isRecording: false,
    _transcribedText: null,
    _sttTestError: null,
  },
};

// --- Base Render Function --- 
const BaseRender = (args: any) => {
    const [selectedProvider, setSelectedProvider] = createSignal<string | undefined>(args._selectedProviderId);
    const [apiKey, setApiKey] = createSignal<string>(args._elevenLabsApiKey);
    const [isElTesting, setIsElTesting] = createSignal<boolean>(args._isElevenLabsTesting);
    const [isMoonshineTesting, setIsMoonshineTesting] = createSignal<boolean>(args._isMoonshineTesting);
    const [isRecording, setIsRecording] = createSignal<boolean>(args._isRecording);
    const [text, setText] = createSignal<string | null>(args._transcribedText);
    const [error, setError] = createSignal<Error | null>(args._sttTestError ? new Error(args._sttTestError.message || 'Simulated error') : null);
    const [webGpuSupport, setWebGpuSupport] = createSignal<boolean | undefined>(args._isWebGpuSupported);
    const [moonshineStatus, setMoonshineStatus] = createSignal(args._moonshineModelStatus);
    const [moonshineProgress, setMoonshineProgress] = createSignal(args._moonshineDownloadProgress);

    createEffect(() => setSelectedProvider(args._selectedProviderId));
    createEffect(() => setApiKey(args._elevenLabsApiKey));
    createEffect(() => setIsElTesting(args._isElevenLabsTesting));
    createEffect(() => setIsMoonshineTesting(args._isMoonshineTesting));
    createEffect(() => setWebGpuSupport(args._isWebGpuSupported));
    createEffect(() => setMoonshineStatus(args._moonshineModelStatus));
    createEffect(() => setMoonshineProgress(args._moonshineDownloadProgress));
    createEffect(() => setIsRecording(args._isRecording));
    createEffect(() => setText(args._transcribedText));
    createEffect(() => setError(args._sttTestError ? new Error(args._sttTestError.message || 'Simulated error') : null));

    const handleProviderSelect = (providerId: string | undefined) => {
        action('onSelectProvider')(providerId);
        setSelectedProvider(providerId);
    };

    const handleApiKeyChange = (newKey: string) => {
        action('onElevenLabsApiKeyChange')(newKey);
        setApiKey(newKey);
    };

    const handleDownloadMoonshine = () => {
        action('onDownloadMoonshineModel')();
        setMoonshineStatus('downloading');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setMoonshineProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                if (Math.random() > 0.2) {
                    setMoonshineStatus('downloaded');
                } else {
                    setMoonshineStatus('error');
                }
            }
        }, 200);
    };

    const handleSimulatedTest = (providerId: string | undefined) => {
        if (!providerId) return;

        const isCurrentlyRecording = isRecording();
        const isCurrentlyElTesting = isElTesting();
        const isCurrentlyMoonshineTesting = isMoonshineTesting();

        if (isCurrentlyRecording || isCurrentlyElTesting || isCurrentlyMoonshineTesting) {
            action(providerId === 'elevenlabs' ? 'onTestElevenLabs (stop)' : 'onTestMoonshine (stop)')();
            setIsRecording(false);
            setIsElTesting(false);
            setIsMoonshineTesting(false);
            return;
        }

        setText(null); 
        setError(null);
        setIsRecording(true);

        if (providerId === 'elevenlabs') {
            action('onTestElevenLabs (start)')();
            setIsElTesting(true);
            setTimeout(() => {
                setIsRecording(false);
                setIsElTesting(false);
                if (Math.random() > 0.3) {
                    setText('Simulated transcription from ElevenLabs.');
                } else {
                    setError(new Error('ElevenLabs simulation: API key invalid or network error.'));
                }
            }, 2500);
        } else if (providerId === 'moonshine') {
            action('onTestMoonshine (start)')();
            setIsMoonshineTesting(true);
            setTimeout(() => {
                setIsRecording(false);
                setIsMoonshineTesting(false);
                 if (Math.random() > 0.3) {
                    setText('Moonshine transcribed this in-browser (simulated).');
                } else {
                    setError(new Error('Moonshine simulation: Failed to initialize model.'));
                }
            }, 2000);
        }
    };

    return (
        <div class="p-4 bg-background max-w-xl mx-auto">
            <SttProviderPanel
                availableProviders={args.availableProviders}
                selectedProviderId={selectedProvider} 
                onSelectProvider={handleProviderSelect}
                
                elevenLabsApiKey={apiKey} 
                onElevenLabsApiKeyChange={handleApiKeyChange}
                isElevenLabsTesting={isElTesting} 
                onTestElevenLabs={() => handleSimulatedTest('elevenlabs')}

                isMoonshineTesting={isMoonshineTesting}
                onTestMoonshine={() => handleSimulatedTest('moonshine')}
                isWebGpuSupported={webGpuSupport}
                moonshineModelStatus={moonshineStatus}
                moonshineDownloadProgress={moonshineProgress}
                onDownloadMoonshineModel={handleDownloadMoonshine}

                isRecording={isRecording}
                transcribedText={text} 
                sttTestError={error}
            />
        </div>
    );
};

// --- Stories ---

export const Default = {
  render: BaseRender,
  args: {
    _selectedProviderId: undefined,
    _moonshineModelStatus: 'not-checked',
  }
};

export const MoonshineSelected = {
  render: BaseRender,
  args: {
    _selectedProviderId: mockMoonshineProvider.id,
    _isWebGpuSupported: true,
    _moonshineModelStatus: 'downloaded',
  }
};

export const MoonshineNoWebGpu = {
  render: BaseRender,
  args: {
    _selectedProviderId: mockMoonshineProvider.id,
    _isWebGpuSupported: false, 
    _moonshineModelStatus: 'downloaded',
  }
};

export const MoonshineModelNotChecked = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockMoonshineProvider.id,
        _isWebGpuSupported: true,
        _moonshineModelStatus: 'not-checked',
    }
};

export const MoonshineModelNotDownloaded = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockMoonshineProvider.id,
        _isWebGpuSupported: true,
        _moonshineModelStatus: 'not-downloaded',
    }
};

export const MoonshineModelDownloading = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockMoonshineProvider.id,
        _isWebGpuSupported: true,
        _moonshineModelStatus: 'downloading',
        _moonshineDownloadProgress: 40,
    }
};

export const MoonshineModelDownloadError = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockMoonshineProvider.id,
        _isWebGpuSupported: true,
        _moonshineModelStatus: 'error',
    }
};

export const ElevenLabsSelected = {
  render: BaseRender,
  args: {
    _selectedProviderId: mockElevenLabsProvider.id,
    _elevenLabsApiKey: 'test_api_key_123',
  }
};

export const ElevenLabsMissingKey = {
  render: BaseRender,
  args: {
    _selectedProviderId: mockElevenLabsProvider.id,
    _elevenLabsApiKey: '',
  }
};

export const RecordingMoonshine = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockMoonshineProvider.id,
        _isWebGpuSupported: true,
        _isRecording: true,
    }
};

export const ProcessingMoonshine = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockMoonshineProvider.id,
        _isWebGpuSupported: true,
        _isMoonshineTesting: true,
    }
};

export const RecordingElevenLabs = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockElevenLabsProvider.id,
        _elevenLabsApiKey: 'fake-key-for-testing',
        _isRecording: true,
    }
};

export const ProcessingElevenLabs = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockElevenLabsProvider.id,
        _elevenLabsApiKey: 'fake-key-for-testing',
        _isElevenLabsTesting: true,
    }
};

export const MoonshineSuccess = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockMoonshineProvider.id,
        _transcribedText: 'Moonshine successfully transcribed this sentence.',
        _isWebGpuSupported: true,
    }
};

export const ElevenLabsSuccess = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockElevenLabsProvider.id,
        _elevenLabsApiKey: 'fake-key-for-testing',
        _transcribedText: 'This is a successful transcription from ElevenLabs cloud.',
    }
};

export const MoonshineError = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockMoonshineProvider.id,
        _isWebGpuSupported: true,
        _sttTestError: { message: 'Moonshine: WebAssembly model failed to load.' },
    }
};

export const ElevenLabsError = {
    render: BaseRender,
    args: {
        _selectedProviderId: mockElevenLabsProvider.id,
        _elevenLabsApiKey: 'bad-api-key',
        _sttTestError: { message: 'ElevenLabs: API Key is invalid or quota exceeded.' },
    }
}; 