const getAttachmentUrl = (message: any) => message?.file?.url || message?.url;

const getAttachmentType = (message: any) => {
  if (message?.file?.type) return message.file.type;
  if (message?.type === "IMAGE") return "image/*";
  if (message?.type === "VOICE") return "audio/*";
  return "application/octet-stream";
};

const getAttachmentName = (message: any) => {
  if (message?.file?.name) return message.file.name;

  const attachmentUrl = getAttachmentUrl(message);
  if (attachmentUrl) {
    try {
      const pathname = new URL(attachmentUrl).pathname;
      return decodeURIComponent(pathname.split("/").pop() || "attachment");
    } catch {
      return attachmentUrl.split("/").pop() || "attachment";
    }
  }

  if (message?.type === "IMAGE") return "image";
  if (message?.type === "VOICE") return "voice-message";
  return "attachment";
};

export const normalizeMessage = (message: any) => {
  if (!message) return message;

  const attachmentUrl = getAttachmentUrl(message);

  return {
    ...message,
    sender:
      message.sender || (message.senderId ? { id: message.senderId } : undefined),
    file: attachmentUrl
      ? {
          url: attachmentUrl,
          type: getAttachmentType(message),
          name: getAttachmentName(message),
        }
      : message.file,
  };
};

export const normalizeChat = (chat: any) => {
  if (!chat) return chat;

  return {
    ...chat,
    customer: chat.customer || chat.user,
    messages: Array.isArray(chat.messages)
      ? chat.messages.map(normalizeMessage)
      : [],
  };
};

export const getChatCustomer = (chat: any) => chat?.customer || chat?.user || null;

export const getConversationTitle = (chat: any) => {
  const customer = getChatCustomer(chat);

  if (customer?.name?.trim()) {
    return customer.name.trim();
  }

  if (chat?.id) {
    return `Conversation #${chat.id.slice(-8)}`;
  }

  return "Unknown customer";
};

export const getConversationSubtitle = (chat: any) => {
  const customer = getChatCustomer(chat);
  return customer?.email?.trim() || "No email provided";
};
