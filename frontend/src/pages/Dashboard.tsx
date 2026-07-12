import { useState, useCallback } from 'react';
import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout';
import { ChatPane } from '../components/chat/ChatPane';

export function Dashboard() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
  }, []);

  const handleChatSelect = useCallback((chatId: string) => {
    setActiveChatId(chatId);
  }, []);

  const handleNewChatCreated = useCallback((chatId: string) => {
    setActiveChatId(chatId);
  }, []);

  return (
    <ThreeColumnLayout
      activeChatId={activeChatId}
      onChatSelect={handleChatSelect}
      onNewChat={handleNewChat}
    >
      <ChatPane
        chatId={activeChatId}
        onNewChatCreated={handleNewChatCreated}
      />
    </ThreeColumnLayout>
  );
}
