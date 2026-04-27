import { ChatRepository } from "./chat.repository";
import { Chat, ChatMessage } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";
import { v2 as cloudinary } from "cloudinary";
import { isCloudinaryTimeoutError } from "@/shared/utils/uploadToCloudinary";

const DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS = Number(
  process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || 180000
);

export class ChatService {
  constructor(
    private chatRepository: ChatRepository,
    private io: SocketIOServer
  ) {}

  async createChat(userId: string): Promise<Chat> {
    const chat = await this.chatRepository.createChat(userId);
    this.io.to("admin").emit("chatCreated", chat);
    return chat;
  }

  async getChat(id: string): Promise<Chat | null> {
    const chat = await this.chatRepository.findChatById(id);
    if (!chat) throw new Error("Chat not found");
    return chat;
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    return this.chatRepository.findChatsByUser(userId);
  }

  async getAllChats(status?: "OPEN" | "RESOLVED"): Promise<Chat[]> {
    return this.chatRepository.findAllChats(status);
  }

  async sendMessage(
    chatId: string,
    content: string | null,
    senderId: string,
    file?: Express.Multer.File
  ): Promise<ChatMessage> {
    const chat = await this.chatRepository.findChatById(chatId);
    if (!chat) throw new Error("Chat not found");

    let type: "TEXT" | "IMAGE" | "VOICE" = "TEXT";
    let url: string | undefined;

    if (file) {
      const isImageUpload = file.mimetype.startsWith("image/");
      const isAudioUpload = file.mimetype.startsWith("audio/");

      if (!isImageUpload && !isAudioUpload) {
        throw new Error("Only image and audio files are supported");
      }

      console.log("File received:", {
        mimetype: file.mimetype,
        size: file.size,
        originalname: file.originalname,
      });

      try {
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              disable_promises: true,
              resource_type: isImageUpload ? "image" : "video",
              folder: "chat_media",
              timeout:
                Number.isFinite(DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS) &&
                DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS > 0
                  ? DEFAULT_CLOUDINARY_UPLOAD_TIMEOUT_MS
                  : 180000,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          uploadStream.end(file.buffer);
        });

        console.log("Cloudinary upload result:", uploadResult);
        type = isImageUpload ? "IMAGE" : "VOICE";
        url = uploadResult.secure_url;
      } catch (error) {
        console.error("Cloudinary upload failed:", error);
        if (isCloudinaryTimeoutError(error)) {
          throw new Error(
            "File upload timed out. Please try again or use a smaller file."
          );
        }
        throw new Error("Failed to upload file");
      }
    }

    const message = await this.chatRepository.createMessage(
      chatId,
      senderId,
      content,
      type,
      url
    );
    await this.chatRepository.touchChat(chatId);
    this.io.to(`chat:${chatId}`).emit("newMessage", message);
    this.io.to("admin").emit("chatMessageCreated", {
      chatId,
      message,
    });
    return message;
  }

  async updateChatStatus(
    chatId: string,
    status: "OPEN" | "RESOLVED"
  ): Promise<Chat> {
    const chat = await this.chatRepository.updateChatStatus(chatId, status);
    this.io.to("admin").emit("chatStatusUpdated", chat);
    return chat;
  }
}
