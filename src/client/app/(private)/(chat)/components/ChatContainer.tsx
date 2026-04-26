"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetChatQuery,
  useSendMessageMutation,
  useUpdateChatStatusMutation,
} from "@/app/store/apis/ChatApi";
import { useSocketConnection } from "../useSocketConnection";
import { useChatMessages } from "../useChatMessages";
import { useGetMeQuery } from "@/app/store/apis/UserApi";
import { useWebRTCCall } from "../useWebRTCCall";

// Components
import ChatLayout from "./ChatLayout";
import MessageList from "./MessageList";
import ChatStatus from "./ChatStatus";
import ChatInput from "./ChatInput";
import CallConnectingScreen from "../CallConnectingScreen";
import CallInProgressScreen from "../CallInProgressScreen";
import ChatSkeletonLoader from "./ChatSkeletonLoader";
import ErrorDisplay from "./ErrorDisplay";

interface ChatContainerProps {
  chatId: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ chatId }) => {
  const { data: userData } = useGetMeQuery(undefined);
  const user = userData?.user;

  const { data, isLoading, error } = useGetChatQuery(chatId);
  const chat = data?.chat;

  const [sendMessage] = useSendMessageMutation();
  const [updateChatStatus] = useUpdateChatStatusMutation();

  const socket = useSocketConnection(chatId);

  const { messages, message, setMessage, handleSendMessage, isTyping } =
    useChatMessages(chatId, user, chat, socket, sendMessage);

  const { callStatus, endCall } = useWebRTCCall({ chatId, socket });

  const handleResolveChat = async () => {
    try {
      await updateChatStatus({ chatId, status: "RESOLVED" }).unwrap();
    } catch (err) {
      console.error("Failed to resolve chat:", err);
    }
  };

  // Loading state
  if (isLoading) {
    return <ChatSkeletonLoader />;
  }

  // Error state
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  const canResolve =
    (user?.role === "ADMIN" || user?.role === "SUPERADMIN") &&
    chat?.status === "OPEN";

  return (
    <ChatLayout
      chatId={chatId}
      chat={chat}
      onResolve={handleResolveChat}
      canResolve={canResolve}
    >
      <div className="relative flex h-full min-h-0 flex-col">
        {/* Messages Area */}
        <div className="h-0 flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            currentUserId={user?.id || ""}
            isLoading={isLoading}
          />
        </div>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ChatStatus isTyping={true} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Call Screens */}
        <AnimatePresence>
          {callStatus === "calling" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white z-50"
            >
              <CallConnectingScreen chat={chat} onCancel={endCall} />
            </motion.div>
          )}

          {callStatus === "in-call" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white z-50"
            >
              <CallInProgressScreen onEndCall={endCall} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Input */}
        <AnimatePresence>
          {chat?.status === "OPEN" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="shrink-0"
            >
              <ChatInput
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSendMessage}
                disabled={callStatus !== "idle"}
                isTyping={isTyping}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="shrink-0 border-t border-gray-200 bg-gray-50 p-4 text-center text-gray-500"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-sm">
                  This conversation has been {chat?.status?.toLowerCase()}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ChatLayout>
  );
};

export default ChatContainer;
