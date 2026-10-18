-- -------------------------------------------------------------
-- Migration 002: AI Conversations, Organizer Approvals & Committee Contacts
-- Database: c34_sponsorship_desk
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS event_committee_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  committee_type ENUM(
    'Water', 
    'Security', 
    'Transport', 
    'Food', 
    'Medical', 
    'Logistics', 
    'Event Operations', 
    'Other'
  ) NOT NULL,
  contact_person VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  working_hours VARCHAR(100) DEFAULT '9:00 AM - 6:00 PM',
  notes TEXT,
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  verified_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_committee_event (event_id, committee_type, is_verified, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NULL,
  sponsor_id INT NOT NULL,
  organizer_id INT NOT NULL,
  proposal_id INT NULL,
  subject VARCHAR(255) NOT NULL DEFAULT 'Sponsorship Inquiry',
  status ENUM('active', 'archived', 'closed') DEFAULT 'active',
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL,
  INDEX idx_thread_lookup (sponsor_id, organizer_id, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_user_id INT NOT NULL,
  sender_role ENUM('sponsor', 'organizer', 'ai_assistant') NOT NULL,
  message_text TEXT NOT NULL,
  message_type ENUM(
    'sponsor_message', 
    'organizer_message', 
    'ai_auto_reply', 
    'ai_draft_proposed'
  ) NOT NULL DEFAULT 'sponsor_message',
  classification ENUM(
    'routine', 
    'contact_inquiry', 
    'high_risk_pricing', 
    'high_risk_agreement', 
    'high_risk_commitment', 
    'uncertain', 
    'feedback'
  ) DEFAULT 'routine',
  is_ai_generated TINYINT(1) DEFAULT 0,
  approval_status ENUM(
    'none', 
    'pending_approval', 
    'approved', 
    'rejected', 
    'edited_and_approved'
  ) DEFAULT 'none',
  approved_by_user_id INT NULL,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversation_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_thread_messages (conversation_id, approval_status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_sponsor_requirements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sponsor_id INT NOT NULL,
  event_id INT NULL,
  category ENUM(
    'booth_space', 
    'branding', 
    'speaking', 
    'vip_passes', 
    'catering_dietary', 
    'technical_av', 
    'committee_support', 
    'other'
  ) NOT NULL,
  requirement_text TEXT NOT NULL,
  sentiment ENUM('positive', 'neutral', 'concerned', 'urgent') DEFAULT 'neutral',
  status ENUM('open', 'acknowledged', 'accommodated', 'declined') DEFAULT 'open',
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversation_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_approval_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  conversation_id INT NOT NULL,
  organizer_user_id INT NOT NULL,
  decision ENUM('approved', 'edited_and_approved', 'rejected') NOT NULL,
  original_draft TEXT NOT NULL,
  final_sent_text TEXT NULL,
  decision_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES conversation_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversation_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Seed Initial Committee Contacts for Demo Event 1 (Global AI & Cloud Conclave 2026)
-- -------------------------------------------------------------
INSERT INTO event_committee_contacts 
  (event_id, committee_type, contact_person, email, phone, working_hours, notes, is_verified, is_active, verified_by_user_id)
VALUES
  (1, 'Security', 'Vikram Rathore', 'security@techsummit.io', '+91 98110 23456', '8:00 AM - 10:00 PM', 'Chief of Venue & Perimeter Security. Handles VIP escorts and sponsor badge credentials.', 1, 1, 2),
  (1, 'Water', 'Ramesh Patel', 'water.supply@techsummit.io', '+91 98220 34567', '7:00 AM - 8:00 PM', 'In charge of venue hydration points, VIP lounge bottled water, and eco-refill stations.', 1, 1, 2),
  (1, 'Transport', 'Anita Desai', 'transport@techsummit.io', '+91 98330 45678', '6:00 AM - 11:00 PM', 'Shuttle bus coordination between Bangalore Airport, designated hotels, and venue.', 1, 1, 2),
  (1, 'Food', 'Chef Sanjeev Nair', 'hospitality@techsummit.io', '+91 98440 56789', '8:00 AM - 9:00 PM', 'Head of Executive Catering, sponsor lounge dining, and allergen management.', 1, 1, 2),
  (1, 'Logistics', 'Karan Mehra', 'logistics@techsummit.io', '+91 98550 67890', '7:00 AM - 9:00 PM', 'Dock manager for sponsor booth delivery, heavy AV offloading, and crate storage.', 1, 1, 2),
  (1, 'Event Operations', 'Pooja Sharma', 'ops@techsummit.io', '+91 98660 78901', '8:00 AM - 8:00 PM', 'Director of Floor Operations, main auditorium schedule, and sponsor booth walkthroughs.', 1, 1, 2),
  (1, 'Medical', 'Dr. Alok Verma', 'medical.tent@techsummit.io', '+91 98770 89012', 'Round the Clock (24x7)', 'Paramedic station pending local municipal certification renewal.', 0, 1, NULL)
ON DUPLICATE KEY UPDATE 
  contact_person = VALUES(contact_person),
  email = VALUES(email),
  phone = VALUES(phone),
  working_hours = VALUES(working_hours),
  notes = VALUES(notes),
  is_verified = VALUES(is_verified);
