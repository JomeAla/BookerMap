class SpeechService {
  private recognition: SpeechRecognition | null = null
  private synthesis: SpeechSynthesisUtterance | null = null
  private isListening = false
  private isSpeaking = false
  private onResultCallback: ((text: string) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null
  private onEndCallback: (() => void) | null = null

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    const hasRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    const hasSynthesis = 'speechSynthesis' in window
    return hasRecognition && hasSynthesis
  }

  private getRecognition(): SpeechRecognition | null {
    if (this.recognition) return this.recognition
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return null
    this.recognition = new SpeechRecognitionAPI()
    return this.recognition
  }

  startListening(language = 'en-US'): void {
    if (this.isListening) return
    const rec = this.getRecognition()
    if (!rec) {
      this.onErrorCallback?.('Speech recognition not supported')
      return
    }
    rec.lang = language
    rec.continuous = false
    rec.interimResults = false

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript || ''
      this.isListening = false
      this.onResultCallback?.(transcript)
    }

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false
      this.onErrorCallback?.(event.error)
    }

    rec.onend = () => {
      this.isListening = false
      this.onEndCallback?.()
    }

    try {
      rec.start()
      this.isListening = true
    } catch {
      this.isListening = false
      this.onErrorCallback?.('Failed to start speech recognition')
    }
  }

  stopListening(): void {
    if (!this.recognition || !this.isListening) return
    try {
      this.recognition.stop()
    } catch {}
    this.isListening = false
  }

  speak(text: string, language = 'en-US'): void {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onstart = () => {
      this.isSpeaking = true
    }
    utterance.onend = () => {
      this.isSpeaking = false
      this.synthesis = null
    }
    utterance.onerror = () => {
      this.isSpeaking = false
      this.synthesis = null
    }
    this.synthesis = utterance
    window.speechSynthesis.speak(utterance)
  }

  stopSpeaking(): void {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    this.isSpeaking = false
    this.synthesis = null
  }

  onResult(callback: (text: string) => void): void {
    this.onResultCallback = callback
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback
  }

  onEnd(callback: () => void): void {
    this.onEndCallback = callback
  }

  getIsListening(): boolean {
    return this.isListening
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking
  }

  destroy(): void {
    this.stopListening()
    this.stopSpeaking()
    if (this.recognition) {
      try { this.recognition.abort() } catch {}
      this.recognition = null
    }
    this.onResultCallback = null
    this.onErrorCallback = null
    this.onEndCallback = null
  }
}

let instance: SpeechService | null = null

export function getSpeechService(): SpeechService {
  if (!instance) {
    instance = new SpeechService()
  }
  return instance
}

export { SpeechService }
