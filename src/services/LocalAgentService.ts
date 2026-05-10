export interface LocalMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class LocalAgentService {
  private static modelPath = ''
  private static isLoaded = false

  static async loadModel(path: string) {
    this.modelPath = path
    const res = await window.em.localAiLoad(path)
    if (res.success) {
      this.isLoaded = true
    }
    return res
  }

  static async chat(messages: LocalMessage[], onStream?: (content: string) => void) {
    if (!this.isLoaded && this.modelPath) {
        await this.loadModel(this.modelPath)
    }

    if (onStream) {
      const removeListener = window.em.onLocalAiToken((token: string) => {
        onStream(token)
      })
      
      try {
        const response = await window.em.localAiChat({ messages })
        return response
      } finally {
        removeListener()
      }
    } else {
      return await window.em.localAiChat({ messages })
    }
  }

  static setModelPath(path: string) {
    this.modelPath = path
  }

  static getIsLoaded() {
    return this.isLoaded
  }
}
