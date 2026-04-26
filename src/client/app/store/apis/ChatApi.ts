import { apiSlice } from "../slices/ApiSlice";
import { normalizeChat, normalizeMessage } from "../../(private)/(chat)/chatData";

type ChatStatus = "OPEN" | "RESOLVED";

type SendMessageArgs = {
  chatId: string;
  content?: string;
  file?: File;
};

type UpdateChatStatusArgs = {
  chatId: string;
  status: ChatStatus;
};

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /chat/:id
    getChat: builder.query<any, string>({
      query: (id: string) => `/chat/${id}`,
      transformResponse: (response: any) => ({
        ...response,
        chat: normalizeChat(response.chat),
      }),
      providesTags: (_result, _error, id: string) => [{ type: "Chat", id }],
    }),

    // GET /chat/user/:userId
    getUserChats: builder.query<any, void>({
      query: () => `/chat/user`,
      transformResponse: (response: any) => ({
        ...response,
        chats: Array.isArray(response.chats)
          ? response.chats.map(normalizeChat)
          : [],
      }),
      providesTags: [{ type: "Chat", id: "USER_LIST" }],
    }),

    // GET /chat
    getAllChats: builder.query<any, ChatStatus | void>({
      query: (status?: ChatStatus) => ({
        url: "/chat",
        params: status ? { status } : undefined,
      }),
      transformResponse: (response: any) => ({
        ...response,
        chats: Array.isArray(response.chats)
          ? response.chats.map(normalizeChat)
          : [],
      }),
      providesTags: (_result, _error, status) => [
        { type: "Chat", id: `ADMIN_LIST:${status || "ALL"}` },
      ],
    }),

    // POST /chat
    createChat: builder.mutation<any, void>({
      query: () => ({
        url: "/chat",
        method: "POST",
      }),
      transformResponse: (response: any) => ({
        ...response,
        chat: normalizeChat(response.chat),
      }),
      invalidatesTags: [
        { type: "Chat", id: "USER_LIST" },
        { type: "Chat", id: "ADMIN_LIST:ALL" },
        { type: "Chat", id: "ADMIN_LIST:OPEN" },
      ],
    }),

    // POST /chat/:chatId/message
    sendMessage: builder.mutation<any, SendMessageArgs>({
      query: ({ chatId, content, file }: SendMessageArgs) => {
        const formData = new FormData();
        formData.append("chatId", chatId);
        if (content) formData.append("content", content);
        if (file) formData.append("file", file);
        return {
          url: `/chat/${chatId}/message`,
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response: any) => ({
        ...response,
        message: normalizeMessage(response.message),
      }),
      invalidatesTags: (_result, _error, { chatId }) => [
        { type: "Chat", id: chatId },
        { type: "Chat", id: "USER_LIST" },
        { type: "Chat", id: "ADMIN_LIST:ALL" },
        { type: "Chat", id: "ADMIN_LIST:OPEN" },
        { type: "Chat", id: "ADMIN_LIST:RESOLVED" },
      ],
    }),
    // PATCH /chat/:chatId/status
    updateChatStatus: builder.mutation<any, UpdateChatStatusArgs>({
      query: ({ chatId, status }: UpdateChatStatusArgs) => ({
        url: `/chat/${chatId}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: any) => ({
        ...response,
        chat: normalizeChat(response.chat),
      }),
      invalidatesTags: (_result, _error, { chatId }) => [
        { type: "Chat", id: chatId },
        { type: "Chat", id: "USER_LIST" },
        { type: "Chat", id: "ADMIN_LIST:ALL" },
        { type: "Chat", id: "ADMIN_LIST:OPEN" },
        { type: "Chat", id: "ADMIN_LIST:RESOLVED" },
      ],
    }),
  }),
});

export const {
  useGetChatQuery,
  useGetUserChatsQuery,
  useGetAllChatsQuery,
  useCreateChatMutation,
  useSendMessageMutation,
  useUpdateChatStatusMutation,
} = chatApi;
