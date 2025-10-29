import { getSettingsService } from './settings'

interface LanguageNumbers {
  units: string[];
  teens: string[];
  tens: string[];
  hundreds: string[];
}

export function getTTSService() {
  const language = initializeLanguage()
  const numbers = getLanguageNumbers(language)
  let apiKey: string | null = null
  let apiKeyChecked = false

  async function checkApiKey(): Promise<void> {
    if (apiKeyChecked) return

    try {
      const settingsService = getSettingsService()
      const settings = await settingsService.get()

      if (settings?.tts_api_key && settings.tts_api_key.length >= 20) {
        apiKey = settings.tts_api_key
      } else {
        apiKey = null
        if (settings?.tts_api_key && settings.tts_api_key.length < 20) {
          console.warn('TTS API key is too short (minimum 20 characters required), falling back to browser TTS')
        }
      }
    } catch (error) {
      console.error('Failed to fetch TTS API key from settings:', error)
      apiKey = null
    }

    apiKeyChecked = true
  }

  async function getAudioUrl(text: string): Promise<string | undefined> {
    if (!apiKey) return undefined

    try {
      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: language,
            ssmlGender: 'MALE'
          },
          audioConfig: { audioEncoding: 'MP3' }
        })
      })

      const data = await response.json()
      if (!data.audioContent) {
        console.error('Google TTS API error:', data)
        return undefined
      }

      const audioContent = data.audioContent as string
      const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' })
      return URL.createObjectURL(audioBlob)
    } catch (error) {
      console.error('Google TTS API request failed:', error)
      return undefined
    }
  }

  function speakWithBrowser(text: string): void {
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = language
      synth.cancel()
      synth.speak(utter)
    } catch (e) {
      console.error('Browser TTS failed:', e)
    }
  }

  async function speak(text: string): Promise<void> {
    // Check for API key on first call
    await checkApiKey()

    // Try Google TTS API first if we have a key
    if (apiKey) {
      try {
        const audioUrl = await getAudioUrl(text)
        if (audioUrl) {
          const audio = new Audio(audioUrl)
          await audio.play()
          return
        }
      } catch (error) {
        console.warn('Google TTS failed, falling back to browser TTS:', error)
      }
    }

    // Fallback to browser's native speech synthesis
    speakWithBrowser(text)
  }

  function numberToWords(num: number): string {
    let words: string[] = []
    if (num === 0) {
      words.push('0')
    } else {
      const unitsPart = num % 10
      const tensPart = Math.floor(num / 10) % 10
      const hundredsPart = Math.floor(num / 100)

      if (hundredsPart > 0) {
        words.push(numbers.hundreds[hundredsPart])
      }
      if (tensPart > 1) {
        words.push(numbers.tens[tensPart])
      }
      if (tensPart === 1) {
        words.push(numbers.teens[unitsPart])
      } else {
        words.push(numbers.units[unitsPart])
      }
    }
    return words.filter(word => word).join(' ')
  }

  function digitsToPrice(num: number): string {
    const integer = Math.floor(num)
    const decimal = Math.round((num - integer) * 100)
    let words: string[] = []

    if (integer > 0) {
      words.push(numberToWords(integer))
    }

    if (decimal > 0) {
      if (integer !== 0 && language === 'lt-LT') {
        if (integer === 1 || (integer % 10 === 1 && integer % 100 !== 11)) {
          words.push('euras')
        } else if (integer % 10 === 0 || integer % 10 >= 10 || (integer % 100 >= 10 && integer % 100 <= 20)) {
          words.push('eurų')
        } else {
          words.push('eurai')
        }
        words.push('ir')
      } else if (integer > 1 && language === 'en-GB') {
        words.push('euros')
      } else if (integer === 1 && language === 'en-GB') {
        words.push('euro')
      }

      words.push(numberToWords(decimal))
      if (language === 'en-GB' && decimal === 1) {
        words.push('cent')
      } else if (language === 'en-GB') {
        words.push('cents')
      } else if (decimal === 1 || (decimal % 10 === 1 && decimal % 100 !== 11)) {
        words.push('centas')
      } else if (decimal % 10 === 0 || decimal % 10 >= 10 || (decimal % 100 >= 10 && decimal % 100 <= 20)) {
        words.push('centų')
      } else {
        words.push('centai')
      }
    }

    return words.filter(word => word).join(' ')
  }

  return { speak, numberToWords, digitsToPrice }
}

function initializeLanguage(): string {
  const lang = window.navigator.language.split('-')[0]
  return lang === 'lt' ? 'lt-LT' : 'en-GB'
}

function getLanguageNumbers(language: string): LanguageNumbers {
  const languageMap: { [key: string]: LanguageNumbers } = {
    'lt-LT': {
      units: ['', 'vienas', 'du', 'trys', 'keturi', 'penki', 'šeši', 'septyni', 'aštuoni', 'devyni'],
      teens: ['dešimt', 'vienuolika', 'dvylika', 'trylika', 'keturiolika', 'penkiolika', 'šešiolika', 'septyniolika', 'aštuoniolika', 'devyniolika'],
      tens: ['', '', 'dvidešimt', 'trisdešimt', 'keturiasdešimt', 'penkiasdešimt', 'šešiasdešimt', 'septyniasdešimt', 'aštuoniasdešimt', 'devyniasdešimt'],
      hundreds: ['', 'šimtas', 'du šimtai', 'trys šimtai', 'keturi šimtai', 'penki šimtai', 'šeši šimtai', 'septyni šimtai', 'aštuoni šimtai', 'devyni šimtai'],
    },
    'en-GB': {
      units: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
      teens: ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
      tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
      hundreds: ['', 'one hundred', 'two hundred', 'three hundred', 'four hundred', 'five hundred', 'six hundred', 'seven hundred', 'eight hundred', 'nine hundred'],
    }
  }
  return languageMap[language] || languageMap['en-GB']
}

export type TTSService = ReturnType<typeof getTTSService>
