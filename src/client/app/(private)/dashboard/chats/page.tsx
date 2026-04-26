"use client";
import { useState } from "react";
import { useGetAllChatsQuery } from "@/app/store/apis/ChatApi";
import { useAdminSocketEvents } from "../../(chat)/useAdminSocketEvents";
import ChatContainer from "../../(chat)";
import useToast from "@/app/hooks/ui/useToast";
import { withAuth } from "@/app/components/HOC/WithAuth";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  getConversationSubtitle,
  getConversationTitle,
} from "../../(chat)/chatData";

const AdminChatsPage = () => {
  const { showToast } = useToast();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const isCompactScreen = useMediaQuery("(max-width: 1024px)");
  const { data: chats, isLoading, refetch } = useGetAllChatsQuery("OPEN");
  console.log("chats => ", chats);

  // Listen for admin socket events
  useAdminSocketEvents(
    () => {
      showToast("New chat created", "success");
      console.log("chat created");
      refetch();
    },
    () => {
      showToast("Chat status updated", "success");
      console.log("chat status updated");
      refetch();
    },
    () => {
      showToast("New customer message received", "success");
      console.log("chat message created");
      refetch();
    }
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-gray-100">
      {/* Sidebar with chat list */}
      <div
        className={`${
          isCompactScreen && activeChatId ? "hidden" : "block"
        } w-full flex-shrink-0 border-gray-200 bg-white lg:w-64 lg:border-r`}
      >
        <div className="flex h-full min-h-0 flex-col p-4">
          <h2 className="mb-4 text-lg font-semibold">Open Support Chats</h2>

          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div>Loading open chats...</div>
            ) : chats?.chats?.length === 0 ? (
              <div className="text-gray-500">No open chats</div>
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
        </div>
      </div>

      {/* Main chat area */}
      <div
        className={`${
          isCompactScreen && !activeChatId ? "hidden" : "flex"
        } min-h-0 flex-1 flex-col overflow-hidden`}
      >
        {isCompactScreen && activeChatId && (
          <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
            <button
              onClick={() => setActiveChatId(null)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              <span>Back to chats</span>
            </button>
          </div>
        )}
        {activeChatId ? (
          <ChatContainer chatId={activeChatId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a chat to view messages
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(AdminChatsPage);
