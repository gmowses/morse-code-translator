import { useState, useRef, useCallback } from 'react'
import { Copy, Sun, Moon, Languages, Radio, Play, Square } from 'lucide-react'

const translations = {
  en: {
    title: 'Morse Code Translator',
    subtitle: 'Translate text to Morse code and back. Play audio with speed control using Web Audio API.',
    textToMorse: 'Text to Morse',
    morseToText: 'Morse to Text',
    inputText: 'Input text',
    inputMorse: 'Input Morse (use . and - separated by spaces)',
    output: 'Output',
    textPlaceholder: 'Type your message here...',
    morsePlaceholder: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
    play: 'Play Audio',
    stop: 'Stop',
    speed: 'Speed (WPM)',
    copy: 'Copy',
    copied: 'Copied!',
    legend: 'Morse Code Reference',
    builtBy: 'Built by',
  },
  pt: {
    title: 'Tradutor de Codigo Morse',
    subtitle: 'Traduza texto para codigo Morse e vice-versa. Reproduza audio com controle de velocidade.',
    textToMorse: 'Texto para Morse',
    morseToText: 'Morse para Texto',
    inputText: 'Texto de entrada',
    inputMorse: 'Morse de entrada (use . e - separados por espacos)',
    output: 'Saida',
    textPlaceholder: 'Digite sua mensagem aqui...',
    morsePlaceholder: '.... . .-.. .-.. --- / .-- --- .-. .-.. -..',
    play: 'Reproduzir Audio',
    stop: 'Parar',
    speed: 'Velocidade (WPM)',
    copy: 'Copiar',
    copied: 'Copiado!',
    legend: 'Referencia do Codigo Morse',
    builtBy: 'Criado por',
  },
} as const

type Lang = keyof typeof translations

const MORSE_MAP: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.', ' ': '/',
}

const REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([k, v]) => [v, k])
)

function textToMorse(text: string): string {
  return text.toUpperCase().split('').map(c => MORSE_MAP[c] ?? '').filter(Boolean).join(' ')
}

function morseToText(morse: string): string {
  return morse.split(' / ').map(word =>
    word.split(' ').map(symbol => REVERSE_MAP[symbol] ?? '?').join('')
  ).join(' ')
}

function wpmToDotDuration(wpm: number): number {
  // PARIS standard: 50 dots per word, 1200/wpm ms per dot
  return 1200 / wpm
}

export default function MorseCodeTranslator() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [mode, setMode] = useState<'text2morse' | 'morse2text'>('text2morse')
  const [input, setInput] = useState('HELLO WORLD')
  const [wpm, setWpm] = useState(15)
  const [playing, setPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const stopRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const t = translations[lang]

  const toggleDark = () => {
    setDark(d => {
      document.documentElement.classList.toggle('dark', !d)
      return !d
    })
  }

  const output = mode === 'text2morse' ? textToMorse(input) : morseToText(input)

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const playMorse = useCallback(async () => {
    const morseStr = mode === 'text2morse' ? output : input
    if (!morseStr || playing) return

    stopRef.current = false
    setPlaying(true)

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    const dot = wpmToDotDuration(wpm) / 1000
    const dash = dot * 3
    const symbolGap = dot
    const letterGap = dot * 3
    const wordGap = dot * 7
    const freq = 650

    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms))

    const beep = async (dur: number) => {
      if (stopRef.current) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      osc.start()
      await sleep(dur * 1000)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      osc.stop()
      await sleep(symbolGap * 1000)
    }

    const symbols = morseStr.split(' ')
    for (let i = 0; i < symbols.length; i++) {
      if (stopRef.current) break
      const sym = symbols[i]
      if (sym === '/') {
        await sleep(wordGap * 1000)
      } else {
        for (const c of sym) {
          if (stopRef.current) break
          await beep(c === '.' ? dot : dash)
        }
        if (i < symbols.length - 1 && symbols[i + 1] !== '/') {
          await sleep(letterGap * 1000)
        }
      }
    }

    setPlaying(false)
  }, [mode, output, input, wpm, playing])

  const stopMorse = () => {
    stopRef.current = true
    setPlaying(false)
  }

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const DIGITS = '0123456789'

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Radio size={18} className="text-white" />
            </div>
            <span className="font-semibold">Morse Code Translator</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />
              {lang.toUpperCase()}
            </button>
            <button onClick={toggleDark} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/morse-code-translator" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-fit">
            {([['text2morse', t.textToMorse], ['morse2text', t.morseToText]] as const).map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setInput('') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === m ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <label className="text-sm font-medium">{mode === 'text2morse' ? t.inputText : t.inputMorse}</label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={mode === 'text2morse' ? t.textPlaceholder : t.morsePlaceholder}
                rows={6}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              {/* Speed control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">{t.speed}</label>
                  <span className="text-sm font-bold text-yellow-500">{wpm} WPM</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={40}
                  value={wpm}
                  onChange={e => setWpm(Number(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <div className="flex justify-between text-xs text-zinc-400"><span>5</span><span>40</span></div>
              </div>
              <div className="flex gap-3">
                {playing ? (
                  <button
                    onClick={stopMorse}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                  >
                    <Square size={14} />
                    {t.stop}
                  </button>
                ) : (
                  <button
                    onClick={playMorse}
                    disabled={!output}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-600 transition-colors disabled:opacity-40"
                  >
                    <Play size={14} />
                    {t.play}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t.output}</label>
                <button
                  onClick={handleCopy}
                  disabled={!output}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                >
                  <Copy size={12} />
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <div className="min-h-[160px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 font-mono text-sm break-all whitespace-pre-wrap select-all">
                {output || <span className="text-zinc-400 italic">...</span>}
              </div>
            </div>
          </div>

          {/* Reference table */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <h2 className="font-semibold">{t.legend}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-13 gap-2">
                {LETTERS.split('').map(c => (
                  <div key={c} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-2 text-center">
                    <div className="font-bold text-sm">{c}</div>
                    <div className="font-mono text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">{MORSE_MAP[c]}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {DIGITS.split('').map(c => (
                  <div key={c} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-2 text-center">
                    <div className="font-bold text-sm">{c}</div>
                    <div className="font-mono text-[10px] text-yellow-600 dark:text-yellow-400 mt-0.5">{MORSE_MAP[c]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-yellow-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
