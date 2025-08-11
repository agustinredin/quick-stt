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
import { Mic, MicOff, X, Download, Play, Pause } from "lucide-react";
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
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [mockSpeed, setMockSpeed] = useState(1000); // milliseconds between mock phrases
  const [isSummarizing, setIsSummarizing] = useState(false);

  const changeAppLanguage = (lang: string) => {
    setAppLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const leftTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rightTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isRecordingRef = useRef(isRecording);
  const mockTranscriptIndexRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

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
          setRightText((prev) => {
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
        setRightText((prev) => prev + (prev ? " " : "") + data.text.trim());
      }
    } catch (err) {
      console.error("OpenAI transcription error:", err);
      toast.error(t("toast.openaiError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const startOpenAIRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          sendOpenAIChunk(e.data);
        }
      };
      recorder.start(2000);
    } catch (err) {
      console.error("OpenAI record error:", err);
      toast.error(t("toast.microphoneError"));
    }
  };

  const stopOpenAIRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorder.stop();
      mediaRecorderRef.current = null;
    }
  };

  // Switch between textareas with cursor at end
  const switchTextarea = useCallback(() => {
    const leftFocused = document.activeElement === leftTextareaRef.current;
    const rightFocused = document.activeElement === rightTextareaRef.current;

    if (leftFocused) {
      // Switch to right textarea
      if (rightTextareaRef.current) {
        rightTextareaRef.current.focus();
        rightTextareaRef.current.setSelectionRange(
          rightText.length,
          rightText.length,
        );
        toast.success(t("toast.switchedRight"), {
          description: t("toast.usedShortcut", { shortcut: "Ctrl+Shift+Tab" }),
        });
      }
    } else if (rightFocused) {
      // Switch to left textarea
      if (leftTextareaRef.current) {
        leftTextareaRef.current.focus();
        leftTextareaRef.current.setSelectionRange(
          leftText.length,
          leftText.length,
        );
        toast.success(t("toast.switchedLeft"), {
          description: t("toast.usedShortcut", { shortcut: "Ctrl+Shift+Tab" }),
        });
      }
    } else {
      // If no textarea is focused, focus on left by default
      if (leftTextareaRef.current) {
        leftTextareaRef.current.focus();
        leftTextareaRef.current.setSelectionRange(
          leftText.length,
          leftText.length,
        );
        toast.success(t("toast.focusedLeft"), {
          description: t("toast.usedShortcut", { shortcut: "Ctrl+Shift+Tab" }),
        });
      }
    }
  }, [leftText, rightText, t]);

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
            setRightText((prev) => {
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
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          toast.error(t("toast.speechRecognitionError", { error: event.error }));
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

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case "q":
            e.preventDefault();
            setLeftText(rightText);
            toast.success(t("toast.leftOverwritten"), {
              description: t("toast.usedShortcut", { shortcut: "Alt+Q" }),
            });
            break;
          case "w":
            e.preventDefault();
            setLeftText((prev) => prev + (prev ? " " : "") + rightText);
            toast.success(t("toast.rightAppended"), {
              description: t("toast.usedShortcut", { shortcut: "Alt+W" }),
            });
            break;
          case "e":
            e.preventDefault();
            if (navigator.clipboard) {
              navigator.clipboard.writeText(leftText);
              toast.success(t("toast.leftCopied"), {
                description: t("toast.usedShortcut", { shortcut: "Alt+E" }),
              });
            } else {
              toast.error(t("toast.clipboardUnsupported"));
            }
            break;
        }
      }

      // New keyboard shortcuts for clearing and switching
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "l":
            e.preventDefault();
            clearLeftText();
            toast.success(t("toast.leftCleared"), {
              description: t("toast.usedShortcut", { shortcut: "Ctrl+Shift+L" }),
            });
            break;
          case "r":
            e.preventDefault();
            clearRightText();
            toast.success(t("toast.rightCleared"), {
              description: t("toast.usedShortcut", { shortcut: "Ctrl+Shift+R" }),
            });
            break;
          case "tab":
            e.preventDefault();
            switchTextarea();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const currentInterval = intervalRef.current;
      if (currentInterval) {
        clearInterval(currentInterval);
      }
      const currentMockInterval = mockIntervalRef.current;
      if (currentMockInterval) {
        clearInterval(currentMockInterval);
      }
    };
  }, [leftText, rightText, isRecording, selectedLanguage, switchTextarea, t]);

  // Update language when selection changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  const toggleRecording = () => {
    // debugger
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
          stopOpenAIRecording();
          toast.info(t("recording.stopped"));
        } else {
          setIsRecording(true);
          startOpenAIRecording();
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
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        toast.info(t("recording.stopped"));
      } else {
        setIsRecording(true);
        isRecordingRef.current = true;
        recognitionRef.current?.start();
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

  const clearLeftText = () => {
    setLeftText("");
    toast.success(t("toast.leftCleared"));
  };

  const clearRightText = () => {
    setRightText("");
    toast.success(t("toast.rightCleared"));
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

  const summarizeLeftText = async () => {
    if (!leftText.trim()) return;
    try {
      setIsSummarizing(true);
      const res = await fetch("/api/openai-summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: leftText, language: appLanguage }),
      });
      const data = await res.json();
      console.log("Summarize result:", data.summary);
      if (data.summary) {
        setLeftText(data.summary);
        toast.success(t("toast.textSummarized"));
      }
    } catch (err) {
      console.error("Summarize error:", err);
      toast.error(t("toast.summarizeError"));
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100 p-6">
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
                    {t("confidence")}: {((confidenceScore || 0) * 100).toFixed(1)}%
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[70vh]">
          {/* Left Textarea */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t("leftPanel")}</label>
              <div className="flex gap-2">
                <div className="flex">
                  <Button
                    onClick={() => exportAsText(leftText)}
                    size="sm"
                    variant="outline"
                    className="rounded-r-none"
                    disabled={!leftText.trim()}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    TXT
                  </Button>
                  <Button
                    onClick={() => exportAsDocx(leftText)}
                    size="sm"
                    variant="outline"
                    className="rounded-l-none border-l-0"
                    disabled={!leftText.trim()}
                  >
                    DOCX
                  </Button>
                </div>
                <Button onClick={clearLeftText} size="sm" variant="outline">
                  <X className="h-4 w-4 mr-1" />
                  {t("clear")}
                </Button>
                <Button
                  onClick={summarizeLeftText}
                  size="sm"
                  variant="outline"
                  disabled={!leftText.trim() || isSummarizing}
                >
                  {t("summarize")}
                </Button>
              </div>
            </div>
            <textarea
              ref={leftTextareaRef}
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              className="flex-1 p-4 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur"
              placeholder={t("placeholder.left")}
            />
          </div>

          {/* Right Textarea with Mic Button */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t("rightPanel")}</label>
              <div className="flex gap-2">
                <div className="flex">
                  <Button
                    onClick={() => exportAsText(rightText)}
                    size="sm"
                    variant="outline"
                    className="rounded-r-none"
                    disabled={!rightText.trim()}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    TXT
                  </Button>
                  <Button
                    onClick={() => exportAsDocx(rightText)}
                    size="sm"
                    variant="outline"
                    className="rounded-l-none border-l-0"
                    disabled={!rightText.trim()}
                  >
                    DOCX
                  </Button>
                </div>
                <Button onClick={clearRightText} size="sm" variant="outline">
                  <X className="h-4 w-4 mr-1" />
                  {t("clear")}
                </Button>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <textarea
                ref={rightTextareaRef}
                value={
                  isProcessing && lastTranscript
                    ? rightText + (rightText ? " " : "") + lastTranscript
                    : rightText
                }
                onChange={(e) => setRightText(e.target.value)}
                className="flex-1 p-4 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur mb-4"
                placeholder={t("placeholder.right")}
              />
              <Button
                onClick={toggleRecording}
                size="lg"
                className={`w-full h-16 text-lg font-semibold ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-gradient-to-r from-cyan-500 via-purple-600 to-green-500 text-white hover:opacity-90"
                }`}
                disabled={!isSupported && !isMockMode}
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-6 w-6" />
                    {t("recording.stop")}
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-6 w-6" />
                    {t("recording.start")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Command Palette Info */}
        <div className="mt-8 p-4 bg-white/5 backdrop-blur border border-white/20 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">{t("commandPalette.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <kbd className="bg-white/10 px-2 py-1 rounded">Alt + Q</kbd> :
              {t("commandPalette.overwrite")}
            </div>
            <div>
              <kbd className="bg-white/10 px-2 py-1 rounded">Alt + W</kbd> :
              {t("commandPalette.append")}
            </div>
            <div>
              <kbd className="bg-white/10 px-2 py-1 rounded">Alt + E</kbd> :
              {t("commandPalette.copy")}
            </div>
            <div>
              <kbd className="bg-white/10 px-2 py-1 rounded">
                Ctrl + Shift + L
              </kbd>{" "}
              : {t("commandPalette.clearLeft")}
            </div>
            <div>
              <kbd className="bg-white/10 px-2 py-1 rounded">
                Ctrl + Shift + R
              </kbd>{" "}
              : {t("commandPalette.clearRight")}
            </div>
            <div>
              <kbd className="bg-white/10 px-2 py-1 rounded">
                Ctrl + Shift + Tab
              </kbd>{" "}
              : {t("commandPalette.switchPanels")}
            </div>
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
