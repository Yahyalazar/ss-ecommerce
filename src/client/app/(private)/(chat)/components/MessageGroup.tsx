"use client";

import React from "react";
import { motion } from "framer-motion";
import MessageItem from "./MessageItem";

interface MessageGroupProps {
  messages: any[];
  isCurrentUser: boolean;
  currentUserId: string;
}

const MessageGroup: React.FC<MessageGroupProps> = ({
  messages,
  isCurrentUser,
  currentUserId
}) => {
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-full flex-col space-y-1 sm:max-w-[80%] lg:max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.3,
              delay: index * 0.1,
              type: "spring",
              stiffness: 200
            }}
            className="max-w-full"
          >
            <MessageItem
              message={message}
              isCurrentUser={isCurrentUser}
              showAvatar={index === messages.length - 1}
              showTime={index === messages.length - 1}
              isFirstInGroup={index === 0}
              isLastInGroup={index === messages.length - 1}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MessageGroup;
