import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { normalizeMessage } from "./chatData";

const sortMessages = (messages: any[]) =>
  [...messages].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

const mergeMessages = (currentMessages: any[], incomingMessages: any[]) => {
  const messagesById = new Map<string, any>();

  currentMessages.forEach((message) => {
    if (!message?.id) return;
    messagesById.set(message.id, normalizeMessage(message));
  });

  incomingMessages.forEach((message) => {
    const normalizedMessage = normalizeMessage(message);
    if (!normalizedMessage?.id) return;
    messagesById.set(normalizedMessage.id, normalizedMessage);
  });

  return sortMessages(Array.from(messagesById.values()));
};

export const useChatMessages = (
  chatId: string,
  user: { id: string; name: string; role: string } | undefined,
  chat: any,
  socket: Socket | null,
  sendMessage: any
) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeoutRef] = useState<NodeJS.Timeout | null>(
    null
  );

  useEffect(() => {
    setMessage("");
    setMessages([]);
    setIsTyping(false);
  }, [chatId]);

  // Update messages when chat data is fetched
  useEffect(() => {
    if (chat?.messages) {
      setMessages((prev) => mergeMessages(prev, chat.messages));
    }
  }, [chat?.messages]);

  // Handle real-time messages
  useEffect(() => {
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      setMessages((prev) => mergeMessages(prev, [newMessage]));
    });

    socket.on("userTyping", (typingUser) => {
      if (typingUser.id !== user?.id) {
        setIsTyping(true);
        const timeout = setTimeout(() => setIsTyping(false), 3000);
        setTypingTimeoutRef(timeout);
      }
    });

    return () => {
      socket.off("newMessage");
      socket.off("userTyping");
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [socket, typingTimeout, user?.id]);

  // Emit typing event
  useEffect(() => {
    if (message && socket && user) {
      socket.emit("typing", { chatId, user });
    }
  }, [message, socket, chatId, user]);

  // Send a message
  const handleSendMessage = async (file?: File, content?: string) => {
    const trimmedContent = content?.trim() ?? message.trim();

    if (!trimmedContent && !file) return;

    try {
      const result = await sendMessage({
        chatId,
        content: trimmedContent || undefined,
        file,
      }).unwrap();

      const sentMessage = normalizeMessage(result?.message);

      if (sentMessage) {
        setMessages((prev) => mergeMessages(prev, [sentMessage]));
      }

      setMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };
  return {
    messages,
    message,
    setMessage,
    handleSendMessage,
    isTyping,
  };
};
