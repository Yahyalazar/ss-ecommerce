import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { API_ORIGIN } from "@/app/lib/constants/config";

export const useAdminSocketEvents = (
  onChatCreated: () => void,
  onChatStatusUpdated: () => void,
  onChatMessageCreated?: () => void
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(API_ORIGIN, {
      withCredentials: true,
    });

    // Join admin room
    socketRef.current.emit("joinAdmin");

    // Listen for admin events
    socketRef.current.on("chatCreated", (newChat) => {
      console.log("New chat created:", newChat);
      onChatCreated();
    });

    socketRef.current.on("chatStatusUpdated", (updatedChat) => {
      console.log("Chat status updated:", updatedChat);
      onChatStatusUpdated();
    });

    socketRef.current.on("chatMessageCreated", (payload) => {
      console.log("Chat message created:", payload);
      onChatMessageCreated?.();
    });

    // Clean up on component unmount
    return () => {
      socketRef.current?.off("chatCreated");
      socketRef.current?.off("chatStatusUpdated");
      socketRef.current?.off("chatMessageCreated");
      socketRef.current?.disconnect();
    };
  }, [onChatCreated, onChatMessageCreated, onChatStatusUpdated]);

  return socketRef.current;
};
