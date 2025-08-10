'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mic, MicOff, X, Download, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { Document, Packer, Paragraph, TextRun } from 'docx'

// Language options for speech recognition
const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'ar-SA', name: 'Arabic' }
]

// Mock transcript data for testing
const MOCK_TRANSCRIPTS = [
  "Hello, this is a test of the speech recognition system.",
  "The quick brown fox jumps over the lazy dog.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Testing one two three, can you hear me clearly?",
  "This is a simulation of continuous speech input.",
  "The weather is beautiful today, isn't it?",
  "I'm debugging the speech-to-text functionality.",
  "Please continue with the next test phrase.",
  "The microphone is working perfectly in simulation mode.",
  "This helps me test without speaking constantly."
]

// TypeScript interfaces for Web Speech API
interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    startMockRecording: () => void
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export default function SpeechToTextApp() {
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null)
  const [lastTranscript, setLastTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMockMode, setIsMockMode] = useState(false)
  const [mockSpeed, setMockSpeed] = useState(1000) // milliseconds between mock phrases
  const [isSummarizing, setIsSummarizing] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const leftTextareaRef = useRef<HTMLTextAreaElement>(null)
  const rightTextareaRef = useRef<HTMLTextAreaElement>(null)
  const isRecordingRef = useRef(isRecording)
  const mockTranscriptIndexRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Mock speech recognition function
  const startMockRecording = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
    }

    mockIntervalRef.current = setInterval(() => {
        debugger
      if (!isRecordingRef.current) return
      const transcript = MOCK_TRANSCRIPTS[mockTranscriptIndexRef.current % MOCK_TRANSCRIPTS.length]
      mockTranscriptIndexRef.current++

      // Simulate interim results first
      setIsProcessing(true)
      setLastTranscript(transcript)

      // After a short delay, make it final
      setTimeout(() => {
        debugger
        if (isRecordingRef.current) {
          setRightText(prev => {
            const newText = prev + (prev ? ' ' : '') + transcript
            return newText
          })
          setConfidenceScore(0.85 + Math.random() * 0.1) // Random confidence between 85-95%
          setLastTranscript(transcript)
          setIsProcessing(false)
        }
      }, 500) // Random delay between 1-2 seconds
    }, mockSpeed)

    console.log('mock recording started', mockIntervalRef.current)
  }, [mockSpeed])


  const stopMockRecording = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
      mockIntervalRef.current = null
    }
    setIsProcessing(false)
  }, [])

  const sendOpenAIChunk = async (blob: Blob) => {
    const formData = new FormData()
    formData.append('file', blob, 'chunk.webm')
    try {
      setIsProcessing(true)
      const res = await fetch('/api/openai-transcribe', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (data.text) {
        setRightText(prev => prev + (prev ? ' ' : '') + data.text.trim())
      }
    } catch (err) {
      console.error('OpenAI transcription error:', err)
      toast.error('OpenAI transcription error')
    } finally {
      setIsProcessing(false)
    }
  }

  const startOpenAIRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          sendOpenAIChunk(e.data)
        }
      }
      recorder.start(2000)
    } catch (err) {
      console.error('OpenAI record error:', err)
      toast.error('Failed to access microphone')
    }
  }

  const stopOpenAIRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder) {
      recorder.stream.getTracks().forEach(t => t.stop())
      recorder.stop()
      mediaRecorderRef.current = null
    }
  }

  // Switch between textareas with cursor at end
  const switchTextarea = useCallback(() => {
    const leftFocused = document.activeElement === leftTextareaRef.current
    const rightFocused = document.activeElement === rightTextareaRef.current

    if (leftFocused) {
      // Switch to right textarea
      if (rightTextareaRef.current) {
        rightTextareaRef.current.focus()
        rightTextareaRef.current.setSelectionRange(rightText.length, rightText.length)
        toast.success('Switched to right panel', {
          description: 'Used Ctrl+Shift+Tab shortcut'
        })
      }
    } else if (rightFocused) {
      // Switch to left textarea
      if (leftTextareaRef.current) {
        leftTextareaRef.current.focus()
        leftTextareaRef.current.setSelectionRange(leftText.length, leftText.length)
        toast.success('Switched to left panel', {
          description: 'Used Ctrl+Shift+Tab shortcut'
        })
      }
    } else {
      // If no textarea is focused, focus on left by default
      if (leftTextareaRef.current) {
        leftTextareaRef.current.focus()
        leftTextareaRef.current.setSelectionRange(leftText.length, leftText.length)
        toast.success('Focused on left panel', {
          description: 'Used Ctrl+Shift+Tab shortcut'
        })
      }
    }
  }, [leftText, rightText])

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        setIsSupported(true)
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = selectedLanguage

        let date = new Date()
        let dateDiff;
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = ''
          let finalTranscript = ''
          let bestConfidence = 0;

          dateDiff = new Date().getTime() - date.getTime()
          console.log(dateDiff)
          date = new Date()
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            const confidence = event.results[i][0].confidence

            console.log('latencia:', transcript, confidence)

            if (event.results[i].isFinal) {
              finalTranscript += transcript
              bestConfidence = Math.max(bestConfidence, confidence)
            } else {
              interimTranscript += transcript
            }
          }

          // Show interim results with thinking effect
          if (interimTranscript) {
            setIsProcessing(true)
            setLastTranscript(interimTranscript)
          }

          // Add final results to the text
          if (finalTranscript) {
            setRightText(prev => {
              const newText = prev + (prev ? ' ' : '') + finalTranscript
              return newText
            })
            setConfidenceScore(bestConfidence)
            setLastTranscript(finalTranscript)
            setIsProcessing(false)
          }
        }

        recognitionRef.current.onerror = (event: { error: string }) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
          setIsProcessing(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          toast.error(`Speech recognition error: ${event.error}`)
        }

        recognitionRef.current.onend = () => {
          setIsProcessing(false)
          // Restart recognition if we're still supposed to be recording
          if (isRecordingRef.current) {
            setTimeout(() => {
              if (recognitionRef.current && isRecordingRef.current) {
                recognitionRef.current.start()
              }
            }, 100)
          }
        }
      }
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'q':
            e.preventDefault()
            setLeftText(rightText)
            toast.success('Left panel overwritten with right content', {
              description: 'Used Alt+Q shortcut'
            })
            break
          case 'w':
            e.preventDefault()
            setLeftText(prev => prev + (prev ? ' ' : '') + rightText)
            toast.success('Right content appended to left panel', {
              description: 'Used Alt+W shortcut'
            })
            break
          case 'e':
            e.preventDefault()
            if (navigator.clipboard) {
              navigator.clipboard.writeText(leftText)
              toast.success('Left content copied to clipboard', {
                description: 'Used Alt+E shortcut'
              })
            } else {
              toast.error('Clipboard not supported in this browser')
            }
            break
        }
      }

      // New keyboard shortcuts for clearing and switching
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'l':
            e.preventDefault()
            clearLeftText()
            toast.success('Left panel cleared', {
              description: 'Used Ctrl+Shift+L shortcut'
            })
            break
          case 'r':
            e.preventDefault()
            clearRightText()
            toast.success('Right panel cleared', {
              description: 'Used Ctrl+Shift+R shortcut'
            })
            break
          case 'tab':
            e.preventDefault()
            switchTextarea()
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      const currentInterval = intervalRef.current
      if (currentInterval) {
        clearInterval(currentInterval)
      }
      const currentMockInterval = mockIntervalRef.current
      if (currentMockInterval) {
        clearInterval(currentMockInterval)
      }
    }
  }, [leftText, rightText, isRecording, selectedLanguage, switchTextarea])

  // Update language when selection changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage
    }
  }, [selectedLanguage])

  const toggleRecording = () => {
    // debugger
    if (isMockMode) {
      // Mock mode recording
      if (isRecording) {
        setIsRecording(false)
        isRecordingRef.current = false
        stopMockRecording()
        toast.info('Mock recording stopped')
      } else {
        setIsRecording(true)
        isRecordingRef.current = true
        startMockRecording()
        toast.success('Mock recording started - simulating speech!')
      }
    } else {
      // Real speech recognition or OpenAI fallback
      if (!isSupported) {
        if (isRecording) {
          setIsRecording(false)
          stopOpenAIRecording()
          toast.info('Recording stopped')
        } else {
          setIsRecording(true)
          startOpenAIRecording()
          toast.success('Recording started - speak now!')
        }
        return
      }

      if (isRecording) {
        // Set state first to prevent race condition in onend callback
        setIsRecording(false)
        isRecordingRef.current = false
        setIsProcessing(false)
        recognitionRef.current?.stop()
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        toast.info('Recording stopped')
      } else {
        setIsRecording(true)
        isRecordingRef.current = true
        recognitionRef.current?.start()
        toast.success('Recording started - speak now!')
      }
    }
  }

  const toggleMockMode = () => {
    if (isRecording) {
      // Stop current recording first
      if (isMockMode) {
        stopMockRecording()
      } else {
        recognitionRef.current?.stop()
      }
      setIsRecording(false)
      isRecordingRef.current = false
      setIsProcessing(false)
    }
    
    setIsMockMode(!isMockMode)
    mockTranscriptIndexRef.current = 0
    toast.success(`Switched to ${!isMockMode ? 'mock' : 'real'} mode`)
  }

  const clearLeftText = () => {
    setLeftText('')
    toast.success('Left panel cleared')
  }

  const clearRightText = () => {
    setRightText('')
    toast.success('Right panel cleared')
    setConfidenceScore(null)
    setLastTranscript('')
    setIsProcessing(false)
  }

  // Export functions
  const exportAsText = (content: string, filename?: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `tsc-${content.length ? content.slice(0, 10) : filename}.txt`)
    toast.success(`Exported as ${filename}.txt`)
  }

  const exportAsDocx = async (content: string, filename?: string) => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: content.split('\n').map(line =>
            new Paragraph({
              children: [new TextRun(line || ' ')]
            })
          )
        }]
      })

      const buffer = await Packer.toBlob(doc)
      saveAs(buffer, `${filename}.docx`)
      toast.success(`Exported as ${filename}.docx`)
    } catch (error) {
      toast.error('Failed to export as DOCX')
      console.error('DOCX export error:', error)
    }
  }

  const summarizeLeftText = async () => {
    if (!leftText.trim()) return
    try {
      setIsSummarizing(true)
      const res = await fetch('/api/openai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: leftText })
      })
      const data = await res.json()
      console.log('Summarize result:', data.summary)
      if (data.summary) {
        setLeftText(data.summary)
        toast.success('Text summarized')
      }
    } catch (err) {
      console.error('Summarize error:', err)
      toast.error('Failed to summarize text')
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <div className="min-h-screen bg-sky-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Speech-to-Text App</h1>

        {/* Mode Toggle and Language Selector */}
        <div className="mb-6 flex flex-col items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleMockMode}
              variant={isMockMode ? "default" : "outline"}
              className={isMockMode ? "bg-green-600 hover:bg-green-700" : "border-gray-600 text-gray-400 hover:bg-gray-700"}
            >
              {isMockMode ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              {isMockMode ? 'Mock Mode' : 'Real Mode'}
            </Button>
            
            {isMockMode && (
              <div className="flex items-center gap-2">
                <label className="text-sm">Speed:</label>
                <Select value={mockSpeed.toString()} onValueChange={(value) => setMockSpeed(parseInt(value))}>
                  <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="1000" className="text-white hover:bg-gray-600">Fast</SelectItem>
                    <SelectItem value="3000" className="text-white hover:bg-gray-600">Normal</SelectItem>
                    <SelectItem value="5000" className="text-white hover:bg-gray-600">Slow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-sm font-medium">Speech Recognition Language</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-64 bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="text-white hover:bg-gray-600 focus:bg-gray-600"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mode Indicator */}
        {isMockMode && (
          <div className="mb-4 flex justify-center">
            <div className="bg-green-600 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium">
                🎭 Mock Mode Active - Simulating speech recognition for testing
              </span>
            </div>
          </div>
        )}

        {/* Confidence Score Display */}
        {(confidenceScore !== null || isProcessing) && (
          <div className="mb-4 flex justify-center">
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <span className="text-sm">
                {isProcessing ? (
                  <>
                    Processing<span className="animate-pulse">...</span>
                    {lastTranscript && (
                      <span className="ml-2 text-gray-300">
                        ("{lastTranscript.slice(0, 20)}{lastTranscript.length > 20 ? '...' : ''}")
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Confidence: {((confidenceScore || 0) * 100).toFixed(1)}%
                    {lastTranscript && (
                      <span className="ml-2 text-gray-300">
                        ("{lastTranscript.slice(0, 20)}{lastTranscript.length > 20 ? '...' : ''}")
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
          {/* Left Textarea */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Left Panel</label>
              <div className="flex gap-2">
                <div className="flex">
                  <Button
                    onClick={() => exportAsText(leftText)}
                    size="sm"
                    variant="outline"
                    className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white rounded-r-none"
                    disabled={!leftText.trim()}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    TXT
                  </Button>
                  <Button
                    onClick={() => exportAsDocx(leftText)}
                    size="sm"
                    variant="outline"
                    className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white rounded-l-none border-l-0"
                    disabled={!leftText.trim()}
                  >
                    DOCX
                  </Button>
                </div>
                <Button
                  onClick={clearLeftText}
                  size="sm"
                  variant="outline"
                  className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button
                  onClick={summarizeLeftText}
                  size="sm"
                  variant="outline"
                  className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white"
                  disabled={!leftText.trim() || isSummarizing}
                >
                  Summarize
                </Button>
              </div>
            </div>
            <textarea
              ref={leftTextareaRef}
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              className="flex-1 p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Text will appear here..."
            />
          </div>

          {/* Right Textarea with Mic Button */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Right Panel (Speech-to-Text)</label>
              <div className="flex gap-2">
                <div className="flex">
                  <Button
                    onClick={() => exportAsText(rightText)}
                    size="sm"
                    variant="outline"
                    className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white rounded-r-none"
                    disabled={!rightText.trim()}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    TXT
                  </Button>
                  <Button
                    onClick={() => exportAsDocx(rightText)}
                    size="sm"
                    variant="outline"
                    className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white rounded-l-none border-l-0"
                    disabled={!rightText.trim()}
                  >
                    DOCX
                  </Button>
                </div>
                <Button
                  onClick={clearRightText}
                  size="sm"
                  variant="outline"
                  className="text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <textarea
                ref={rightTextareaRef}
                value={isProcessing && lastTranscript ? rightText + (rightText ? ' ' : '') + lastTranscript : rightText}
                onChange={(e) => setRightText(e.target.value)}
                className="flex-1 p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                placeholder="Speech will be transcribed here..."
              />
              <Button
                onClick={toggleRecording}
                size="lg"
                className={`w-full h-16 text-lg font-semibold ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={!isSupported && !isMockMode}
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-6 w-6" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-6 w-6" />
                    Start Recording
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Command Palette Info */}
        <div className="mt-8 p-4 bg-gray-700 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Command Palette</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><kbd className="bg-gray-600 px-2 py-1 rounded">Alt + Q</kbd> : Overwrite left with right content</div>
            <div><kbd className="bg-gray-600 px-2 py-1 rounded">Alt + W</kbd> : Append right content to left content</div>
            <div><kbd className="bg-gray-600 px-2 py-1 rounded">Alt + E</kbd> : Copy left content to clipboard</div>
            <div><kbd className="bg-gray-600 px-2 py-1 rounded">Ctrl + Shift + L</kbd> : Clear left panel</div>
            <div><kbd className="bg-gray-600 px-2 py-1 rounded">Ctrl + Shift + R</kbd> : Clear right panel</div>
            <div><kbd className="bg-gray-600 px-2 py-1 rounded">Ctrl + Shift + Tab</kbd> : Switch between panels</div>
          </div>
        </div>

        {!isSupported && !isMockMode && (
          <div className="mt-4 p-4 bg-red-600 rounded-lg">
            <p className="text-white">Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or enable Mock Mode for testing.</p>
          </div>
        )}
      </div>
    </div>
  )
}




