export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'C34 Event Sponsorship Match Desk API',
    version: '1.0.0',
    description: `Complete REST API for C34 Event Sponsorship Match Desk.
Integrates relational MySQL 8.x, JWT Authentication, Local Ollama AI, What-If Pricing Calculators, Exclusive Inventory Locking, and Deliverable Fulfilment Auditing.`,
    contact: {
      name: 'Event Sponsorship Match Desk Admin',
      email: 'admin@c34desk.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Backend Server'
    },
    {
      url: 'http://localhost:5173',
      description: 'Vite Frontend Proxy'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      AiHealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              available: { type: 'boolean', example: true },
              endpoint: { type: 'string', example: 'http://127.0.0.1:11434' },
              activeModel: { type: 'string', example: 'llama3.2:3b' },
              availableModels: {
                type: 'array',
                items: { type: 'string' },
                example: ['llama3.2:3b']
              },
              message: { type: 'string', example: 'Ollama is connected and ready using model llama3.2:3b' }
            }
          }
        }
      },
      AiChatRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', example: 'Suggest a creative pitch strategy for a fintech sponsor looking for collegiate tech reach.' },
          context: { type: 'object', example: { eventName: 'Global AI & Cloud Conclave 2026' } }
        }
      },
      EventToSponsorsMatchRequest: {
        type: 'object',
        required: ['eventId'],
        properties: {
          eventId: { type: 'integer', example: 1 }
        }
      },
      PricingCalculationRequest: {
        type: 'object',
        required: ['basePrice', 'discount', 'additionalCost', 'fulfilmentCost'],
        properties: {
          basePrice: { type: 'number', example: 35000 },
          discount: { type: 'number', example: 5000 },
          additionalCost: { type: 'number', example: 0 },
          fulfilmentCost: { type: 'number', example: 18000 }
        }
      },
      PricingCalculationResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              revenue: { type: 'number', example: 30000 },
              fulfilmentCost: { type: 'number', example: 18000 },
              contribution: { type: 'number', example: 12000 },
              contributionMargin: { type: 'number', example: 40.0 }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System health check',
        tags: ['System Health'],
        security: [],
        responses: {
          200: {
            description: 'Backend service is online',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    service: { type: 'string', example: 'c34-sponsorship-desk' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/ai/health': {
      get: {
        summary: 'Check local Ollama AI connectivity and active model',
        tags: ['AI Integration'],
        security: [],
        responses: {
          200: {
            description: 'Ollama connectivity telemetry',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AiHealthResponse' }
              }
            }
          }
        }
      }
    },
    '/api/ai/chat': {
      post: {
        summary: 'Interactive Ollama Chat Assistant',
        tags: ['AI Integration'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiChatRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'AI generation response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        reply: { type: 'string', example: 'Highlight exclusive booth placement and keynote speaking access to 15,000 tech attendees.' },
                        model: { type: 'string', example: 'llama3.2:3b' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/matching/event-to-sponsors': {
      post: {
        summary: 'Ollama AI Sponsor Finder for an Event',
        tags: ['AI Matching & Recommendations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EventToSponsorsMatchRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Ranked sponsor matches with Ollama scores and rationales',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          sponsorId: { type: 'integer' },
                          companyName: { type: 'string' },
                          matchScore: { type: 'number', example: 88 },
                          rationale: { type: 'string' },
                          potentialRisks: { type: 'string' },
                          suggestedPackage: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/matching/sponsor-to-events': {
      post: {
        summary: 'Ollama AI Recommended Events for a Sponsor',
        tags: ['AI Matching & Recommendations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sponsorId: { type: 'integer', example: 1 }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Ranked event recommendations'
          }
        }
      }
    },
    '/api/matching/prohibited-check': {
      post: {
        summary: 'Brand Safety & Category Exclusion Check',
        tags: ['Brand Safety'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sponsorId', 'eventId'],
                properties: {
                  sponsorId: { type: 'integer', example: 3 },
                  eventId: { type: 'integer', example: 1 }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Brand safety verdict (allowed/prohibited)'
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Authenticate user with email & password',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'organizer@techsummit.io' },
                  password: { type: 'string', example: 'password123' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'JWT token and user profile returned'
          }
        }
      }
    },
    '/api/auth/me': {
      get: {
        summary: 'Get currently authenticated user profile',
        tags: ['Authentication'],
        responses: {
          200: {
            description: 'Profile information'
          }
        }
      }
    },
    '/api/events': {
      get: {
        summary: 'List events with filters and reach metrics',
        tags: ['Event Management'],
        responses: {
          200: {
            description: 'Array of events'
          }
        }
      },
      post: {
        summary: 'Create a new event',
        tags: ['Event Management'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'category', 'location', 'startDate', 'endDate', 'estimatedReach'],
                properties: {
                  name: { type: 'string', example: 'National FinTech Expo 2026' },
                  category: { type: 'string', example: 'Finance & Technology' },
                  location: { type: 'string', example: 'Bangalore International Exhibition Centre' },
                  startDate: { type: 'string', example: '2026-11-20' },
                  endDate: { type: 'string', example: '2026-11-22' },
                  estimatedReach: { type: 'integer', example: 25000 }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Event created successfully' }
        }
      }
    },
    '/api/inventory/calculate-pricing': {
      post: {
        summary: 'Authoritative What-If Financial Calculator',
        tags: ['Financial & Pricing Calculator'],
        description: 'Implements formulas: Revenue = Base - Discount + Additions, Contribution = Revenue - Cost, Margin = Contribution / Revenue * 100.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PricingCalculationRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Calculated contribution and margin',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PricingCalculationResponse' }
              }
            }
          }
        }
      }
    },
    '/api/inventory/event/{eventId}': {
      get: {
        summary: 'Get inventory items and packages for an event',
        tags: ['Inventory & Packages'],
        parameters: [
          {
            name: 'eventId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'List of inventory items and packages' }
        }
      }
    },
    '/api/negotiations/proposals': {
      get: {
        summary: 'List proposals for current user',
        tags: ['Proposals & Negotiations'],
        responses: {
          200: { description: 'List of proposals with negotiation timeline' }
        }
      },
      post: {
        summary: 'Submit a new sponsorship proposal',
        tags: ['Proposals & Negotiations'],
        responses: {
          201: { description: 'Proposal created and inventory locked' }
        }
      }
    },
    '/api/negotiations/proposals/{id}/counteroffer': {
      post: {
        summary: 'Submit counteroffer with new price/benefits (Ollama strategy assistance)',
        tags: ['Proposals & Negotiations'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'Counteroffer submitted and version incremented' }
        }
      }
    },
    '/api/agreements': {
      get: {
        summary: 'List executed agreements',
        tags: ['Agreements & Contracts'],
        responses: {
          200: { description: 'Agreements with approval states' }
        }
      }
    },
    '/api/agreements/{id}/approve': {
      post: {
        summary: 'Approve agreement (requires mutual signatures)',
        tags: ['Agreements & Contracts'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'Signature recorded; transitions to mutually_approved when both sign' }
        }
      }
    },
    '/api/agreements/{id}/cancel': {
      post: {
        summary: 'Cancel agreement and release locked inventory in transaction',
        tags: ['Agreements & Contracts'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'Agreement cancelled and inventory restored' }
        }
      }
    },
    '/api/fulfilment/deliverables/{id}/evidence': {
      post: {
        summary: 'Submit deliverable proof (URL, screenshot, metrics)',
        tags: ['Deliverable Fulfilment & Reach Audit'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: { description: 'Evidence logged and deliverable marked submitted' }
        }
      }
    },
    '/api/fulfilment/deliverables/{id}/measured-reach': {
      post: {
        summary: 'Log audited measured reach with mandatory source & timestamp',
        tags: ['Deliverable Fulfilment & Reach Audit'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['measuredReach', 'source', 'measuredAt'],
                properties: {
                  measuredReach: { type: 'integer', example: 14850 },
                  source: { type: 'string', example: 'Venue Turnstile Badge Scan & AV Monitor Feed' },
                  measuredAt: { type: 'string', example: '2026-10-16T10:45:00Z' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Measured reach audited and quarantined from estimated reach' }
        }
      }
    },
    '/api/reports/pipeline': {
      get: {
        summary: 'Pipeline and financial breakdown analytics',
        tags: ['Reports & Analytics'],
        responses: {
          200: { description: 'Financial pipeline data' }
        }
      }
    },
    '/api/reports/export/csv': {
      get: {
        summary: 'Export sponsorship deals report in CSV format',
        tags: ['Reports & Analytics'],
        responses: {
          200: {
            description: 'CSV file download',
            content: { 'text/csv': {} }
          }
        }
      }
    },
    '/api/reports/export/json': {
      get: {
        summary: 'Export sponsorship deals report in JSON format',
        tags: ['Reports & Analytics'],
        responses: {
          200: {
            description: 'JSON file download',
            content: { 'application/json': {} }
          }
        }
      }
    },
    '/api/committees/events/{eventId}': {
      get: {
        summary: 'List verified event committee contacts (Sponsors see verified only, Organizers see all)',
        tags: ['Committees & Operations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'eventId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Verified committee contacts returned' }
        }
      },
      post: {
        summary: 'Add or register an event committee contact (Organizer/Admin only)',
        tags: ['Committees & Operations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'eventId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          201: { description: 'Committee contact registered' }
        }
      }
    },
    '/api/conversations': {
      get: {
        summary: 'List conversation threads for authenticated user',
        tags: ['Conversations & AI Assistant'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Threads list' }
        }
      },
      post: {
        summary: 'Create or locate conversation thread between sponsor and organizer',
        tags: ['Conversations & AI Assistant'],
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: 'Thread active' }
        }
      }
    },
    '/api/conversations/{id}/messages': {
      get: {
        summary: 'Get message history (Unapproved drafts strictly hidden from sponsors)',
        tags: ['Conversations & AI Assistant'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Messages list' }
        }
      },
      post: {
        summary: 'Send message with AI classification and committee contact grounding',
        tags: ['Conversations & AI Assistant'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          201: { description: 'Message sent or AI draft generated' }
        }
      }
    },
    '/api/conversations/approvals/pending': {
      get: {
        summary: 'Get high-risk AI drafts awaiting organizer approval',
        tags: ['Conversations & AI Assistant'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Pending approval drafts' }
        }
      }
    },
    '/api/conversations/approvals/{messageId}/decide': {
      post: {
        summary: 'Approve, Edit & Approve, or Reject AI draft with audit logging',
        tags: ['Conversations & AI Assistant'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'messageId', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          200: { description: 'Approval decision committed with audit log' }
        }
      }
    }
  }
};
