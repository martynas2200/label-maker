import { getSettingsService } from '../api/settings'

export interface LanguageNumbers {
  units: string[];
  teens: string[];
  tens: string[];
  hundreds: string[];
}


export class TextToVoice {
  private language: string
  private apiKey: string | null = null
  private numbers: LanguageNumbers
  private languages: {
    [key: string]: LanguageNumbers
  } = {
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
  };

  constructor () {
    this.language = window.navigator.language.split('-')[0]
    if (this.language == 'lt') {
      this.language = 'lt-LT'
    } else {
      this.language = 'en-GB'
    }
    this.numbers = this.languages[this.language]
    void this.checkApiKey()
  }
  async checkApiKey (): Promise<void> {
    try {
      const settingsService = getSettingsService()
      const settings = await settingsService.get()

      if (settings?.tts_api_key && settings.tts_api_key.length >= 20) {
        this.apiKey = settings.tts_api_key
      } else {
        this.apiKey = null
        if (settings?.tts_api_key && settings.tts_api_key.length < 20) {
          console.warn('TTS API key is too short (minimum 20 characters required)')
        }
      }
    } catch (error) {
      console.error('Failed to fetch TTS API key from settings:', error)
      this.apiKey = null
    }
  }

  public async speak (text: string): Promise<void> {
      const audio = new Audio(await this.getAudioUrl(text))
      void audio.play()
  }

  private async getAudioUrl (text: string): Promise<string | undefined> {
    if (this.apiKey == null) {
      return
    }
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: this.language,
          ssmlGender: 'MALE'
        },
        audioConfig: { audioEncoding: 'MP3' }
      })
    })
    const data = await response.json()
    if (data.audioContent == null) {
      // this.notifier.error({ title: i18n('error'), message: JSON.stringify(data) })
      return
    }
    const audioContent = data.audioContent as string
    const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' })
    return URL.createObjectURL(audioBlob)
  }

  numberToWords (number: number): string {
    let words = []
    if (number === 0) {
      words.push(0)
    } else {
      const unitsPart = number % 10
      const tensPart = Math.floor(number / 10) % 10
      const hundredsPart = Math.floor(number / 100)
      if (hundredsPart > 0) {
        words.push(this.numbers.hundreds[hundredsPart])
      }
      if (tensPart > 1) {
        words.push(this.numbers.tens[tensPart])
      }
      if (tensPart === 1) {
        words.push(this.numbers.teens[unitsPart])
      } else {
        words.push(this.numbers.units[unitsPart])
      }
    }
    words = words.filter(word => word)
    return words.join(' ')
  }

  digitsToPrice (number: number): string {
    const integer = Math.floor(number)
    const decimal = Math.round((number - integer) * 100)
    let words = []
    if (integer > 0) {
      words.push(this.numberToWords(integer))
    }

    if (decimal > 0) {
      // euras, eurai, eurų
      if (integer !== 0 && this.language == 'lt-LT') {
        if (integer === 1 || (integer % 10 === 1 && integer % 100 !== 11)) {
          words.push('euras')
        } else if (integer % 10 === 0 || integer % 10 >= 10 || (integer % 100 >= 10 && integer % 100 <= 20)) {
          words.push('eurų')
        } else {
          words.push('eurai')
        }
        words.push('ir')
      } else if (integer > 1 && this.language == 'en-GB') {
        words.push('euros')
      } else  if (integer === 1 && this.language == 'en-GB') {
        words.push('euro')
      }
      words.push(this.numberToWords(decimal))
      if (this.language == 'en-GB' && decimal === 1) {
        words.push('cent')
      } else if (this.language == 'en-GB') {
        words.push('cents')
      } else if (decimal === 1 || (decimal % 10 === 1 && decimal % 100 !== 11)) {
        words.push('centas')
      } else if (decimal % 10 === 0 || decimal % 10 >= 10 || (decimal % 100 >= 10 && decimal % 100 <= 20)) {
        words.push('centų')
      } else {
        words.push('centai')
      }
    }
    words = words.filter(word => word)
    return words.join(' ')
  }

}
