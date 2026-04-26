"use client";
import { useState } from "react";
import {
  useCreateChatMutation,
  useGetUserChatsQuery,
} from "@/app/store/apis/ChatApi";
import ChatContainer from "../(chat)";
import MainLayout from "@/app/components/templates/MainLayout";
import { withAuth } from "@/app/components/HOC/WithAuth";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  getConversationSubtitle,
  getConversationTitle,
} from "../(chat)/chatData";

const SupportPage = () => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const isCompactScreen = useMediaQuery("(max-width: 1024px)");
  console.log("activeChatId => ", activeChatId);
  const { data: chats, isLoading } = useGetUserChatsQuery(undefined);
  console.log("user chats => ", chats);

  const [createChat, { isLoading: isCreatingChat }] = useCreateChatMutation();

  const handleCreateChat = async () => {
    try {
      const result = await createChat(undefined).unwrap();
      console.log("create chat result => ", result);
      const newChatId = result.chat.id;
      setActiveChatId(newChatId);
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  return (
    <MainLayout>
      <div className="flex h-full min-h-0 flex-col py-6">
        {/* Sidebar with chat list */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <div
          className={`${
            isCompactScreen && activeChatId ? "hidden" : "block"
          } min-h-0 w-full rounded-2xl border border-gray-200 bg-white lg:w-[30%] lg:rounded-none lg:border-0 lg:border-r`}
        >
          <div className="flex h-full min-h-0 flex-col p-4">
            <h2 className="mb-4 text-lg font-semibold">Support Conversations</h2>

            <div className="flex-1 overflow-y-auto pr-1">
              {isLoading ? (
                <div>Loading your conversations...</div>
              ) : chats?.chats?.length === 0 ? (
                <div className="text-gray-500">No conversations yet</div>
              ) : (
                <ul className="space-y-2">
                  {chats?.chats?.map((chat) => {
                    const isActive = activeChatId === chat.id;

                    return (
                      <li
                        key={chat.id}
                        onClick={() => setActiveChatId(chat.id)}
                        aria-pressed={isActive}
                        className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                          isActive
                            ? "border-blue-200 bg-blue-100 text-blue-900 shadow-sm"
                            : "border-transparent hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {getConversationTitle(chat)}
                            </div>
                            <div
                              className={`truncate text-sm ${
                                isActive ? "text-blue-700" : "text-gray-500"
                              }`}
                            >
                              {getConversationSubtitle(chat)}
                            </div>
                          </div>
                          {isActive && (
                            <CheckCircle2
                              size={18}
                              className="mt-0.5 shrink-0 text-blue-600"
                            />
                          )}
                        </div>
                        <div
                          className={`mt-2 text-xs ${
                            isActive ? "text-blue-500" : "text-gray-400"
                          }`}
                        >
                          Conversation #{chat.id.substring(0, 8)}
                        </div>
                        <div
                          className={`mt-1 flex items-center text-sm ${
                            isActive ? "text-blue-700" : "text-gray-500"
                          }`}
                        >
                          <span
                            className={`mr-2 inline-block h-2 w-2 rounded-full ${
                              chat.status === "OPEN" ? "bg-green-500" : "bg-gray-400"
                            }`}
                          ></span>
                          {chat.status === "OPEN" ? "Active" : "Resolved"}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button
              onClick={handleCreateChat}
              disabled={isCreatingChat}
              className={`mt-4 w-full rounded-lg p-2 text-white transition-colors ${
                isCreatingChat
                  ? "cursor-not-allowed bg-blue-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isCreatingChat ? "Creating..." : "New Conversation"}
            </button>
          </div>
        </div>

        {/* Main chat area */}
        <div
          className={`${
            isCompactScreen && !activeChatId ? "hidden" : "flex"
          } min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white lg:h-full lg:rounded-none lg:border-0`}
        >
          {isCompactScreen && activeChatId && (
            <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
              <button
                onClick={() => setActiveChatId(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ArrowLeft size={16} />
                <span>Back to conversations</span>
              </button>
            </div>
          )}
          {activeChatId ? (
            <ChatContainer chatId={activeChatId} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a conversation or start a new one
            </div>
          )}
        </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default withAuth(SupportPage);
