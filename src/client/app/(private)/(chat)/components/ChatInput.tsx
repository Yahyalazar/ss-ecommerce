"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Send,
  Mic,
  Image as ImageIcon,
  Paperclip,
  Smile,
  X,
  Pause,
  Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
];

const EMOJIS = [
  "\u{1F60A}",
  "\u{1F602}",
  "\u{2764}\u{FE0F}",
  "\u{1F44D}",
  "\u{1F389}",
  "\u{1F525}",
  "\u{1F60E}",
  "\u{1F914}",
  "\u{1F622}",
  "\u{1F621}",
];

const MAX_IMAGE_UPLOAD_DIMENSION = 1600;

const getPreferredAudioMimeType = () => {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return undefined;
  }

  return AUDIO_MIME_TYPES.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType)
  );
};

const getAudioFileExtension = (mimeType: string) => {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "webm";
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

const normalizeImageFile = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImageElement(dataUrl);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale =
      longestSide > MAX_IMAGE_UPLOAD_DIMENSION
        ? MAX_IMAGE_UPLOAD_DIMENSION / longestSide
        : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    canvas.width = width;
    canvas.height = height;

    const preserveTransparency =
      file.type === "image/png" || file.type === "image/webp";
    const outputType = preserveTransparency ? "image/png" : "image/jpeg";

    if (!preserveTransparency) {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, 0.92);
    });

    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "chat-image";
    const extension = outputType === "image/png" ? "png" : "jpg";

    return new File([blob], `${baseName}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("Failed to normalize image file:", error);
    return file;
  }
};

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: (file?: File, content?: string) => void;
  disabled?: boolean;
  isTyping?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  message,
  setMessage,
  onSendMessage,
  disabled = false,
  isTyping = false,
}) => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (recording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [recording]);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(null);
      const nextFile = file.type.startsWith("image/")
        ? await normalizeImageFile(file)
        : file;
      setSelectedFile(nextFile);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredAudioMimeType = getPreferredAudioMimeType();
      const recorder = preferredAudioMimeType
        ? new MediaRecorder(stream, { mimeType: preferredAudioMimeType })
        : new MediaRecorder(stream);

      setSelectedFile(null);
      setAudioBlob(null);
      setMediaRecorder(recorder);
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const recordedMimeType =
          recorder.mimeType ||
          audioChunks.current.find((chunk) => chunk.type)?.type ||
          preferredAudioMimeType ||
          "audio/webm";

        const nextAudioBlob = new Blob(audioChunks.current, {
          type: recordedMimeType,
        });

        setAudioBlob(nextAudioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const cancelMedia = () => {
    setSelectedFile(null);
    setAudioBlob(null);
    if (mediaRecorder) {
      stopRecording();
    }
  };

  const getPendingFile = () => {
    if (selectedFile) {
      return selectedFile;
    }

    if (audioBlob) {
      const mimeType = audioBlob.type || "audio/webm";

      return new File(
        [audioBlob],
        `voice-message.${getAudioFileExtension(mimeType)}`,
        { type: mimeType }
      );
    }

    return undefined;
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    const pendingFile = getPendingFile();

    if (!trimmedMessage && !pendingFile) {
      return;
    }

    onSendMessage(pendingFile, trimmedMessage || undefined);
    setMessage("");
    setSelectedFile(null);
    setAudioBlob(null);
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(`${message}${emoji}`);
    setShowEmojiPicker(false);
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <AnimatePresence>
        {(selectedFile || audioBlob) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-3 rounded-lg border bg-gray-50 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedFile && (
                  <>
                    <ImageIcon size={20} className="text-blue-500" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                  </>
                )}
                {audioBlob && (
                  <>
                    <Mic size={20} className="text-green-500" />
                    <span className="text-sm font-medium">Voice Message</span>
                  </>
                )}
              </div>
              <button
                onClick={cancelMedia}
                className="rounded-full p-1 transition-colors hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-700">
                  Recording... {formatRecordingTime(recordingTime)}
                </span>
              </div>
              <button
                onClick={stopRecording}
                className="rounded-full bg-red-500 p-2 text-white transition-colors hover:bg-red-600"
              >
                <Square size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        >
          <Paperclip size={20} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <Smile size={20} />
          </button>

          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
              >
                <div className="grid grid-cols-5 gap-2">
                  {EMOJIS.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl leading-none transition-colors hover:bg-gray-100"
                      style={{
                        fontFamily:
                          '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={disabled}
            className="max-h-32 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            rows={1}
            style={{ minHeight: "44px" }}
          />

          <button
            onClick={handleSend}
            disabled={
              disabled || recording || (!message.trim() && !selectedFile && !audioBlob)
            }
            className="absolute bottom-2 right-2 rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>

        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled}
          className={`rounded-lg p-3 transition-colors disabled:opacity-50 ${
            recording
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {recording ? <Pause size={20} /> : <Mic size={20} />}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept="image/*,audio/*"
        className="hidden"
      />

      {isTyping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-sm text-gray-500"
        >
          Customer is typing...
        </motion.div>
      )}
    </div>
  );
};

export default ChatInput;
