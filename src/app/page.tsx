"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, X, Download, Play, Pause } from "lucide-react";
import { VoiceWaves } from "@/components/voice-waves";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";

// Language options for speech recognition
const LANGUAGES = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "zh-CN", name: "Chinese (Mandarin)" },
  { code: "ru-RU", name: "Russian" },
  { code: "ar-SA", name: "Arabic" },
];

// Supported app interface languages
const APP_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
];

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
  "This helps me test without speaking constantly.",
];

// TypeScript interfaces for Web Speech API
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    startMockRecording: () => void;
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function SpeechToTextApp() {
  const { t, i18n } = useTranslation();
  const [appLanguage, setAppLanguage] = useState(i18n.language);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [mockSpeed, setMockSpeed] = useState(1000); // milliseconds between mock phrases

  const changeAppLanguage = (lang: string) => {
    setAppLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRecordingRef = useRef(isRecording);
  const mockTranscriptIndexRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Mock speech recognition function
  const startMockRecording = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
    }

    mockIntervalRef.current = setInterval(() => {
      debugger;
      if (!isRecordingRef.current) return;
      const transcript =
        MOCK_TRANSCRIPTS[
          mockTranscriptIndexRef.current % MOCK_TRANSCRIPTS.length
        ];
      mockTranscriptIndexRef.current++;

      // Simulate interim results first
      setIsProcessing(true);
      setLastTranscript(transcript);

      // After a short delay, make it final
      setTimeout(() => {
        debugger;
        if (isRecordingRef.current) {
          setTranscript((prev) => {
            const newText = prev + (prev ? " " : "") + transcript;
            return newText;
          });
          setConfidenceScore(0.85 + Math.random() * 0.1); // Random confidence between 85-95%
          setLastTranscript(transcript);
          setIsProcessing(false);
        }
      }, 500); // Random delay between 1-2 seconds
    }, mockSpeed);

    console.log("mock recording started", mockIntervalRef.current);
  }, [mockSpeed]);

  const stopMockRecording = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  const sendOpenAIChunk = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, "chunk.webm");
    try {
      setIsProcessing(true);
      const res = await fetch("/api/openai-transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setTranscript((prev) => prev + (prev ? " " : "") + data.text.trim());
      }
    } catch (err) {
      console.error("OpenAI transcription error:", err);
      toast.error(t("toast.openaiError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const startAudioCapture = async (sendChunks: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
          if (sendChunks) {
            sendOpenAIChunk(e.data);
          }
        }
      };
      recorder.start(2000);
    } catch (err) {
      console.error("OpenAI record error:", err);
      toast.error(t("toast.microphoneError"));
    }
  };

  const stopAudioCapture = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorder.stop();
      mediaRecorderRef.current = null;
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      audioChunksRef.current = [];
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("Recorded audio base64:", reader.result);
      };
      reader.readAsDataURL(audioBlob);
    }
  };

  // Switch between textareas with cursor at end

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = selectedLanguage;

        let date = new Date();
        let dateDiff;
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = "";
          let finalTranscript = "";
          let bestConfidence = 0;

          dateDiff = new Date().getTime() - date.getTime();
          console.log(dateDiff);
          date = new Date();
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;

            console.log("latencia:", transcript, confidence);

            if (event.results[i].isFinal) {
              finalTranscript += transcript;
              bestConfidence = Math.max(bestConfidence, confidence);
            } else {
              interimTranscript += transcript;
            }
          }

          // Show interim results with thinking effect
          if (interimTranscript) {
            setIsProcessing(true);
            setLastTranscript(interimTranscript);
          }

          // Add final results to the text
          if (finalTranscript) {
            setTranscript((prev) => {
              const newText = prev + (prev ? " " : "") + finalTranscript;
              return newText;
            });
            setConfidenceScore(bestConfidence);
            setLastTranscript(finalTranscript);
            setIsProcessing(false);
          }
        };

        recognitionRef.current.onerror = (event: { error: string }) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
          setIsProcessing(false);
          toast.error(
            t("toast.speechRecognitionError", { error: event.error }),
          );
        };

        recognitionRef.current.onend = () => {
          setIsProcessing(false);
          // Restart recognition if we're still supposed to be recording
          if (isRecordingRef.current) {
            setTimeout(() => {
              if (recognitionRef.current && isRecordingRef.current) {
                recognitionRef.current.start();
              }
            }, 100);
          }
        };
      }
    }

    return () => {
      const currentMockInterval = mockIntervalRef.current;
      if (currentMockInterval) {
        clearInterval(currentMockInterval);
      }
    };
  }, [isRecording, selectedLanguage, t]);

  // Update language when selection changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  const toggleRecording = () => {
    if (isMockMode) {
      // Mock mode recording
      if (isRecording) {
        setIsRecording(false);
        isRecordingRef.current = false;
        stopMockRecording();
        toast.info(t("recording.mockStopped"));
      } else {
        setIsRecording(true);
        isRecordingRef.current = true;
        startMockRecording();
        toast.success(t("recording.mockStarted"));
      }
    } else {
      // Real speech recognition or OpenAI fallback
      if (!isSupported) {
        if (isRecording) {
          setIsRecording(false);
          stopAudioCapture();
          toast.info(t("recording.stopped"));
        } else {
          setIsRecording(true);
          startAudioCapture(true);
          toast.success(t("recording.started"));
        }
        return;
      }

      if (isRecording) {
        // Set state first to prevent race condition in onend callback
        setIsRecording(false);
        isRecordingRef.current = false;
        setIsProcessing(false);
        recognitionRef.current?.stop();
        stopAudioCapture();
        toast.info(t("recording.stopped"));
      } else {
        setIsRecording(true);
        isRecordingRef.current = true;
        recognitionRef.current?.start();
        startAudioCapture(false);
        toast.success(t("recording.started"));
      }
    }
  };

  const toggleMockMode = () => {
    if (isRecording) {
      // Stop current recording first
      if (isMockMode) {
        stopMockRecording();
      } else {
        recognitionRef.current?.stop();
      }
      stopAudioCapture();
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsProcessing(false);
    }

    setIsMockMode(!isMockMode);
    mockTranscriptIndexRef.current = 0;
    toast.success(
      t("mode.switched", {
        mode: t(`mode.${!isMockMode ? "mock" : "real"}`),
      }),
    );
  };

  const clearTranscript = () => {
    setTranscript("");
    toast.success(t("toast.transcriptCleared"));
    setConfidenceScore(null);
    setLastTranscript("");
    setIsProcessing(false);
  };

  // Export functions
  const exportAsText = (content: string, filename?: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `tsc-${content.length ? content.slice(0, 10) : filename}.txt`);
    toast.success(t("toast.exported", { filename, ext: "txt" }));
  };

  const exportAsDocx = async (content: string, filename?: string) => {
    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: content.split("\n").map(
              (line) =>
                new Paragraph({
                  children: [new TextRun(line || " ")],
                }),
            ),
          },
        ],
      });

      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, `${filename}.docx`);
      toast.success(t("toast.exported", { filename, ext: "docx" }));
    } catch (error) {
      toast.error(t("toast.exportDocxError"));
      console.error("DOCX export error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100 p-6 relative">
      <div className="absolute top-4 right-4">
        <div className="relative">
          {isRecording && <VoiceWaves />}
          <Button
            onClick={toggleRecording}
            size="icon"
            className={`rounded-full w-16 h-16 p-0 text-white ${
              isRecording
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gradient-to-r from-cyan-500 via-purple-600 to-green-500 hover:opacity-90"
            }`}
            disabled={!isSupported && !isMockMode}
          >
            <Mic className="h-8 w-8" />
          </Button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 via-purple-500 to-green-400 bg-clip-text text-transparent">
          {t("title")}
        </h1>

        {/* Mode Toggle and Language Selector */}
        <div className="mb-6 flex flex-col items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-4">
            <Button
              onClick={toggleMockMode}
              variant={isMockMode ? "default" : "outline"}
            >
              {isMockMode ? (
                <Play className="h-4 w-4 mr-2" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              {isMockMode ? t("mode.mock") : t("mode.real")}
            </Button>

            {isMockMode && (
              <div className="flex items-center gap-2">
                <label className="text-sm">{t("mode.speed")}:</label>
                <Select
                  value={mockSpeed.toString()}
                  onValueChange={(value) => setMockSpeed(parseInt(value))}
                >
                  <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white backdrop-blur">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/10 border-white/20 backdrop-blur">
                    <SelectItem
                      value="1000"
                      className="text-white hover:bg-white/20"
                    >
                      {t("mode.fast")}
                    </SelectItem>
                    <SelectItem
                      value="3000"
                      className="text-white hover:bg-white/20"
                    >
                      {t("mode.normal")}
                    </SelectItem>
                    <SelectItem
                      value="5000"
                      className="text-white hover:bg-white/20"
                    >
                      {t("mode.slow")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {/* App Language Selector */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-sm font-medium">{t("appLanguage")}</label>
            <Select value={appLanguage} onValueChange={changeAppLanguage}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white backdrop-blur">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/10 border-white/20 backdrop-blur">
                {APP_LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="text-white hover:bg-white/20"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speech Recognition Language Selector */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-sm font-medium">
              {t("speechRecognitionLanguage")}
            </label>
            <Select
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
            >
              <SelectTrigger className="w-64 bg-white/10 border-white/20 text-white backdrop-blur">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/10 border-white/20 backdrop-blur">
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="text-white hover:bg-white/20 focus:bg-white/20"
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
              <span className="text-sm font-medium">{t("mockModeActive")}</span>
            </div>
          </div>
        )}

        {/* Confidence Score Display */}
        {(confidenceScore !== null || isProcessing) && (
          <div className="mb-4 flex justify-center">
            <div className="bg-white/5 px-4 py-2 rounded-lg backdrop-blur border border-white/20">
              <span className="text-sm">
                {isProcessing ? (
                  <>
                    {t("processing")}
                    <span className="animate-pulse">...</span>
                    {lastTranscript && (
                      <span className="ml-2 text-gray-300">
                        ("{lastTranscript.slice(0, 20)}
                        {lastTranscript.length > 20 ? "..." : ""}")
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {t("confidence")}:{" "}
                    {((confidenceScore || 0) * 100).toFixed(1)}%
                    {lastTranscript && (
                      <span className="ml-2 text-gray-300">
                        ("{lastTranscript.slice(0, 20)}
                        {lastTranscript.length > 20 ? "..." : ""}")
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 h-[70vh]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">{t("transcript")}</label>
            <div className="flex gap-2">
              <div className="flex">
                <Button
                  onClick={() => exportAsText(transcript)}
                  size="sm"
                  variant="outline"
                  className="rounded-r-none"
                  disabled={!transcript.trim()}
                >
                  <Download className="h-4 w-4 mr-1" />
                  TXT
                </Button>
                <Button
                  onClick={() => exportAsDocx(transcript)}
                  size="sm"
                  variant="outline"
                  className="rounded-l-none border-l-0"
                  disabled={!transcript.trim()}
                >
                  DOCX
                </Button>
              </div>
              <Button onClick={clearTranscript} size="sm" variant="outline">
                <X className="h-4 w-4 mr-1" />
                {t("clear")}
              </Button>
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={
                isProcessing && lastTranscript
                  ? transcript + (transcript ? " " : "") + lastTranscript
                  : transcript
              }
              onChange={(e) => setTranscript(e.target.value)}
              className="flex-1 p-4 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur"
              placeholder={t("placeholder.transcript")}
            />
          </div>
        </div>

        {!isSupported && !isMockMode && (
          <div className="mt-4 p-4 bg-red-500/80 backdrop-blur rounded-lg">
            <p className="text-white">{t("unsupported")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
