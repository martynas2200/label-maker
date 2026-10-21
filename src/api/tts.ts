import { getApi } from './api'

export type SpeechPhrase = 'quantity' | 'price'

export function getTTSService() {
  const api = getApi()
  const language = window.navigator.language.split('-')[0] || 'en'

  async function speak(phraseType: SpeechPhrase, value: number): Promise<void> {
    try {
      const data = await api.call('label_maker.api.settings.synthesize_speech', {
        phrase_type: phraseType,
        value,
        language,
      })
      const audioContent = data?.audioContent
      if (!audioContent) throw new Error('No audio returned')

      await new Audio(`data:audio/mp3;base64,${audioContent}`).play()
    } catch (error) {
      console.error('Server TTS failed:', error)
    }
  }

  return { speak }
}

export type TTSService = ReturnType<typeof getTTSService>
