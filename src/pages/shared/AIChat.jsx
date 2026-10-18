import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import SponsorLayout from '../../layouts/SponsorLayout';
import AdminLayout from '../../layouts/AdminLayout';
import api from '../../services/api';
import { Bot, Send, Sparkles, User } from 'lucide-react';

export default function AIChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: `Hello ${user?.name || ''}! I am your C34 Sponsorship AI Advisor powered by local Ollama. Ask me anything about deal valuation, contribution margins, exclusivity terms, counteroffers, or fulfilment telemetry.`,
      suggested_actions: [
        'Calculate margin for ₹30k revenue with ₹18k cost',
        'How should I enforce title exclusivity?',
        'Best strategy to counter a 20% discount request'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { id: Date.now(), sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: textToSend,
        context: { role: user?.role, name: user?.name }
      });

      if (res.data?.success && res.data.data) {
        const replyData = res.data.data;
        const aiMsg = {
          id: Date.now() + 1,
          sender: 'assistant',
          text: replyData.reply || 'Analysis complete.',
          suggested_actions: replyData.suggested_actions || [],
          key_metrics: replyData.key_metrics || null,
          is_ai_generated: replyData.is_ai_generated
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'The local AI advisor is currently processing another task. Recommended platform rule: Always protect at least a 40% contribution margin (Revenue ₹30k - Cost ₹18k = Contribution ₹12k).'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const Layout = user?.role === 'sponsor' ? SponsorLayout : user?.role === 'admin' ? AdminLayout : OrganizerLayout;

  return (
    <Layout title="AI Sponsorship Advisor" subtitle="Interactive strategy, margin validation, and negotiation co-pilot powered by local Ollama">
      <div className="panel chat-panel" style={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--violet)" />
            <h3 style={{ margin: 0 }}>Sponsorship Intelligence Co-Pilot</h3>
          </div>
          <span className="badge badge-success">Local Ollama Active</span>
        </div>

        {/* Chat History Window */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {m.sender === 'assistant' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ede9fe', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Bot size={18} color="var(--violet)" />
                </div>
              )}

              <div
                style={{
                  background: m.sender === 'user' ? 'var(--violet)' : '#f8fafc',
                  color: m.sender === 'user' ? 'white' : '#0f172a',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: m.sender === 'user' ? 'none' : '1px solid var(--border)',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                {m.key_metrics && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', background: 'white', borderRadius: '6px', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                    {m.key_metrics}
                  </div>
                )}

                {/* Suggested Action Pills */}
                {(m.suggested_actions || []).length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {m.suggested_actions.map((act, idx) => (
                      <button
                        key={idx}
                        className="action-btn-sm"
                        style={{ fontSize: '0.78rem', background: 'white', borderColor: '#c7d2fe', color: 'var(--violet)' }}
                        onClick={() => handleSend(act)}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <User size={16} color="white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
              <span>Ollama AI is analyzing commercial strategy...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="filter-input"
            placeholder="Type your question regarding sponsorship valuation, margins, or counteroffers..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            className="primary-button"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={16} /> Send
          </button>
        </div>
      </div>
    </Layout>
  );
}
