import { apiSlice } from "../slices/ApiSlice";

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // GET /chat/:id
    getChat: builder.query({
      query: (id: string) => `/chat/${id}`,
      providesTags: (_result, _error, id: string) => [{ type: "Chat", id }],
    }),

    // GET /chat/user/:userId
    getUserChats: builder.query({
      query: () => `/chat/user`,
      providesTags: [{ type: "Chat", id: "USER_LIST" }],
    }),

    // GET /chat
    getAllChats: builder.query({
      query: (status?: "OPEN" | "RESOLVED") => ({
        url: "/chat",
        params: status ? { status } : undefined,
      }),
      providesTags: (_result, _error, status?: "OPEN" | "RESOLVED") => [
        { type: "Chat", id: `ADMIN_LIST:${status || "ALL"}` },
      ],
    }),

    // POST /chat
    createChat: builder.mutation({
      query: () => ({
        url: "/chat",
        method: "POST",
      }),
      invalidatesTags: [
        { type: "Chat", id: "USER_LIST" },
        { type: "Chat", id: "ADMIN_LIST:ALL" },
        { type: "Chat", id: "ADMIN_LIST:OPEN" },
      ],
    }),

    // POST /chat/:chatId/message
    sendMessage: builder.mutation({
      query: ({
        chatId,
        content,
        file,
      }: {
        chatId: string;
        content?: string;
        file?: File;
      }) => {
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
      invalidatesTags: (_result, _error, { chatId }: { chatId: string }) => [
        { type: "Chat", id: chatId },
        { type: "Chat", id: "USER_LIST" },
        { type: "Chat", id: "ADMIN_LIST:ALL" },
        { type: "Chat", id: "ADMIN_LIST:OPEN" },
        { type: "Chat", id: "ADMIN_LIST:RESOLVED" },
      ],
    }),
    // PATCH /chat/:chatId/status
    updateChatStatus: builder.mutation({
      query: ({
        chatId,
        status,
      }: {
        chatId: string;
        status: "OPEN" | "RESOLVED";
      }) => ({
        url: `/chat/${chatId}/status`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_result, _error, { chatId }: { chatId: string }) => [
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
