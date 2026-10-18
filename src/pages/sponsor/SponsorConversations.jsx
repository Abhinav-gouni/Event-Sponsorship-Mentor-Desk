import React, { useState, useEffect, useRef } from 'react';
import SponsorLayout from '../../layouts/SponsorLayout';
import conversationService from '../../services/conversationService';
import CommitteeContactCard from '../../components/common/CommitteeContactCard';
import {
  MessageSquare,
  Send,
  ShieldCheck,
  Droplets,
  Bus,
  Utensils,
  Stethoscope,
  Truck,
  Settings,
  Bot,
  User,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const QUICK_COMMITTEE_CHIPS = [
  { label: 'Security', icon: ShieldCheck, query: 'Who is the contact person for Security and what are their working hours?' },
  { label: 'Water', icon: Droplets, query: 'Can you provide the contact details for the Water & Hydration committee?' },
  { label: 'Transport', icon: Bus, query: 'Who should we contact for sponsor airport and venue Transport shuttle?' },
  { label: 'Food & Catering', icon: Utensils, query: 'Who is in charge of Food catering and sponsor lounge hospitality?' },
  { label: 'Medical', icon: Stethoscope, query: 'Can I get the contact details for the Medical first aid committee?' },
  { label: 'Logistics', icon: Truck, query: 'Who is the dock manager for Logistics and booth delivery freight?' },
  { label: 'Event Operations', icon: Settings, query: 'Who is the floor manager for Event Operations and booth walkthroughs?' }
];

export default function SponsorConversations() {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reviewNotice, setReviewNotice] = useState(null);
  const [verifiedCommittees, setVerifiedCommittees] = useState([]);
  const [showCommitteeDirectory, setShowCommitteeDirectory] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread.id);
      if (activeThread.event_id) {
        loadCommittees(activeThread.event_id);
      }
    }
  }, [activeThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadThreads() {
    try {
      setLoading(true);
      const res = await conversationService.getThreads();
      if (res.success && res.data) {
        setThreads(res.data);
        if (res.data.length > 0 && !activeThread) {
          setActiveThread(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(threadId) {
    try {
      const res = await conversationService.getThreadMessages(threadId);
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }

  async function loadCommittees(eventId) {
    try {
      const res = await conversationService.getEventCommittees(eventId);
      if (res.success) {
        setVerifiedCommittees(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load committees:', err);
    }
  }

  async function handleSendMessage(customText) {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !activeThread || sending) return;

    setSending(true);
    setReviewNotice(null);

    try {
      const res = await conversationService.sendMessage(activeThread.id, textToSend);
      if (res.success) {
        setInputText('');
        if (res.pendingApproval) {
          setReviewNotice('Your message includes terms or pricing that require organizer review. A representative has been notified and will reply shortly.');
        }
        await loadMessages(activeThread.id);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <SponsorLayout title="Messages & Committee Assistant" subtitle="Direct organizer communications with AI-assisted verified committee lookup">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '20px',
        height: 'calc(100vh - 180px)',
        minHeight: '550px'
      }}>
        {/* Left Column: Thread List */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Active Conversations</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{threads.length} ongoing threads</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading conversations...</div>
            ) : threads.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                <p>No active conversations found.</p>
              </div>
            ) : (
              threads.map((t) => (
                <div
                  key={t.id}
                  onClick={() => { setActiveThread(t); setReviewNotice(null); }}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: activeThread?.id === t.id ? '#eff6ff' : '#ffffff',
                    borderLeft: activeThread?.id === t.id ? '4px solid #2563eb' : '4px solid transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                      {t.event_name || 'General Inquiry'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(t.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '4px' }}>
                    Organizer: {t.organizer_name}
                  </div>
                  <div style={{
                    fontSize: '0.78rem',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {t.last_message_snippet || 'No messages yet'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Chat Stream & Actions */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {activeThread ? (
            <>
              {/* Header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{activeThread.subject}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 500 }}>
                      {activeThread.event_name || 'All Events'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>•</span>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Organizer: {activeThread.organizer_name}
                    </span>
                  </div>
                </div>

                {activeThread.event_id && (
                  <button
                    onClick={() => setShowCommitteeDirectory(!showCommitteeDirectory)}
                    className="secondary-button"
                    style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ShieldCheck size={16} />
                    {showCommitteeDirectory ? 'Hide Directory' : 'Committee Directory'}
                  </button>
                )}
              </div>

              {/* Committee Directory Modal/Drawer */}
              {showCommitteeDirectory && (
                <div style={{
                  padding: '16px 20px',
                  background: '#f0f9ff',
                  borderBottom: '1px solid #bae6fd',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0369a1', fontWeight: 600 }}>
                      Verified Committee Contacts — {activeThread.event_name}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                      {verifiedCommittees.length} verified departments
                    </span>
                  </div>
                  {verifiedCommittees.length === 0 ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      No verified committee contacts published yet for this event.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                      {verifiedCommittees.map(c => (
                        <CommitteeContactCard key={c.id} contact={c} isManager={false} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Committee Chips */}
              <div style={{
                padding: '8px 16px',
                background: '#fafafa',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  <Sparkles size={13} style={{ color: '#eab308' }} /> Ask Committee:
                </span>
                {QUICK_COMMITTEE_CHIPS.map((chip, idx) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.query)}
                      disabled={sending}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '0.75rem',
                        color: '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                    >
                      <Icon size={12} />
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Review Banner if triggered */}
              {reviewNotice && (
                <div style={{
                  padding: '10px 16px',
                  background: '#fef3c7',
                  borderBottom: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} />
                  <span>{reviewNotice}</span>
                </div>
              )}

              {/* Message History */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                    <Bot size={40} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Send a message or click a committee button above to begin.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSponsor = m.sender_role === 'sponsor';
                    const isAi = m.is_ai_generated || m.sender_role === 'ai_assistant';

                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isSponsor ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isSponsor ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '4px',
                          fontSize: '0.75rem',
                          color: '#64748b'
                        }}>
                          {isAi ? (
                            <>
                              <Bot size={13} style={{ color: '#2563eb' }} />
                              <span style={{ fontWeight: 600, color: '#2563eb' }}>AI Committee Assistant</span>
                            </>
                          ) : isSponsor ? (
                            <>
                              <span style={{ fontWeight: 600 }}>You</span>
                              <User size={13} />
                            </>
                          ) : (
                            <>
                              <User size={13} style={{ color: '#059669' }} />
                              <span style={{ fontWeight: 600, color: '#059669' }}>Organizer</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div style={{
                          padding: '12px 16px',
                          borderRadius: isSponsor ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          background: isSponsor
                            ? '#2563eb'
                            : isAi
                              ? '#f0f9ff'
                              : '#f1f5f9',
                          color: isSponsor ? '#ffffff' : '#1e293b',
                          border: isAi ? '1px solid #bae6fd' : 'none',
                          fontSize: '0.9rem',
                          lineHeight: '1.45',
                          whiteSpace: 'pre-wrap',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          {m.message_text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Box */}
              <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Ask a question about committee contacts, schedule, or sponsorship details..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem'
                  }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={sending || !inputText.trim()}
                  className="primary-button"
                  style={{
                    padding: '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: sending || !inputText.trim() ? 0.6 : 1
                  }}
                >
                  <Send size={15} />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
              <h3 style={{ margin: 0, fontWeight: 500, color: '#64748b' }}>Select a conversation</h3>
              <p style={{ fontSize: '0.85rem' }}>Choose an active thread to view messages and contact event committees.</p>
            </div>
          )}
        </div>
      </div>
    </SponsorLayout>
  );
}
