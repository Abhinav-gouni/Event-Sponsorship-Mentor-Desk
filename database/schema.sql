-- ====================================================================
-- C34 EVENT SPONSORSHIP MATCH DESK - RELATIONAL SCHEMA
-- Database: MySQL 8.x
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `c34_sponsorship_desk` 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `c34_sponsorship_desk`;

-- Disable foreign key checks during schema creation/migration
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------------------
-- 1. USERS & ROLES
-- --------------------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `event_shortlists`;
DROP TABLE IF EXISTS `sponsor_shortlists`;
DROP TABLE IF EXISTS `fulfilment_evidence`;
DROP TABLE IF EXISTS `fulfilment_deliverables`;
DROP TABLE IF EXISTS `inventory_reservations`;
DROP TABLE IF EXISTS `agreement_versions`;
DROP TABLE IF EXISTS `agreements`;
DROP TABLE IF EXISTS `negotiation_history`;
DROP TABLE IF EXISTS `proposal_versions`;
DROP TABLE IF EXISTS `proposals`;
DROP TABLE IF EXISTS `package_benefits`;
DROP TABLE IF EXISTS `packages`;
DROP TABLE IF EXISTS `sponsorship_inventory`;
DROP TABLE IF EXISTS `events`;
DROP TABLE IF EXISTS `event_categories`;
DROP TABLE IF EXISTS `sponsor_preferences`;
DROP TABLE IF EXISTS `sponsor_profiles`;
DROP TABLE IF EXISTS `organizer_profiles`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('organizer', 'sponsor', 'admin') NOT NULL,
  `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  `phone` VARCHAR(50) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 2. ORGANIZER PROFILES
-- --------------------------------------------------------------------
CREATE TABLE `organizer_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `organization_name` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `contact_email` VARCHAR(150) DEFAULT NULL,
  `contact_phone` VARCHAR(50) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `country` VARCHAR(100) NOT NULL DEFAULT 'India',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_organizer_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 3. SPONSOR PROFILES
-- --------------------------------------------------------------------
CREATE TABLE `sponsor_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `company_name` VARCHAR(200) NOT NULL,
  `industry` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `website` VARCHAR(255) DEFAULT NULL,
  `location` VARCHAR(150) DEFAULT NULL,
  `operating_regions` VARCHAR(255) DEFAULT NULL,
  `target_audience` TEXT DEFAULT NULL,
  `marketing_objectives` TEXT DEFAULT NULL,
  `contact_name` VARCHAR(150) DEFAULT NULL,
  `contact_email` VARCHAR(150) DEFAULT NULL,
  `contact_phone` VARCHAR(50) DEFAULT NULL,
  `brand_preferences` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sponsor_industry` (`industry`),
  CONSTRAINT `fk_sponsor_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 4. SPONSOR PREFERENCES
-- --------------------------------------------------------------------
CREATE TABLE `sponsor_preferences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sponsor_id` INT NOT NULL UNIQUE,
  `preferred_categories` JSON DEFAULT NULL,
  `target_cities` JSON DEFAULT NULL,
  `target_states` JSON DEFAULT NULL,
  `min_budget` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `max_budget` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `audience_preferences` TEXT DEFAULT NULL,
  `desired_benefits` JSON DEFAULT NULL,
  `preferred_min_reach` INT NOT NULL DEFAULT 0,
  `marketing_goals` TEXT DEFAULT NULL,
  `excluded_categories` JSON DEFAULT NULL,
  `brand_safety_restrictions` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pref_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsor_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 5. EVENT CATEGORIES
-- --------------------------------------------------------------------
CREATE TABLE `event_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 6. EVENTS
-- --------------------------------------------------------------------
CREATE TABLE `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organizer_id` INT NOT NULL,
  `category_id` INT DEFAULT NULL,
  `category_name` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `venue` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `application_deadline` DATE NOT NULL,
  `expected_audience` INT NOT NULL DEFAULT 0,
  `estimated_reach` INT NOT NULL DEFAULT 0,
  `target_demographics` TEXT DEFAULT NULL,
  `objectives` TEXT DEFAULT NULL,
  `budget` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `prohibited_sponsor_categories` JSON DEFAULT NULL,
  `status` ENUM('draft', 'published', 'archived', 'completed') NOT NULL DEFAULT 'draft',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_events_organizer` (`organizer_id`),
  INDEX `idx_events_status` (`status`),
  INDEX `idx_events_dates` (`start_date`, `end_date`),
  INDEX `idx_events_city` (`city`),
  CONSTRAINT `fk_event_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizer_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_category` FOREIGN KEY (`category_id`) REFERENCES `event_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 7. SPONSORSHIP INVENTORY
-- --------------------------------------------------------------------
CREATE TABLE `sponsorship_inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `item_type` ENUM('Title', 'Gold', 'Silver', 'Bronze', 'Booth', 'Stage Branding', 'Logo Placement', 'Social Media', 'Speaking Opportunity', 'Digital Promotion', 'Custom') NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `total_quantity` INT NOT NULL DEFAULT 1,
  `available_quantity` INT NOT NULL DEFAULT 1,
  `base_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `fulfilment_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `is_exclusive` BOOLEAN NOT NULL DEFAULT FALSE,
  `category_restrictions` JSON DEFAULT NULL,
  `reservation_status` ENUM('available', 'reserved', 'sold_out') NOT NULL DEFAULT 'available',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_inv_event` (`event_id`),
  INDEX `idx_inv_exclusive` (`is_exclusive`),
  CONSTRAINT `fk_inv_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 8. PACKAGES
-- --------------------------------------------------------------------
CREATE TABLE `packages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `base_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `additional_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `fulfilment_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `final_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `contribution` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `contribution_margin` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_pkg_event` (`event_id`),
  CONSTRAINT `fk_pkg_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 9. PACKAGE BENEFITS
-- --------------------------------------------------------------------
CREATE TABLE `package_benefits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT NOT NULL,
  `inventory_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `allocated_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `allocated_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  INDEX `idx_pb_pkg` (`package_id`),
  INDEX `idx_pb_inv` (`inventory_id`),
  CONSTRAINT `fk_pb_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pb_inv` FOREIGN KEY (`inventory_id`) REFERENCES `sponsorship_inventory` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 10. PROPOSALS
-- --------------------------------------------------------------------
CREATE TABLE `proposals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `sponsor_id` INT NOT NULL,
  `package_id` INT DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `current_version` INT NOT NULL DEFAULT 1,
  `status` ENUM('submitted', 'under_review', 'counteroffer_organizer', 'counteroffer_sponsor', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'submitted',
  `proposed_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `estimated_fulfilment_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `estimated_contribution` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `contribution_margin` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_prop_event` (`event_id`),
  INDEX `idx_prop_sponsor` (`sponsor_id`),
  INDEX `idx_prop_status` (`status`),
  CONSTRAINT `fk_prop_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prop_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsor_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prop_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 11. PROPOSAL VERSIONS
-- --------------------------------------------------------------------
CREATE TABLE `proposal_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `proposal_id` INT NOT NULL,
  `version_number` INT NOT NULL,
  `proposed_by_role` ENUM('organizer', 'sponsor') NOT NULL,
  `proposed_by_user_id` INT NOT NULL,
  `proposed_price` DECIMAL(12, 2) NOT NULL,
  `fulfilment_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `contribution` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `contribution_margin` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `selected_benefits` JSON NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `ai_strategy_suggestion` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pv_prop` (`proposal_id`),
  CONSTRAINT `fk_pv_prop` FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pv_user` FOREIGN KEY (`proposed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 12. NEGOTIATION HISTORY
-- --------------------------------------------------------------------
CREATE TABLE `negotiation_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `proposal_id` INT NOT NULL,
  `action_by_user_id` INT NOT NULL,
  `action_type` ENUM('proposal_submitted', 'counteroffer_sent', 'benefits_modified', 'price_adjusted', 'proposal_accepted', 'proposal_rejected', 'note_added') NOT NULL,
  `message` TEXT DEFAULT NULL,
  `previous_price` DECIMAL(12, 2) DEFAULT NULL,
  `new_price` DECIMAL(12, 2) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_nh_prop` (`proposal_id`),
  CONSTRAINT `fk_nh_prop` FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nh_user` FOREIGN KEY (`action_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 13. AGREEMENTS
-- --------------------------------------------------------------------
CREATE TABLE `agreements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `proposal_id` INT NOT NULL UNIQUE,
  `event_id` INT NOT NULL,
  `sponsor_id` INT NOT NULL,
  `agreement_number` VARCHAR(100) NOT NULL UNIQUE,
  `current_version` INT NOT NULL DEFAULT 1,
  `agreed_price` DECIMAL(12, 2) NOT NULL,
  `fulfilment_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `contribution` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `contribution_margin` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('draft', 'pending_organizer_approval', 'pending_sponsor_approval', 'mutually_approved', 'revision_requested', 'cancelled', 'completed') NOT NULL DEFAULT 'pending_organizer_approval',
  `organizer_approved` BOOLEAN NOT NULL DEFAULT FALSE,
  `sponsor_approved` BOOLEAN NOT NULL DEFAULT FALSE,
  `organizer_approved_at` DATETIME DEFAULT NULL,
  `sponsor_approved_at` DATETIME DEFAULT NULL,
  `exclusivity_conditions` TEXT DEFAULT NULL,
  `cancellation_policy` TEXT DEFAULT NULL,
  `cancellation_reason` TEXT DEFAULT NULL,
  `cancelled_by_user_id` INT DEFAULT NULL,
  `cancelled_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_agr_event` (`event_id`),
  INDEX `idx_agr_sponsor` (`sponsor_id`),
  INDEX `idx_agr_status` (`status`),
  CONSTRAINT `fk_agr_prop` FOREIGN KEY (`proposal_id`) REFERENCES `proposals` (`id`),
  CONSTRAINT `fk_agr_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`),
  CONSTRAINT `fk_agr_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsor_profiles` (`id`),
  CONSTRAINT `fk_agr_canceller` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 14. AGREEMENT VERSIONS
-- --------------------------------------------------------------------
CREATE TABLE `agreement_versions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agreement_id` INT NOT NULL,
  `version_number` INT NOT NULL,
  `proposed_by_user_id` INT NOT NULL,
  `agreed_price` DECIMAL(12, 2) NOT NULL,
  `terms` TEXT NOT NULL,
  `benefits_included` JSON NOT NULL,
  `exclusivity_clause` TEXT DEFAULT NULL,
  `cancellation_clause` TEXT DEFAULT NULL,
  `organizer_approval` BOOLEAN NOT NULL DEFAULT FALSE,
  `sponsor_approval` BOOLEAN NOT NULL DEFAULT FALSE,
  `organizer_approved_at` DATETIME DEFAULT NULL,
  `sponsor_approved_at` DATETIME DEFAULT NULL,
  `change_summary` TEXT DEFAULT NULL,
  `ai_comparison_summary` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_av_agr` (`agreement_id`),
  CONSTRAINT `fk_av_agr` FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_av_user` FOREIGN KEY (`proposed_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 15. INVENTORY RESERVATIONS
-- --------------------------------------------------------------------
CREATE TABLE `inventory_reservations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `inventory_id` INT NOT NULL,
  `agreement_id` INT DEFAULT NULL,
  `proposal_id` INT DEFAULT NULL,
  `sponsor_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `status` ENUM('reserved_pending', 'confirmed_contracted', 'released') NOT NULL DEFAULT 'reserved_pending',
  `is_exclusive` BOOLEAN NOT NULL DEFAULT FALSE,
  `released_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_res_inv` (`inventory_id`),
  INDEX `idx_res_agr` (`agreement_id`),
  INDEX `idx_res_sponsor` (`sponsor_id`),
  CONSTRAINT `fk_res_inv` FOREIGN KEY (`inventory_id`) REFERENCES `sponsorship_inventory` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_agr` FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsor_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 16. FULFILMENT DELIVERABLES
-- --------------------------------------------------------------------
CREATE TABLE `fulfilment_deliverables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agreement_id` INT NOT NULL,
  `inventory_id` INT DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `benefit_type` VARCHAR(100) NOT NULL,
  `status` ENUM('pending', 'in_progress', 'submitted_for_review', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `due_date` DATE DEFAULT NULL,
  `estimated_reach` INT NOT NULL DEFAULT 0,
  `rejection_reason` TEXT DEFAULT NULL,
  `review_notes` TEXT DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_fd_agr` (`agreement_id`),
  INDEX `idx_fd_status` (`status`),
  CONSTRAINT `fk_fd_agr` FOREIGN KEY (`agreement_id`) REFERENCES `agreements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fd_inv` FOREIGN KEY (`inventory_id`) REFERENCES `sponsorship_inventory` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 17. FULFILMENT EVIDENCE
-- --------------------------------------------------------------------
CREATE TABLE `fulfilment_evidence` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `deliverable_id` INT NOT NULL,
  `submitted_by_user_id` INT NOT NULL,
  `evidence_type` ENUM('url', 'image_url', 'document_url', 'social_link', 'metric_report') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `url` VARCHAR(1000) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `measured_reach` INT DEFAULT NULL,
  `reach_source` VARCHAR(255) DEFAULT NULL,
  `reach_measured_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_fe_deliv` (`deliverable_id`),
  CONSTRAINT `fk_fe_deliv` FOREIGN KEY (`deliverable_id`) REFERENCES `fulfilment_deliverables` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fe_user` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 18. SPONSOR SHORTLISTS (Organizers bookmarking sponsors)
-- --------------------------------------------------------------------
CREATE TABLE `sponsor_shortlists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `organizer_id` INT NOT NULL,
  `sponsor_id` INT NOT NULL,
  `event_id` INT DEFAULT NULL,
  `outreach_status` ENUM('not_contacted', 'contacted', 'in_discussion', 'committed', 'declined') NOT NULL DEFAULT 'not_contacted',
  `follow_up_date` DATE DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_organizer_sponsor_event` (`organizer_id`, `sponsor_id`, `event_id`),
  CONSTRAINT `fk_ss_organizer` FOREIGN KEY (`organizer_id`) REFERENCES `organizer_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ss_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsor_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ss_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 19. EVENT SHORTLISTS (Sponsors bookmarking events)
-- --------------------------------------------------------------------
CREATE TABLE `event_shortlists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sponsor_id` INT NOT NULL,
  `event_id` INT NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_sponsor_event` (`sponsor_id`, `event_id`),
  CONSTRAINT `fk_es_sponsor` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsor_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_es_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 20. NOTIFICATIONS (With unique idempotency_key for deduplication)
-- --------------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipient_user_id` INT NOT NULL,
  `event_id` INT DEFAULT NULL,
  `purpose` VARCHAR(100) NOT NULL,
  `idempotency_key` VARCHAR(255) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_user` (`recipient_user_id`),
  INDEX `idx_notif_read` (`is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notif_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------------------
-- 21. ACTIVITY LOGS
-- --------------------------------------------------------------------
CREATE TABLE `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_act_user` (`user_id`),
  INDEX `idx_act_action` (`action`),
  CONSTRAINT `fk_act_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
