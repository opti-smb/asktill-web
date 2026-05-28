import { useEffect, useRef, useState } from 'react';
import { ask, formatAskResponseForChat, getApiError } from '../../lib/api';
import { useAnalysis } from '../../context/AnalysisContext';
import { useChat } from '../../context/ChatContext';
import { SAMPLE_ASK_QUESTIONS } from '../../lib/sampleQuestions';
import styles from './AskChatPanel.module.css';

interface AskChatPanelProps {
  variant?: 'page' | 'drawer';
  onClose?: () => void;
}

export default function AskChatPanel({ variant = 'page', onClose }: AskChatPanelProps) {
  const { files } = useAnalysis();
  const { messages, setMessages } = useChat();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const hasFiles = Boolean(files.bank || files.pos || files.ecommerce);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleAsk(q?: string) {
    const text = (q ?? question).trim();
    if (!text) return;
    if (!hasFiles) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', text },
        {
          role: 'assistant',
          text: 'Upload bank, POS, and ecommerce reports at Sources first, then run analysis.',
        },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setQuestion('');
    setLoading(true);
    try {
      const { data } = await ask(text, files);
      const answer = formatAskResponseForChat(data);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer || 'No answer returned.' }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getApiError(err, "Sorry, I couldn't get an answer.") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`${styles.panel} ${variant === 'drawer' ? styles.panelDrawer : ''}`}>
      <div className={styles.head}>
        <div className={styles.headRow}>
          <div>
            <h2 className={styles.title}>Ask AskTill</h2>
            <p className={styles.sub}>
              {variant === 'drawer'
                ? 'Questions about your uploaded reports'
                : 'POST /api/ask — same answers as Postman'}
            </p>
          </div>
          {onClose && (
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {messages.length === 0 && (
          <div className={styles.welcome}>
            <p>Ask about revenue, fees, or reconciliation gaps after uploading your reports.</p>
            <div className={styles.sampleRow}>
              {SAMPLE_ASK_QUESTIONS.map((q) => (
                <button key={q} type="button" className={styles.sampleBtn} onClick={() => handleAsk(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`${styles.messageList} ${variant === 'drawer' ? styles.messageListDrawer : ''}`}>
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? styles.msgUser : styles.msgBot}>
              <span className={styles.msgLabel}>{msg.role === 'user' ? 'You' : 'AskTill'}</span>
              <p className={styles.msgText}>{msg.text}</p>
            </div>
          ))}
          {loading && (
            <div className={styles.msgBot}>
              <span className={styles.msgLabel}>AskTill</span>
              <p className={styles.msgText}>Thinking…</p>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className={styles.inputRow}>
          <input
            className={styles.input}
            placeholder="e.g. What are my highest fees?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAsk()}
            disabled={loading}
          />
          <button
            type="button"
            className={styles.sendBtn}
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
          >
            {loading ? '…' : 'Ask'}
          </button>
        </div>
      </div>
    </section>
  );
}
