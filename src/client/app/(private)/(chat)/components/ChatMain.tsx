"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Menu, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import ChatTabs from "./ChatTabs";
import {
  getConversationSubtitle,
  getConversationTitle,
} from "../chatData";

interface ChatMainProps {
  children: React.ReactNode;
  onMenuClick: () => void;
  isMobile: boolean;
  sidebarOpen: boolean;
  chat?: any;
  onResolve?: () => void;
  canResolve?: boolean;
}

const ChatMain: React.FC<ChatMainProps> = ({
  children,
  onMenuClick,
  isMobile,
  sidebarOpen,
  chat,
  onResolve,
  canResolve = false,
}) => {
  const [tabsOpen, setTabsOpen] = React.useState(false);

  const toggleTabs = () => {
    setTabsOpen(!tabsOpen);
  };

  const getStatusStyles = (status?: string) => {
    switch (status) {
      case "OPEN":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "RESOLVED":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-gray-900">
              {getConversationTitle(chat)}
            </h1>
            <p className="truncate text-sm text-gray-500">
              {getConversationSubtitle(chat)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {chat?.status && (
            <div
              className={`hidden items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium sm:flex ${getStatusStyles(
                chat.status
              )}`}
            >
              <AlertCircle size={14} />
              <span className="capitalize">{chat.status.toLowerCase()}</span>
            </div>
          )}
          {canResolve && (
            <button
              onClick={onResolve}
              className="hidden items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:flex"
            >
              <CheckCircle2 size={16} />
              <span>Resolve</span>
            </button>
          )}
          <button
            onClick={toggleTabs}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle additional features"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>

      {/* Toggleable Tabs */}
      <ChatTabs
        isOpen={tabsOpen}
        onClose={() => setTabsOpen(false)}
        chat={chat}
        onResolve={onResolve}
        canResolve={canResolve}
      />
    </div>
  );
};

export default ChatMain;
