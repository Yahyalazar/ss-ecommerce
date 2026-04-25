import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_ORIGIN } from "@/app/lib/constants/config";

export const useSocketConnection = (chatId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const nextSocket = io(API_ORIGIN, {
      withCredentials: true,
    });

    nextSocket.emit("joinChat", chatId);
    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
    };
  }, [chatId]);

  return socket;
};
