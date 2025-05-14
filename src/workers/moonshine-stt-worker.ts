import { pipeline, AutoModel, env } from "@huggingface/transformers";

// Disable local model checks for Transformers.js in a Web Worker context for now
// as we will be controlling model loading more directly or via cache.
env.allowLocalModels = false;
env.useBrowserCache = false; // We will manage caching explicitly via Cache API if needed

let transcriber: any = null;
let vadModel: any = null;
const SAMPLE_RATE = 16000;

// Define allowed DType strings for better type checking
type DTypeString = "auto" | "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4" | "bnb4" | "q4f16";

async function initializeModels() {
    self.postMessage({ type: "status", status: "loading_models", message: "Loading VAD model..." });
    try {
        // VAD Model (Silero VAD)
        // Attempting to provide a more complete PretrainedConfig for the custom model type.
        // These are educated guesses and might need adjustment based on the model's actual architecture
        // or how Transformers.js expects 'custom' types to be configured.
        vadModel = await AutoModel.from_pretrained("onnx-community/silero-vad", {
            config: { 
                model_type: "custom",
                // Attempting to satisfy PretrainedConfig requirements:
                is_encoder_decoder: false, // Typically false for models like VAD
                max_position_embeddings: 512, // A common default, might not be used
                "transformers.js_config": {}, // Corrected typo: Placeholder
                normalized_config: {}, // Placeholder
                // architectures: ["AudioClassificationModel"], // Removed as it caused an error
             },
            dtype: "fp32", 
            // Consider how to make this use cached files if downloaded by background
        });
        self.postMessage({ type: "status", status: "loading_models", message: "VAD model loaded. Loading ASR model..." });

        // ASR Model (Moonshine)
        let determinedDevice: 'wasm' | 'webgpu' = 'wasm'; // Default to WASM
        // In a real scenario, you would call a supportsWebGPU() function here:
        // if (await supportsWebGPU()) { determinedDevice = 'webgpu'; }
        
        const modelDtypeConfig: { encoder_model: DTypeString, decoder_model_merged: DTypeString } = 
            determinedDevice === 'webgpu' 
            ? { encoder_model: "fp32", decoder_model_merged: "q4" } 
            : { encoder_model: "fp32", decoder_model_merged: "q8" };

        transcriber = await pipeline(
            "automatic-speech-recognition",
            "onnx-community/moonshine-base-ONNX",
            {
                device: determinedDevice,
                dtype: modelDtypeConfig, // Use the pre-calculated config
                // TODO: Critical part - configure to use files from Cache API if downloaded by background script.
                // This might involve a custom fetch function or specific URL construction if background intercepts.
            }
        );

        // Perform a warm-up/compilation step if needed
        await transcriber(new Float32Array(SAMPLE_RATE)); 

        self.postMessage({ type: "status", status: "ready", message: "Moonshine STT models ready." });
        return true;
    } catch (error: any) {
        console.error("Error loading STT models in worker:", error);
        self.postMessage({ type: "error", message: "Failed to load STT models: " + error.message });
        return false;
    }
}

self.onmessage = async (event) => {
    const { type, payload } = event.data;

    if (type === "INIT") {
        await initializeModels();
    } else if (type === "PROCESS_AUDIO") {
        if (!transcriber || !vadModel) {
            self.postMessage({ type: "error", message: "STT models not initialized." });
            return;
        }
        if (!payload || !payload.audioBuffer) {
            self.postMessage({ type: "error", message: "No audio buffer provided." });
            return;
        }

        const audioBuffer = new Float32Array(payload.audioBuffer);
        console.log(`[STT Worker] Received audio chunk, length: ${audioBuffer.length}`);

        // Simplified VAD and transcription logic (based on demo)
        // TODO: Implement proper VAD logic from the Moonshine demo if desired (state, sr tensors etc.)
        self.postMessage({ type: "status", status: "transcribing", message: "Transcribing audio..." });
        try {
            // Placeholder: In a real scenario, VAD would be used to segment speech.
            // For now, we transcribe the whole chunk received.
            const { text } = await transcriber(audioBuffer, {
                // chunk_length_s: 30, // Example, adjust as needed
                // stride_length_s: 5, // Example, adjust as needed
            });
            console.log("[STT Worker] Transcription result:", text);
            self.postMessage({ type: "transcription_result", text: text });
        } catch (error: any) {
            console.error("Error during transcription in worker:", error);
            self.postMessage({ type: "error", message: "Transcription failed: " + error.message });
        }
    }
};

// Initial message to confirm worker is alive (optional)
console.log("[Moonshine STT Worker] Worker script loaded and running.");
self.postMessage({ type: "status", status: "worker_loaded", message: "STT Worker alive." }); 