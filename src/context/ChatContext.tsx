import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CHAT_STORAGE_KEY, USER_LOGOUT_EVENT, USER_STATE_RESET_EVENT } from '../lib/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ChatContextValue {
  messages: ChatMessage[];
  appendMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function loadStoredMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ChatMessage =>
        item &&
        typeof item === 'object' &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.text === 'string'
    );
  } catch {
    return [];
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessagesState] = useState<ChatMessage[]>(loadStoredMessages);

  useEffect(() => {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const setMessages = useCallback(
    (next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessagesState(next);
    },
    []
  );

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessagesState((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessagesState([]);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const onReset = () => clearMessages();
    window.addEventListener(USER_LOGOUT_EVENT, onReset);
    window.addEventListener(USER_STATE_RESET_EVENT, onReset);
    return () => {
      window.removeEventListener(USER_LOGOUT_EVENT, onReset);
      window.removeEventListener(USER_STATE_RESET_EVENT, onReset);
    };
  }, [clearMessages]);

  const value = useMemo(
    () => ({ messages, appendMessage, setMessages, clearMessages }),
    [messages, appendMessage, setMessages, clearMessages]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
