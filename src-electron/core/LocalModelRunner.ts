import { join } from 'path'
import os from 'os'

export class LocalModelRunner {
  private llama: any = null
  private model: any = null
  private context: any = null
  private session: any = null

  async initialize(modelPath: string) {
    try {
      console.log(`[LocalModelRunner] Initializing with model: ${modelPath}`)
      const { getLlama, LlamaChatSession } = await import('node-llama-cpp')
      
      this.llama = await getLlama()
      this.model = await this.llama.loadModel({ 
        modelPath,
        gpuLayers: 0 // Force CPU-only to prevent "Failed to load model" errors on limited VRAM
      })
      
      // Optimization: Extremely low memory footprint for laptops
      const threads = Math.max(1, Math.floor(os.cpus().length / 2))
      
      this.context = await this.model.createContext({
        threads,
        contextSize: 512, // Minimal context to prevent VRAM errors
        flashAttention: false // Disable to save VRAM
      })
      
      this.session = new LlamaChatSession({
        contextSequence: this.context.getSequence()
      })
      
      console.log('[LocalModelRunner] Initialization successful')
      return { success: true }
    } catch (err: any) {
      console.error('[LocalModelRunner] Init error:', err)
      let message = err.message
      if (message.includes('NoBinaryFoundError')) {
        message = 'AI Engine binaries not found. We are downloading them now, please wait a minute and try again.'
      }
      return { success: false, error: message }
    }
  }

  async getEmbedding(text: string) {
    if (!this.model) {
      throw new Error('Model not loaded')
    }
    const { LlamaEmbeddingContext } = await import('node-llama-cpp')
    const embeddingContext = new LlamaEmbeddingContext({
      model: this.model
    })
    return await embeddingContext.getEmbeddingFor(text)
  }

  async chat(messages: { role: string; content: string }[], onToken?: (chunk: string) => void) {
    if (!this.session) {
        throw new Error('Local model not initialized. Please load a model first.')
    }

    const lastMessage = messages[messages.length - 1].content

    return await this.session.prompt(lastMessage, {
      onToken: (chunk: string) => {
        onToken?.(chunk)
      }
    })
  }

  isLoaded() {
    return !!this.model
  }
}
