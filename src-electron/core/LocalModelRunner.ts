import { join } from 'path'

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
      this.model = await this.llama.loadModel({ modelPath })
      this.context = await this.model.createContext()
      
      // Use Gemma chat wrapper if available, or fallback to default
      this.session = new LlamaChatSession({
        contextSequence: this.context.getSequence()
      })
      
      console.log('[LocalModelRunner] Initialization successful')
      return { success: true }
    } catch (err: any) {
      console.error('[LocalModelRunner] Init error:', err)
      return { success: false, error: err.message }
    }
  }

  async chat(messages: { role: string; content: string }[], onToken?: (chunk: string) => void) {
    if (!this.session) {
        throw new Error('Local model not initialized. Please load a model first.')
    }

    const lastMessage = messages[messages.length - 1].content

    return await this.session.prompt(lastMessage, {
      onToken: (tokens: any) => {
        const text = this.llama.detokenize(tokens)
        onToken?.(text)
      }
    })
  }

  isLoaded() {
    return !!this.model
  }
}
