# C34 Event Sponsorship Match Desk

A full-stack, enterprise-grade sponsorship matching, pricing, negotiation, agreement execution, and fulfilment tracking platform. Built with **React + Vite**, **Node.js + Express**, **MySQL 8.4** (with connection pooling and transactions), and **Local Ollama AI**.

---

## 1. Project Overview & Role Architecture

The platform supports three distinct roles with dedicated workspaces and authorization:

1. **Organizer Portal**:
   - **Executive Dashboard**: Live revenue metrics, pipeline status, upcoming deadlines, fulfilment rates, and Recharts pipeline visualizers.
   - **Event Management**: Create, edit, publish, and archive events with date validations and prohibited category restrictions.
   - **Sponsor Intelligence Database**: Search and filter corporate sponsors by budget, industry, and city; shortlist leads and track outreach status.
   - **AI Sponsor Finder**: Recommends corporate sponsors using **local Ollama AI**, analyzing category overlap, audience demographics, and brand safety.
   - **Sponsorship Inventory Management**: Create benefit slots (Title, Gold, Booth, Speaking, etc.), toggle strict exclusivity, and prevent double-booking via MySQL transactions.
   - **Package Builder & What-If Pricing Calculator**: Interactive calculator enforcing authoritative platform formulas:
     - `Revenue = Base Price - Discount + Additional Cost`
     - `Contribution = Revenue - Fulfilment Cost`
     - `Contribution Margin = (Contribution / Revenue) × 100`
     - *Benchmark verified*: ₹30,000 Revenue − ₹18,000 Cost = ₹12,000 Contribution (40.0% Margin).
   - **Negotiation Assistant**: Incoming proposals, round version history, counteroffer drafting, and AI tactical advice.
   - **Legal Agreements & Exclusivity**: Automatic drafting from accepted proposals, versioning preservation (never overwrites terms), mutual signing requirements, and cancellation inventory release.
   - **Fulfilment Tracking**: Submit proof of delivery (URLs, high-res photos, videos) with **audited measured reach** (strictly distinct from initial estimated reach, with source & timestamp).
   - **Reports & Data Exports**: Comprehensive reports and one-click CSV / JSON exports.

2. **Sponsor Portal**:
   - **Sponsor Dashboard**: Contracted value, active partnerships, and pending counteroffer alerts.
   - **Corporate Profile**: Manage corporate identity, website, target demographics, and brand positioning.
   - **Sponsorship Preferences & Brand Safety**: Set preferred event categories, target cities, quarterly budgets, and brand safety exclusions (e.g. alcohol, gambling, tobacco).
   - **AI Event Recommendations**: Ollama AI evaluates published events and ranks them by compatibility score and audience alignment.
   - **Browse Events**: Search published events, inspect inventory opportunities, and submit proposals.
   - **Active Negotiations & Proposals**: Review counteroffers from organizers, inspect version history, send revised offers, or accept deals.
   - **Active Sponsorship Contracts**: Review master terms, countersign agreements, and track deliverables.
   - **Fulfilment Review**: Review evidence submitted by organizers, verify measured reach, and approve or reject deliverables with mandatory feedback.

3. **Administrator Portal**:
   - Total users, organizers, sponsors, events, proposals, and agreements.
   - Real-time system telemetry: Express backend uptime, MySQL connection pool health, and local Ollama model status.
   - User governance: Search, filter by role/status, toggle active/disabled states, and delete accounts with modal confirmation.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, React Router 6, Custom CSS with CSS variables, Framer Motion, Lucide React icons, Recharts, Axios.
- **Backend**: Node.js 24, Express 4, RESTful APIs, MySQL2 connection pool, JWT Authentication, bcrypt password hashing.
- **Database**: Compulsory MySQL 8.x relational schema with 21 tables, foreign key constraints, unique indexes, and ACID transactions.
- **AI Engine**: Local Ollama (`http://127.0.0.1:11434`), default model `qwen2.5:7b` (with automatic fallback to available local models like `llama3.2:3b` and heuristic fallbacks).

---

## 3. Directory Structure

```text
├── database/
│   ├── schema.sql              # Relational schema (21 tables, constraints, indexes)
│   ├── seed.sql                # Demonstration dataset with events, packages, agreements
│   └── setup.js                # Repeatable database initialization runner
├── server/
│   ├── config/
│   │   ├── database.js         # MySQL2 connection pool configuration
│   │   └── ollama.js           # Local Ollama endpoint and model settings
│   ├── controllers/
│   │   ├── agreementController.js
│   │   ├── aiController.js
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   ├── fulfilmentController.js
│   │   ├── inventoryController.js
│   │   ├── matchingController.js
│   │   ├── proposalController.js
│   │   ├── reportController.js
│   │   └── sponsorController.js
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT validation & role enforcement
│   │   └── errorMiddleware.js  # Centralized error handler
│   ├── routes/                 # REST API route handlers
│   ├── services/
│   │   ├── exclusivityService.js # Brand safety & prohibited category validation
│   │   ├── inventoryService.js   # Transaction-safe reservation & release
│   │   ├── notificationService.js# Deduplicated in-app notification engine
│   │   └── ollamaService.js      # Reusable Ollama AI matching & strategy
│   ├── utils/
│   │   └── financials.js       # Authoritative contribution & margin formulas
│   ├── app.js                  # Express application setup
│   └── index.js                # Server entry point
├── src/
│   ├── components/             # Reusable UI components (Sidebar, Topbar, StatCard)
│   ├── context/                # AuthContext, NotificationContext, ThemeContext
│   ├── layouts/                # OrganizerLayout, SponsorLayout, AdminLayout, AuthLayout
│   ├── pages/
│   │   ├── admin/              # AdminDashboard
│   │   ├── auth/               # Login, Register
│   │   ├── organizer/          # OrganizerDashboard, Events, CreateEvent, Sponsors,
│   │   │                       # SponsorFinder, Inventory, PackageBuilder,
│   │   │                       # Negotiations, Agreements, Fulfilment, Reports
│   │   ├── shared/             # Notifications, AIChat (Advisor), NotFound
│   │   └── sponsor/            # SponsorDashboard, BusinessProfile, SponsorshipPreferences,
│   │                           # RecommendedEvents, BrowseEvents, Proposals,
│   │                           # NegotiationHistory, ActiveSponsorships, FulfilmentReview
│   ├── services/               # Axios API client with auth interceptors
│   ├── App.jsx                 # Role-based protected routes
│   └── index.css               # Design system styling
├── tests/
│   └── comprehensive.test.js   # 32 automated tests verifying critical business rules
├── Starter_Data/               # Starter fixture directory
├── package.json
└── vite.config.js
```

---

## 4. Setup and Launch Instructions

### Prerequisites
1. **Node.js**: v18+ (verified on Node v24).
2. **MySQL**: MySQL 8.x running locally on port 3306.
3. **Ollama**: Running locally on `http://127.0.0.1:11434`.

### Step 1: Environment Configuration
Create or inspect `server/.env`:
```env
PORT=5000
JWT_SECRET=c34_match_desk_super_secure_jwt_token_key_2026!
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=1234
DB_NAME=c34_sponsorship_desk
OLLAMA_ENDPOINT=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
NODE_ENV=development
```

### Step 2: Initialize MySQL Database & Seed Data
Run the repeatable database setup runner:
```bash
npm run setup:db
```
This automatically:
- Creates `c34_sponsorship_desk` database if not present.
- Executes `database/schema.sql` (21 tables with foreign keys and unique constraints).
- Populates `database/seed.sql` with demonstration organizers, sponsors, events, inventory, packages, proposals, agreements, and deliverables.

### Step 3: Run Automated Test Suite
Verify that all 32 critical business rules and calculations pass:
```bash
npm test
```

### Step 4: Start the Backend Server
```bash
npm run server
```
The Express REST API will start on `http://localhost:5000`.

### Step 5: Start the Frontend Application
In a separate terminal:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 5. Pre-Seeded Demonstration Accounts

For demonstration, use any of these preloaded accounts:

| Role | Email | Password | Details |
|---|---|---|---|
| **Event Organizer** | `organizer@techsummit.io` | `password123` | Apex Tech Media (Hosts AI & Cloud Conclave) |
| **Event Organizer** | `organizer@campusfest.org` | `password123` | National Campus Innovation League |
| **Corporate Sponsor**| `sponsor@cloudscale.io` | `password123` | CloudScale Technologies (Cloud SaaS, ₹50k-₹500k) |
| **Corporate Sponsor**| `sponsor@sportfit.com` | `password123` | SportFit Nutrition (Health & Athletics) |
| **Corporate Sponsor**| `sponsor@finedge.com` | `password123` | FinEdge Capital (FinTech / Wealth) |
| **Administrator** | `admin@c34desk.com` | `admin123` | System Administrator Portal |

*Quick login buttons are available on the `/login` screen for fast switching between roles during demonstration.*

---

## 6. Critical Business Rules & Validations

1. **Financial Contribution & Margin Formula**:
   - `Contribution = Revenue − Fulfilment Cost`
   - `Margin = (Contribution / Revenue) × 100`
   - Example: ₹30,000 revenue − ₹18,000 cost = ₹12,000 contribution (40.0% margin).
2. **Exclusive Inventory Enforcement**:
   - Title sponsorship and exclusive stage branding slots cannot be sold or reserved to multiple sponsors. Enforced via database locks (`FOR UPDATE`) and transaction boundaries.
3. **Brand Safety & Prohibited Categories**:
   - Proposals from sponsors belonging to categories prohibited by the event (e.g. tobacco, gambling) are automatically blocked with explicit reasons.
4. **Mutual Contract Agreement**:
   - Agreements require approval from **both** the organizer and sponsor to reach `mutually_approved` status. Original terms are preserved; revisions create new versions.
5. **Cancellation & Inventory Release**:
   - When an agreement is cancelled, committed inventory is released back to the event pool within a MySQL transaction.
6. **Separation of Measured Reach**:
   - Initial estimated reach is strictly separated from measured reach. Measured reach records must include a telemetry source (e.g. turnstile scans, streaming analytics) and a timestamp.
7. **Idempotent In-App Notifications**:
   - Duplicate notifications for the same recipient, event, and purpose are prevented using unique `idempotency_key` constraints.
