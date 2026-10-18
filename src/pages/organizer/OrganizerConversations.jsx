import React, { useState, useEffect, useRef } from 'react';
import OrganizerLayout from '../../layouts/OrganizerLayout';
import conversationService from '../../services/conversationService';
import {
  MessageSquare,
  Send,
  CheckCircle,
  Edit3,
  XCircle,
  AlertTriangle,
  Bot,
  User,
  Clock,
  Sparkles,
  Inbox,
  Filter,
  Check
} from 'lucide-react';

export default function OrganizerConversations() {
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'threads' | 'requirements'
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [draftEditText, setDraftEditText] = useState('');
  const [inputText, setInputText] = useState('');
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeThread && activeTab === 'threads') {
      loadMessages(activeThread.id);
    }
  }, [activeThread, activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      const [threadsRes, approvalsRes] = await Promise.all([
        conversationService.getThreads(),
        conversationService.getPendingApprovals()
      ]);

      if (threadsRes.success) {
        setThreads(threadsRes.data || []);
        if (threadsRes.data.length > 0 && !activeThread) {
          setActiveThread(threadsRes.data[0]);
        }
      }

      if (approvalsRes.success) {
        setPendingApprovals(approvalsRes.data || []);
        // If there are pending approvals, default to approvals tab
        if (approvalsRes.data.length > 0) {
          setActiveTab('approvals');
        } else {
          setActiveTab('threads');
        }
      }
    } catch (err) {
      console.error('Failed to load organizer conversation data:', err);
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

  async function handleDecision(messageId, decision, customText = null, notes = null) {
    try {
      const res = await conversationService.decideApproval(messageId, {
        decision,
        finalText: customText,
        notes
      });
      if (res.success) {
        setActionSuccess(`Draft successfully ${decision.replace(/_/g, ' ')}.`);
        setTimeout(() => setActionSuccess(null), 3000);
        setEditingDraftId(null);
        await loadData();
        if (activeThread) {
          await loadMessages(activeThread.id);
        }
      }
    } catch (err) {
      console.error('Failed to process approval decision:', err);
    }
  }

  async function handleSendMessage() {
    if (!inputText.trim() || !activeThread) return;
    try {
      const res = await conversationService.sendMessage(activeThread.id, inputText.trim());
      if (res.success) {
        setInputText('');
        await loadMessages(activeThread.id);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  return (
    <OrganizerLayout title="AI Messages & Approvals" subtitle="Review AI-generated negotiation drafts, approve high-risk replies, and chat with corporate sponsors">
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('approvals')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'approvals' ? '#2563eb' : 'transparent',
            color: activeTab === 'approvals' ? '#ffffff' : '#64748b',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={16} />
          Approval Queue
          {pendingApprovals.length > 0 && (
            <span style={{
              background: activeTab === 'approvals' ? '#ffffff' : '#ef4444',
              color: activeTab === 'approvals' ? '#2563eb' : '#ffffff',
              borderRadius: '999px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {pendingApprovals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('threads')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'threads' ? '#2563eb' : 'transparent',
            color: activeTab === 'threads' ? '#ffffff' : '#64748b',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <MessageSquare size={16} />
          Direct Conversations ({threads.length})
        </button>
      </div>

      {actionSuccess && (
        <div style={{
          padding: '12px 16px',
          background: '#dcfce7',
          color: '#166534',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem'
        }}>
          <Check size={18} />
          {actionSuccess}
        </div>
      )}

      {/* TAB 1: APPROVAL QUEUE */}
      {activeTab === 'approvals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pendingApprovals.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '48px 24px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <CheckCircle size={48} style={{ margin: '0 auto 12px', color: '#10b981' }} />
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#1e293b' }}>Approval Queue Clear</h3>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>No AI drafts currently require organizer authorization. Routine inquiries are handled automatically.</p>
            </div>
          ) : (
            pendingApprovals.map((draft) => {
              const isEditing = editingDraftId === draft.id;
              const displayText = isEditing ? draftEditText : draft.message_text;

              return (
                <div
                  key={draft.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #fed7aa',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Draft Header */}
                  <div style={{
                    padding: '14px 20px',
                    background: '#fff7ed',
                    borderBottom: '1px solid #ffedd5',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#fed7aa',
                        color: '#9a3412',
                        textTransform: 'uppercase'
                      }}>
                        <AlertTriangle size={12} /> {draft.classification.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                        Event: {draft.event_name || 'General Inquiry'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.8rem', color: '#7c2d12' }}>
                      Sponsor: <strong>{draft.sponsor_name}</strong> ({draft.sponsor_email})
                    </span>
                  </div>

                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Sponsor's Inquiry */}
                    <div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        Sponsor Question / Proposal:
                      </span>
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginTop: '6px',
                        fontSize: '0.9rem',
                        color: '#334155',
                        fontStyle: 'italic'
                      }}>
                        "{draft.sponsor_inquiry || 'High-risk query regarding terms, pricing, or commitments'}"
                      </div>
                    </div>

                    {/* AI Draft Response */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                          <Bot size={14} /> Proposed AI Draft (Gated from Sponsor):
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => { setEditingDraftId(draft.id); setDraftEditText(draft.message_text); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#2563eb',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600
                            }}
                          >
                            <Edit3 size={13} /> Edit Draft Before Sending
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div>
                          <textarea
                            rows={4}
                            value={draftEditText}
                            onChange={(e) => setDraftEditText(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '2px solid #2563eb',
                              fontSize: '0.9rem',
                              fontFamily: 'inherit',
                              boxSizing: 'border-box'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              onClick={() => handleDecision(draft.id, 'edited_and_approved', draftEditText)}
                              className="primary-button"
                              style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                            >
                              Save & Send to Sponsor
                            </button>
                            <button
                              onClick={() => setEditingDraftId(null)}
                              className="secondary-button"
                              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                            >
                              Cancel Edit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          fontSize: '0.9rem',
                          color: '#0369a1',
                          lineHeight: '1.5'
                        }}>
                          {draft.message_text}
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    {!isEditing && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                        <button
                          onClick={() => handleDecision(draft.id, 'rejected')}
                          className="secondary-button"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#dc2626',
                            borderColor: '#fca5a5',
                            fontSize: '0.85rem'
                          }}
                        >
                          <XCircle size={15} /> Reject & Discard
                        </button>
                        <button
                          onClick={() => handleDecision(draft.id, 'approved')}
                          className="primary-button"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#16a34a',
                            borderColor: '#16a34a',
                            fontSize: '0.85rem'
                          }}
                        >
                          <CheckCircle size={15} /> Approve & Dispatch to Sponsor
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE CONVERSATIONS CHAT */}
      {activeTab === 'threads' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '20px',
          height: 'calc(100vh - 240px)',
          minHeight: '520px'
        }}>
          {/* Thread List */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Sponsor Inquiries</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{threads.length} active threads</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {threads.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveThread(t)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: activeThread?.id === t.id ? '#eff6ff' : '#ffffff',
                    borderLeft: activeThread?.id === t.id ? '4px solid #2563eb' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                      {t.sponsor_name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {new Date(t.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#2563eb', marginBottom: '4px' }}>
                    {t.event_name || 'General Inquiry'}
                  </div>
                  <div style={{
                    fontSize: '0.78rem',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {t.last_message_snippet || 'No messages'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Stream */}
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
                        Sponsor: {activeThread.sponsor_name} ({activeThread.sponsor_email})
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {messages.map((m) => {
                    const isOrganizer = m.sender_role === 'organizer';
                    const isAi = m.is_ai_generated;
                    const isPending = m.approval_status === 'pending_approval';

                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: isOrganizer ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isOrganizer ? 'flex-end' : 'flex-start'
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
                              <span style={{ fontWeight: 600, color: '#2563eb' }}>
                                AI Draft {isPending ? '(PENDING APPROVAL)' : '(Dispatched)'}
                              </span>
                            </>
                          ) : isOrganizer ? (
                            <>
                              <span style={{ fontWeight: 600 }}>You (Organizer)</span>
                              <User size={13} />
                            </>
                          ) : (
                            <>
                              <User size={13} style={{ color: '#0284c7' }} />
                              <span style={{ fontWeight: 600, color: '#0284c7' }}>Sponsor</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div style={{
                          padding: '12px 16px',
                          borderRadius: isOrganizer ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          background: isOrganizer
                            ? '#059669'
                            : isPending
                              ? '#fff7ed'
                              : isAi
                                ? '#f0f9ff'
                                : '#f1f5f9',
                          color: isOrganizer ? '#ffffff' : '#1e293b',
                          border: isPending ? '2px dashed #f97316' : (isAi ? '1px solid #bae6fd' : 'none'),
                          fontSize: '0.9rem',
                          lineHeight: '1.45',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {m.message_text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Write a direct reply to the sponsor..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="primary-button"
                    style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={15} />
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                <MessageSquare size={48} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
                <h3>Select a conversation thread</h3>
              </div>
            )}
          </div>
        </div>
      )}
    </OrganizerLayout>
  );
}
