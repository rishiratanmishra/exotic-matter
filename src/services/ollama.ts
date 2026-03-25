export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class OllamaService {
  private static baseUrl = 'http://127.0.0.1:11434/api'
  private static model = 'codellama' // Default model

  static setBaseUrl(url: string) {
    this.baseUrl = url.endsWith('/api') ? url : `${url}/api`
  }

  static async chat(messages: OllamaMessage[], onStream?: (content: string) => void) {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: !!onStream,
        }),
      })

      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`)

      if (onStream) {
        const reader = response.body?.getReader()
        if (!reader) return ''
        
        let fullContent = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (!line.trim()) continue
            const json = JSON.parse(line)
            if (json.message?.content) {
              fullContent += json.message.content
              onStream(json.message.content)
            }
          }
        }
        return fullContent
      } else {
        const data = await response.json()
        return data.message.content
      }
    } catch (err) {
      console.error('Ollama chat error:', err)
      return `Error: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  static setModel(model: string) {
    this.model = model
  }
}
