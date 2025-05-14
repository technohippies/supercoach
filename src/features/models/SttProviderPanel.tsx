import { Component, Show, For, Accessor, createEffect, onMount, createSignal, Switch, Match } from 'solid-js';
import { Button } from '../../components/ui/button';
import { TextField, TextFieldInput, TextFieldLabel } from '../../components/ui/text-field';
import { Label } from '../../components/ui/label';
import { Microphone, StopCircle, Info, DownloadSimple } from 'phosphor-solid';
import { cn } from '../../lib/utils';
import { Progress } from '../../components/ui/progress';

// --- Prop Types ---

export interface SttProviderOption {
    id: string;
    name: string;
    logoUrl?: string;
    requiresApiKey?: boolean;
}

export interface SttProviderPanelProps {
    availableProviders: SttProviderOption[];
    selectedProviderId: Accessor<string | undefined>;
    onSelectProvider: (providerId: string | undefined) => void;

    // ElevenLabs specific (renamed from ElevenLabs)
    elevenLabsApiKey: Accessor<string>;
    onElevenLabsApiKeyChange: (apiKey: string) => void;
    isElevenLabsTesting: Accessor<boolean>;
    onTestElevenLabs: () => void;

    // Moonshine specific
    isMoonshineTesting: Accessor<boolean>;
    onTestMoonshine: () => void;
    isWebGpuSupported: Accessor<boolean | undefined>;
    moonshineModelStatus: Accessor<'not-checked' | 'not-downloaded' | 'downloading' | 'downloaded' | 'error'>;
    moonshineDownloadProgress?: Accessor<number>;
    onDownloadMoonshineModel?: () => void;

    // General STT Test/Result
    isRecording: Accessor<boolean>;
    transcribedText: Accessor<string | null>;
    sttTestError: Accessor<Error | null>;
}


// --- Component ---

export const SttProviderPanel: Component<SttProviderPanelProps> = (props) => {
    const selectedProvider = () => props.availableProviders.find(p => p.id === props.selectedProviderId());

    createEffect(() => {
        if (props.selectedProviderId() === 'elevenlabs') {
            console.log('[SttProviderPanel] ElevenLabs API Key prop updated:', props.elevenLabsApiKey());
        }
    });

     const [localWebGpuSupported, setLocalWebGpuSupported] = createSignal<boolean | undefined>(undefined);

    onMount(async () => {
        if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
            try {
                const adapter = await (navigator as any).gpu.requestAdapter();
                setLocalWebGpuSupported(!!adapter);
            } catch (e) {
                console.warn("Error checking WebGPU support:", e);
                setLocalWebGpuSupported(false);
            }
        } else {
            setLocalWebGpuSupported(false);
        }
    });

    const currentProviderTesting = () => {
        if (props.selectedProviderId() === 'elevenlabs') return props.isElevenLabsTesting();
        if (props.selectedProviderId() === 'moonshine') return props.isMoonshineTesting();
        return false;
    };
    
    const handleTestPress = () => {
        if (props.isRecording() || currentProviderTesting()) {
            if (props.selectedProviderId() === 'elevenlabs') props.onTestElevenLabs();
            if (props.selectedProviderId() === 'moonshine') props.onTestMoonshine();
        } else {
            if (props.selectedProviderId() === 'moonshine' && props.moonshineModelStatus() !== 'downloaded') {
                return;
            }
            if (props.selectedProviderId() === 'elevenlabs') {
                props.onTestElevenLabs();
            } else if (props.selectedProviderId() === 'moonshine') {
                props.onTestMoonshine();
            }
        }
    };

    return (
        <div class="w-full max-w-lg space-y-6">
            {/* --- Provider Selection Cards --- */}
            <div>
                <Label class="mb-2 block text-sm font-medium text-neutral-300">Speech-to-Text Provider</Label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <For each={props.availableProviders}>
                        {(provider) => {
                            const isSelected = () => props.selectedProviderId() === provider.id;
                            const imageSrc = provider.logoUrl;

                            return (
                                <Button
                                    variant="outline"
                                    class={cn(
                                        'h-auto p-4 flex flex-col items-center justify-center space-y-2 text-base border',
                                        'transition-colors duration-150 ease-in-out',
                                        'cursor-pointer hover:bg-neutral-700 hover:border-neutral-600 focus:outline-none focus:ring-0 border-neutral-700',
                                        isSelected()
                                            ? 'bg-neutral-700 text-foreground border-neutral-500 ring-2 ring-primary ring-offset-2 ring-offset-background'
                                            : 'bg-neutral-800 text-neutral-300'
                                    )}
                                    onClick={() => props.onSelectProvider(provider.id)}
                                    aria-pressed={isSelected()}
                                >
                                    <Show when={imageSrc} fallback={
                                        <div class="w-12 h-12 mb-2 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl">
                                            {provider.name.substring(0, 1)}
                                        </div>
                                    }>
                                        {(src) => (
                                            <img
                                                src={src()}
                                                alt={`${provider.name} Logo`}
                                                class="w-12 h-12 mb-2 object-contain rounded-full"
                                            />
                                        )}
                                    </Show>
                                    <span class="text-sm text-center">{provider.name}</span>
                                </Button>
                            );
                        }}
                    </For>
                </div>
            </div>

            {/* --- Settings & Test Area (Simplified) --- */}
            <Show when={selectedProvider()}>
                {(currentProvider) => (
                    <div class="space-y-4 pt-4">
                        {/* ElevenLabs API Key */}
                        <Show when={currentProvider().id === 'elevenlabs' && currentProvider().requiresApiKey}>
                            <TextField>
                                <TextFieldLabel for="elevenlabs-stt-api-key" class="text-neutral-300">API Key</TextFieldLabel>
                                <TextFieldInput
                                    id="elevenlabs-stt-api-key"
                                    type="password"
                                    placeholder="Enter your ElevenLabs API Key"
                                    value={props.elevenLabsApiKey()}
                                    onInput={(e) => props.onElevenLabsApiKeyChange(e.currentTarget.value)}
                                    class="bg-neutral-750 border-neutral-600 text-neutral-100 placeholder-neutral-400"
                                />
                            </TextField>
                        </Show>

                        {/* Moonshine WebGPU Info */}
                        <Show when={currentProvider().id === 'moonshine'}>
                            <div class="flex items-center space-x-2 text-sm p-3 bg-neutral-800 rounded-md border border-neutral-700 mb-3">
                                <Info size={20} class={localWebGpuSupported() ? "text-green-400" : "text-yellow-400"} />
                                <p class="text-neutral-300">
                                    WebGPU: {' '}
                                    <Show when={localWebGpuSupported() === undefined} fallback={
                                        <span class={localWebGpuSupported() ? "text-green-400" : "text-yellow-400"}>
                                            {localWebGpuSupported() ? "Supported" : "Not Supported"}
                                        </span>
                                    }>
                                        <span class="text-neutral-400">Checking...</span>
                                    </Show>
                                    <span class="text-neutral-400"> (Moonshine runs locally, falls back to WASM)</span>
                                </p>
                            </div>
                            {/* Moonshine Model Download Section */}
                            <Switch>
                                <Match when={props.moonshineModelStatus() === 'not-checked' || props.moonshineModelStatus() === 'not-downloaded'}>
                                    <Button 
                                        onClick={props.onDownloadMoonshineModel} 
                                        variant="outline" 
                                        class="w-full mb-3"
                                        disabled={props.moonshineModelStatus() === 'not-checked'}
                                    >
                                        <DownloadSimple class="h-5 w-5 mr-2" />
                                        {props.moonshineModelStatus() === 'not-checked' ? 'Checking Model...' : 'Download Moonshine Model'}
                                    </Button>
                                </Match>
                                <Match when={props.moonshineModelStatus() === 'downloading'}>
                                    <div class="mb-3 space-y-1">
                                        <Label class="text-sm text-neutral-400">Downloading Model...</Label>
                                        <Progress value={props.moonshineDownloadProgress ? props.moonshineDownloadProgress() : 0} class="w-full" />
                                        {props.moonshineDownloadProgress && <p class="text-xs text-center text-neutral-400">{props.moonshineDownloadProgress()}%</p>}
                                    </div>
                                </Match>
                                <Match when={props.moonshineModelStatus() === 'error'}>
                                    <div class="mb-3 p-2 bg-destructive/20 border border-destructive/50 rounded text-center">
                                        <p class="text-destructive text-sm">Model download failed.</p>
                                        <Button onClick={props.onDownloadMoonshineModel} variant="link" class="text-destructive text-sm h-auto p-0 hover:underline">
                                            Try again
                                        </Button>
                                    </div>
                                </Match>
                            </Switch>
                        </Show>
                        
                        {/* STT Test Area */}
                        <div class="space-y-3 pt-2">
                            <Label class="text-neutral-300 block mb-1">Test Transcription</Label>
                            <Button 
                                onClick={handleTestPress} 
                                disabled={
                                    (currentProvider().id === 'elevenlabs' && !props.elevenLabsApiKey() && !props.isRecording() && !currentProviderTesting()) || 
                                    (currentProvider().id === 'moonshine' && props.moonshineModelStatus() !== 'downloaded' && !props.isRecording() && !currentProviderTesting()) ||
                                    (currentProviderTesting() && !props.isRecording())
                                } 
                                class="w-full flex items-center justify-center gap-2"
                                variant={props.isRecording() || currentProviderTesting() ? "destructive" : "secondary"}
                            >
                                <Show when={!props.isRecording() && !currentProviderTesting()} fallback={
                                    <>
                                        <StopCircle class="h-5 w-5" />
                                        {currentProviderTesting() ? "Processing..." : "Stop Recording"}
                                    </>
                                }>
                                    <Microphone class="h-5 w-5" />
                                    Record & Transcribe
                                </Show>
                            </Button>
                             <Show when={props.isRecording() && !currentProviderTesting()}>
                                <p class="text-sm text-center text-sky-400 animate-pulse">Recording audio...</p>
                            </Show>

                            {/* Transcribed Text Display */}
                            <Show when={props.transcribedText() && !currentProviderTesting()}>
                                <div class="mt-3 p-3 bg-neutral-800 border border-neutral-700 rounded-md">
                                    <Label class="text-neutral-300">Result:</Label>
                                    <p class="text-neutral-100 whitespace-pre-wrap">{props.transcribedText()}</p>
                                </div>
                            </Show>

                            {/* Error Display */}
                            <Show when={props.sttTestError() && !currentProviderTesting()}>
                                <p class="text-destructive text-sm mt-2">Error: {props.sttTestError()?.message}</p>
                            </Show>
                        </div>
                    </div>
                )}
            </Show>
        </div>
    );
};

export default SttProviderPanel; 