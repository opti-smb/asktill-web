import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  CHAT_STORAGE_KEY,
  SESSION_EXPIRED_EVENT,
  USER_LOGOUT_EVENT,
  USER_STATE_RESET_EVENT,
  clearChatHistoryStorage,
} from '../lib/api';
import { useAuth } from './AuthContext';

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

function storageKeyForUser(userId: string): string {
  return `${CHAT_STORAGE_KEY}:${userId}`;
}

function loadStoredMessages(userId: string | null): ChatMessage[] {
  if (!userId) return [];
  try {
    const raw =
      sessionStorage.getItem(storageKeyForUser(userId)) ??
      sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ChatMessage =>
        Boolean(item) &&
        typeof item === 'object' &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof (item as ChatMessage).text === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Ask chat history for the current auth session.
 * Survives opening/closing the chat drawer and in-tab navigation.
 * Cleared on logout / session expiry; fresh empty chat after each new sign-in.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isAuth } = useAuth();
  const userId = isAuth ? user?.userId?.trim() || null : null;
  const userIdRef = useRef<string | null>(userId);
  const [messages, setMessagesState] = useState<ChatMessage[]>(() =>
    loadStoredMessages(userId),
  );

  const clearMessages = useCallback(() => {
    setMessagesState([]);
    clearChatHistoryStorage();
  }, []);

  const setMessages = useCallback(
    (next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessagesState(next);
    },
    [],
  );

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessagesState((prev) => [...prev, message]);
  }, []);

  // Switch / clear history when auth session user changes.
  useEffect(() => {
    if (userId === userIdRef.current) return;
    userIdRef.current = userId;
    if (!userId) {
      clearMessages();
      return;
    }
    setMessagesState(loadStoredMessages(userId));
  }, [userId, clearMessages]);

  // Persist for this signed-in user only (same browser tab / sessionStorage).
  useEffect(() => {
    if (!userId) return;
    try {
      sessionStorage.setItem(storageKeyForUser(userId), JSON.stringify(messages));
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      /* ignore quota / private mode */
    }
  }, [messages, userId]);

  useEffect(() => {
    const onClear = () => {
      userIdRef.current = null;
      clearMessages();
    };
    window.addEventListener(USER_LOGOUT_EVENT, onClear);
    window.addEventListener(USER_STATE_RESET_EVENT, onClear);
    window.addEventListener(SESSION_EXPIRED_EVENT, onClear);
    return () => {
      window.removeEventListener(USER_LOGOUT_EVENT, onClear);
      window.removeEventListener(USER_STATE_RESET_EVENT, onClear);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onClear);
    };
  }, [clearMessages]);

  const value = useMemo(
    () => ({ messages, appendMessage, setMessages, clearMessages }),
    [messages, appendMessage, setMessages, clearMessages],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
