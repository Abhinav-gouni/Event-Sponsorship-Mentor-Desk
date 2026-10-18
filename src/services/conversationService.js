import api from './api';

export const conversationService = {
  // Threads & Messages
  getThreads: async () => {
    const res = await api.get('/conversations');
    return res.data;
  },

  getThreadMessages: async (threadId) => {
    const res = await api.get(`/conversations/${threadId}/messages`);
    return res.data;
  },

  sendMessage: async (threadId, messageText) => {
    const res = await api.post(`/conversations/${threadId}/messages`, {
      message_text: messageText
    });
    return res.data;
  },

  createThread: async (threadData) => {
    const res = await api.post('/conversations', threadData);
    return res.data;
  },

  // Organizer Approval Workflow
  getPendingApprovals: async () => {
    const res = await api.get('/conversations/approvals/pending');
    return res.data;
  },

  decideApproval: async (messageId, { decision, finalText, notes }) => {
    const res = await api.post(`/conversations/approvals/${messageId}/decide`, {
      decision,
      finalText,
      notes
    });
    return res.data;
  },

  getEventRequirements: async (eventId) => {
    const res = await api.get(`/conversations/requirements/${eventId}`);
    return res.data;
  },

  // Committee Contacts
  getEventCommittees: async (eventId) => {
    const res = await api.get(`/committees/events/${eventId}`);
    return res.data;
  },

  getCommitteeByType: async (eventId, committeeType) => {
    const res = await api.get(`/committees/events/${eventId}/${committeeType}`);
    return res.data;
  },

  createCommitteeContact: async (eventId, contactData) => {
    const res = await api.post(`/committees/events/${eventId}`, contactData);
    return res.data;
  },

  updateCommitteeContact: async (contactId, contactData) => {
    const res = await api.put(`/committees/${contactId}`, contactData);
    return res.data;
  },

  verifyCommitteeContact: async (contactId) => {
    const res = await api.patch(`/committees/${contactId}/verify`);
    return res.data;
  },

  deactivateCommitteeContact: async (contactId) => {
    const res = await api.patch(`/committees/${contactId}/deactivate`);
    return res.data;
  }
};

export default conversationService;
