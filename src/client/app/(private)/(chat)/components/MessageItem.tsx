"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { User, Clock, Download, Play, Pause } from "lucide-react";

interface MessageItemProps {
  message: any;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  showTime?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isCurrentUser,
  showAvatar = true,
  showTime = true,
  isFirstInGroup = true,
  isLastInGroup = true
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [audioDuration, setAudioDuration] = React.useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [imageStatus, setImageStatus] = React.useState<"loading" | "loaded" | "error">("loading");
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const attachment = message.file || (
    message.url
      ? {
          url: message.url,
          type:
            message.type === "IMAGE"
              ? "image/*"
              : message.type === "VOICE"
              ? "audio/*"
              : "application/octet-stream",
          name: message.url.split("/").pop() || "attachment",
        }
      : null
  );
  const contentClassName = isCurrentUser ? "text-white" : "text-gray-700";
  const isImageAttachment = Boolean(
    attachment && attachment.type.startsWith("image/")
  );

  React.useEffect(() => {
    if (isImageAttachment) {
      setImageStatus("loading");
    }
  }, [attachment?.url, isImageAttachment]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAudioLoad = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatAudioDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessageContent = () => {
    if (attachment) {
      const fileType = attachment.type;
      
      if (fileType.startsWith('image/')) {
        return (
          <div className="space-y-2">
            {message.content && (
              <p className={`text-sm ${contentClassName}`}>{message.content}</p>
            )}
            {imageStatus === "error" ? (
              <div className="flex w-full max-w-[18rem] flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:max-w-[22rem]">
                <span className="text-sm font-medium text-red-700">
                  Image preview unavailable
                </span>
                <div className="flex gap-2">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    Open image
                  </a>
                  <a
                    href={attachment.url}
                    download
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="block text-left"
              >
                <div className="relative group w-fit max-w-[16rem] overflow-hidden rounded-lg border border-gray-200 bg-gray-100 sm:max-w-[20rem] lg:max-w-[22rem]">
                  {imageStatus !== "loaded" && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/90 text-sm font-medium text-gray-500">
                      Loading image...
                    </div>
                  )}
                  <img
                    src={attachment.url}
                    alt="Message attachment"
                    className="block h-auto max-h-[18rem] w-auto max-w-full object-contain transition-opacity hover:opacity-90"
                    onLoad={() => setImageStatus("loaded")}
                    onError={() => setImageStatus("error")}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black bg-opacity-0 transition-all group-hover:bg-opacity-10">
                    <Download size={20} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>
              </button>
            )}
          </div>
        );
      }
      
      if (fileType.startsWith('audio/')) {
        return (
          <div className="space-y-2">
            {message.content && (
              <p className={`text-sm ${contentClassName}`}>{message.content}</p>
            )}
            <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
              <button
                onClick={toggleAudio}
                className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className="flex-1">
                <div className="text-sm font-medium">Voice Message</div>
                <div className="text-xs text-gray-500">
                  {formatAudioDuration(audioDuration)}
                </div>
              </div>
              <audio
                ref={audioRef}
                src={attachment.url}
                onLoadedMetadata={handleAudioLoad}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          </div>
        );
      }
      
      // Generic file
      return (
        <div className="space-y-2">
          {message.content && (
            <p className={`text-sm ${contentClassName}`}>{message.content}</p>
          )}
          <a
            href={attachment.url}
            download
            className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download size={16} />
            <span className="text-sm font-medium">
              {attachment.name || "Download attachment"}
            </span>
          </a>
        </div>
      );
    }
    
    return (
      <p className={`text-sm whitespace-pre-wrap ${contentClassName}`}>
        {message.content}
      </p>
    );
  };

  return (
    <div className={`flex gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {showAvatar && (
        <div className={`flex-shrink-0 ${isCurrentUser ? 'order-2' : 'order-1'}`}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        </div>
      )}
      
      {/* Message Content */}
      <div className={`flex max-w-full flex-col ${isCurrentUser ? 'items-end order-1' : 'items-start order-2'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-full rounded-2xl ${
            isCurrentUser
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-200'
          } ${
            isImageAttachment
              ? 'p-2'
              : 'px-4 py-2'
          } ${
            isFirstInGroup && isLastInGroup
              ? 'rounded-2xl'
              : isFirstInGroup
              ? isCurrentUser
                ? 'rounded-tr-md'
                : 'rounded-tl-md'
              : isLastInGroup
              ? isCurrentUser
                ? 'rounded-br-md'
                : 'rounded-bl-md'
              : 'rounded-md'
          }`}
        >
          {renderMessageContent()}
        </motion.div>
        
        {/* Time */}
        {showTime && (
          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
            isCurrentUser ? 'justify-end' : 'justify-start'
          }`}>
            <Clock size={12} />
            <span>{formatTime(message.createdAt)}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isPreviewOpen && attachment?.url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setIsPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="max-h-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={attachment.url}
                alt="Full message attachment"
                className="block max-h-[85vh] w-auto max-w-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageItem;
