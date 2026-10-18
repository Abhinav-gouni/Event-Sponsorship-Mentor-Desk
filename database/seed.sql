-- ====================================================================
-- C34 EVENT SPONSORSHIP MATCH DESK - SEED DEMONSTRATION DATA
-- All demo passwords:
-- Admin: admin@c34desk.com / admin123
-- Organizers: organizer@techsummit.io / password123, organizer@campusfest.org / password123
-- Sponsors: sponsor@cloudscale.io / password123, sponsor@sportfit.com / password123, sponsor@finedge.com / password123
-- ====================================================================

USE `c34_sponsorship_desk`;

SET FOREIGN_KEY_CHECKS = 0;

-- Clean existing data
TRUNCATE TABLE `activity_logs`;
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `event_shortlists`;
TRUNCATE TABLE `sponsor_shortlists`;
TRUNCATE TABLE `fulfilment_evidence`;
TRUNCATE TABLE `fulfilment_deliverables`;
TRUNCATE TABLE `inventory_reservations`;
TRUNCATE TABLE `agreement_versions`;
TRUNCATE TABLE `agreements`;
TRUNCATE TABLE `negotiation_history`;
TRUNCATE TABLE `proposal_versions`;
TRUNCATE TABLE `proposals`;
TRUNCATE TABLE `package_benefits`;
TRUNCATE TABLE `packages`;
TRUNCATE TABLE `sponsorship_inventory`;
TRUNCATE TABLE `events`;
TRUNCATE TABLE `event_categories`;
TRUNCATE TABLE `sponsor_preferences`;
TRUNCATE TABLE `sponsor_profiles`;
TRUNCATE TABLE `organizer_profiles`;
TRUNCATE TABLE `users`;

-- --------------------------------------------------------------------
-- 1. USERS
-- --------------------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`, `phone`) VALUES
(1, 'System Administrator', 'admin@c34desk.com', '$2a$10$sbwzhb2oYxFInXcBl3prCObeezWp6Hu.WvduERHuSXMrrTaI6nZw2', 'admin', 'active', '+91 98765 00001'),
(2, 'Alex Turner', 'organizer@techsummit.io', '$2a$10$j1DhVr0QQVLYGuU.TtfXnu.WsM6Ud/wODqG6SOuxlpfBEW.jeJXiy', 'organizer', 'active', '+91 98765 11001'),
(3, 'Priya Sharma', 'organizer@campusfest.org', '$2a$10$j1DhVr0QQVLYGuU.TtfXnu.WsM6Ud/wODqG6SOuxlpfBEW.jeJXiy', 'organizer', 'active', '+91 98765 11002'),
(4, 'Marcus Vance', 'sponsor@cloudscale.io', '$2a$10$j1DhVr0QQVLYGuU.TtfXnu.WsM6Ud/wODqG6SOuxlpfBEW.jeJXiy', 'sponsor', 'active', '+91 98765 22001'),
(5, 'Elena Rostova', 'sponsor@sportfit.com', '$2a$10$j1DhVr0QQVLYGuU.TtfXnu.WsM6Ud/wODqG6SOuxlpfBEW.jeJXiy', 'sponsor', 'active', '+91 98765 22002'),
(6, 'Rohan Verma', 'sponsor@finedge.com', '$2a$10$j1DhVr0QQVLYGuU.TtfXnu.WsM6Ud/wODqG6SOuxlpfBEW.jeJXiy', 'sponsor', 'active', '+91 98765 22003'),
(7, 'Sarah Jenkins', 'sponsor@purevolt.com', '$2a$10$j1DhVr0QQVLYGuU.TtfXnu.WsM6Ud/wODqG6SOuxlpfBEW.jeJXiy', 'sponsor', 'active', '+91 98765 22004');

-- --------------------------------------------------------------------
-- 2. ORGANIZER PROFILES
-- --------------------------------------------------------------------
INSERT INTO `organizer_profiles` (`id`, `user_id`, `organization_name`, `description`, `website`, `contact_email`, `contact_phone`, `city`, `state`, `country`) VALUES
(1, 2, 'Apex Tech Media & Events', 'Premier technology conference producer in South Asia, hosting annual flagship tech summits and developer conferences.', 'https://apextechevents.io', 'contact@apextechevents.io', '+91 98765 11001', 'Bangalore', 'Karnataka', 'India'),
(2, 3, 'National Campus Innovation League', 'Pan-India student and collegiate entrepreneurship network hosting hackathons and college cultural conclaves.', 'https://campusfest.org', 'fest@campusfest.org', '+91 98765 11002', 'Hyderabad', 'Telangana', 'India');

-- --------------------------------------------------------------------
-- 3. SPONSOR PROFILES
-- --------------------------------------------------------------------
INSERT INTO `sponsor_profiles` (`id`, `user_id`, `company_name`, `industry`, `description`, `website`, `location`, `operating_regions`, `target_audience`, `marketing_objectives`, `contact_name`, `contact_email`, `contact_phone`, `brand_preferences`) VALUES
(1, 4, 'CloudScale Technologies', 'Cloud & SaaS Infrastructure', 'Enterprise cloud computing, DevOps automation, and Kubernetes orchestration platform provider.', 'https://cloudscale.io', 'Bangalore, Karnataka', 'India, Southeast Asia, US', 'Software engineers, CTOs, engineering leads, tech founders, DevOps professionals', 'Drive developer mindshare, generate B2B enterprise leads, hire senior tech talent', 'Marcus Vance', 'sponsor@cloudscale.io', '+91 98765 22001', 'Prefers keynote speaking slots, stage branding, VIP booth spaces, and developer workshops. No association with gambling or alcohol.'),
(2, 5, 'SportFit Nutrition', 'Health, Wellness & Sports', 'Performance supplements, clean energy hydration drinks, and sports endurance nutrition.', 'https://sportfitnutrition.com', 'Mumbai, Maharashtra', 'India Nationwide', 'Athletes, marathon runners, fitness enthusiasts, gym-goers aged 18-40', 'Increase retail brand recall, drive on-ground product sampling, boost online direct-to-consumer store visits', 'Elena Rostova', 'sponsor@sportfit.com', '+91 98765 22002', 'High-visibility finish line branding, hydration stations, participant kit inclusion. Prohibits fast-food and tobacco co-sponsors.'),
(3, 6, 'FinEdge Capital', 'Fintech & WealthTech', 'Next-gen algorithmic trading, automated micro-investments, and corporate treasury management platform.', 'https://finedgecapital.com', 'Mumbai, Maharashtra', 'Tier 1 Metro Cities in India', 'High-earning millennials, tech startup founders, corporate executives, finance professionals', 'Establish trust, acquire high net worth account holders, sponsor innovation challenges', 'Rohan Verma', 'sponsor@finedge.com', '+91 98765 22003', 'Premium stage branding, exclusive executive lounge naming rights. Brand restriction: no crypto memecoins or offshore casino affiliations.'),
(4, 7, 'PureVolt Mobility', 'CleanTech & Electric Vehicles', 'Next-generation smart electric two-wheelers and urban clean mobility ecosystem.', 'https://purevolt.in', 'Pune, Maharashtra', 'South and West India', 'Young urban professionals, college students, eco-conscious commuters', 'Brand awareness, test ride signups, sustainable mobility thought leadership', 'Sarah Jenkins', 'sponsor@purevolt.com', '+91 98765 22004', 'Green footprint zones, EV charging lounge partner, eco-initiatives.');

-- --------------------------------------------------------------------
-- 4. SPONSOR PREFERENCES
-- --------------------------------------------------------------------
INSERT INTO `sponsor_preferences` (`id`, `sponsor_id`, `preferred_categories`, `target_cities`, `target_states`, `min_budget`, `max_budget`, `audience_preferences`, `desired_benefits`, `preferred_min_reach`, `marketing_goals`, `excluded_categories`, `brand_safety_restrictions`) VALUES
(1, 1, '["Technology & AI", "Business & Entrepreneurship", "College & Cultural"]', '["Bangalore", "Hyderabad", "Pune", "Delhi NCR"]', '["Karnataka", "Telangana", "Maharashtra"]', 50000.00, 500000.00, 'Developers, DevOps engineers, Tech Executives aged 21-45', '["Title Sponsorship", "Stage Branding", "Booth", "Speaking Opportunity", "Digital Promotion"]', 5000, 'Developer recruitment and enterprise SaaS lead generation', '["Alcohol", "Gambling", "Tobacco", "Adult Entertainment"]', 'Strictly no co-sponsorship with betting or predatory lending apps'),
(2, 2, '["Sports & Fitness", "College & Cultural"]', '["Mumbai", "Bangalore", "Delhi NCR", "Pune"]', '["Maharashtra", "Karnataka", "Delhi"]', 20000.00, 200000.00, 'Athletes, fitness lovers, runners aged 18-35', '["Booth", "Stage Branding", "Logo Placement", "Social Media"]', 10000, 'Sampling and active sports community outreach', '["Tobacco", "Fast Food", "Alcohol"]', 'Must not be placed next to unhealthy food brands'),
(3, 3, '["Technology & AI", "Business & Entrepreneurship"]', '["Bangalore", "Mumbai", "Delhi NCR"]', '["Karnataka", "Maharashtra"]', 100000.00, 1000000.00, 'HNI tech founders, tech professionals, finance leaders', '["Title Sponsorship", "Gold", "Speaking Opportunity", "Digital Promotion"]', 8000, 'Establish wealth advisory dominance in startup ecosystem', '["Cryptocurrency", "Gambling", "Betting"]', 'Regulatory compliance requires strictly audited fintech associations'),
(4, 4, '["Technology & AI", "College & Cultural", "Sports & Fitness"]', '["Bangalore", "Pune", "Hyderabad"]', '["Karnataka", "Maharashtra", "Telangana"]', 30000.00, 300000.00, 'Eco-conscious commuters and engineering students', '["Booth", "Digital Promotion", "Social Media"]', 5000, 'Drive EV test ride bookings and sustainability awards', '["Fossil Fuel", "Tobacco"]', 'Clean energy messaging alignment');

-- --------------------------------------------------------------------
-- 5. EVENT CATEGORIES
-- --------------------------------------------------------------------
INSERT INTO `event_categories` (`id`, `name`, `description`) VALUES
(1, 'Technology & AI', 'Conferences, developer summits, AI hackathons, and software engineering expos'),
(2, 'Sports & Fitness', 'Marathons, athletic tournaments, cycling rallies, and fitness festivals'),
(3, 'Business & Entrepreneurship', 'Startup pitches, investor summits, trade fairs, and leadership conclaves'),
(4, 'College & Cultural', 'University festivals, national student hackathons, and youth cultural leagues'),
(5, 'Gaming & Esports', 'Esports tournaments, game development conferences, and LAN championships');

-- --------------------------------------------------------------------
-- 6. EVENTS
-- --------------------------------------------------------------------
INSERT INTO `events` (`id`, `organizer_id`, `category_id`, `category_name`, `name`, `description`, `location`, `venue`, `city`, `state`, `start_date`, `end_date`, `application_deadline`, `expected_audience`, `estimated_reach`, `target_demographics`, `objectives`, `budget`, `prohibited_sponsor_categories`, `status`) VALUES
(1, 1, 1, 'Technology & AI', 'Global AI & Cloud Conclave 2026', 'The flagship 2-day conference for cloud architects, AI researchers, enterprise tech leads, and venture-backed founders.', 'Whitefield E-City Convention Center', 'Grand Hall A & Expo Arena', 'Bangalore', 'Karnataka', '2026-11-20', '2026-11-21', '2026-11-10', 3500, 15000, 'Cloud Engineers, AI Practitioners, CTOs, Tech Startup Leaders (Ages 22-50)', 'Showcase enterprise AI advancements, build developer ecosystems, and connect B2B technology providers.', 1500000.00, '["Tobacco", "Gambling", "Alcohol"]', 'published'),
(2, 1, 1, 'Technology & AI', 'Bengaluru Tech Startup Expo 2026', 'Showcasing 200+ high-growth tech startups with investor demo pits and founder stages.', 'Manpho Convention Centre', 'Exhibition Pavilions 1 & 2', 'Bangalore', 'Karnataka', '2026-12-05', '2026-12-06', '2026-11-25', 2500, 8000, 'Founders, Angel Investors, Product Managers, Engineers', 'Facilitate investor matching and product launches.', 800000.00, '["Tobacco", "Gambling"]', 'published'),
(3, 2, 4, 'College & Cultural', 'National Collegiate Hackathon 2026', 'A 36-hour national collegiate hackathon with 1,200 student coders and tech company sponsors.', 'HITEC Exhibition Center', 'Innovation Dome', 'Hyderabad', 'Telangana', '2026-11-28', '2026-11-29', '2026-11-15', 1500, 12000, 'Computer Science students, young developers, mentors (Ages 18-24)', 'Foster grassroots coding talent and provide recruitment avenues for tech sponsors.', 450000.00, '["Alcohol", "Tobacco", "Gambling"]', 'published'),
(4, 2, 2, 'Sports & Fitness', 'IndiFit Mumbai 10K & Marathon 2026', 'Annual seaside endurance run bringing together 10,000+ runners, health enthusiasts, and corporate fitness teams.', 'Bandra Kurla Complex', 'MMRDA Grounds Promenade', 'Mumbai', 'Maharashtra', '2026-12-12', '2026-12-13', '2026-11-30', 10000, 35000, 'Runners, health enthusiasts, corporate fitness clubs (Ages 18-60)', 'Promote healthy lifestyles, wellness adoption, and athletic engagement.', 1200000.00, '["Tobacco", "Fast Food"]', 'published');

-- --------------------------------------------------------------------
-- 7. SPONSORSHIP INVENTORY
-- Note: is_exclusive flag enforces exclusive title or stage slots
-- --------------------------------------------------------------------
INSERT INTO `sponsorship_inventory` (`id`, `event_id`, `item_type`, `name`, `description`, `total_quantity`, `available_quantity`, `base_price`, `fulfilment_cost`, `is_exclusive`, `category_restrictions`, `reservation_status`) VALUES
(1, 1, 'Title', 'Exclusive Presenting Title Sponsor', 'Exclusive naming rights: "Global AI Conclave presented by [Sponsor]". Prominent logo on all badges, stage backdrops, press releases, and keynotes.', 1, 0, 250000.00, 100000.00, 1, '["Tobacco", "Gambling", "Alcohol"]', 'sold_out'),
(2, 1, 'Gold', 'Gold Tier Partner Slot', 'Prime 3x3 booth space, stage mentions, 5 VIP passes, logo in all printed brochures and website hero section.', 3, 2, 120000.00, 45000.00, 0, '["Tobacco", "Gambling"]', 'available'),
(3, 1, 'Stage Branding', 'Keynote Auditorium Stage Branding', 'Exclusive podium, backdrop side banners, and digital screen interstitial logo on the main keynote stage.', 1, 1, 80000.00, 25000.00, 1, '["Tobacco", "Gambling"]', 'available'),
(4, 1, 'Booth', 'Standard Expo Booth (3x2m)', 'Shell scheme booth with electricity, spotlight, and company fascia board in high-footfall exhibition hall.', 10, 8, 35000.00, 10000.00, 0, NULL, 'available'),
(5, 1, 'Social Media', 'Social Media & Newsletter Blitz', 'Dedicated announcement tweets, LinkedIn feature posts to 50k+ followers, and dedicated sponsor spotlight email blast.', 5, 4, 30000.00, 8000.00, 0, NULL, 'available'),
(6, 1, 'Speaking Opportunity', '20-Minute Technical Keynote Slot', 'Non-sales engineering presentation slot on track 1 during prime afternoon session.', 2, 1, 60000.00, 15000.00, 0, NULL, 'available'),
(7, 3, 'Title', 'Hackathon Title Sponsor', 'Main event title: "[Sponsor] National Collegiate Hackathon", opening address, API challenge track naming.', 1, 1, 150000.00, 50000.00, 1, '["Alcohol", "Gambling"]', 'available'),
(8, 3, 'Booth', 'Student Talent Lounge & Recruitment Booth', 'Dedicated lounge area for live interviews, demos, and student interaction during hackathon.', 4, 3, 30000.00, 10000.00, 0, NULL, 'available'),
(9, 4, 'Title', 'Marathon Title Naming Sponsor', 'Official marathon title, chest bib logo, finish-line arch branding, and media backdrop.', 1, 1, 300000.00, 120000.00, 1, '["Tobacco", "Fast Food"]', 'available'),
(10, 4, 'Booth', 'On-ground Hydration & Sampling Booth', 'Product tasting and hydration station at 5km and finish line zones.', 6, 5, 40000.00, 15000.00, 0, NULL, 'available');

-- --------------------------------------------------------------------
-- 8. PACKAGES
-- Formulas:
-- contribution = final_price - fulfilment_cost
-- contribution_margin = (contribution / final_price) * 100
-- --------------------------------------------------------------------
INSERT INTO `packages` (`id`, `event_id`, `name`, `description`, `base_price`, `discount`, `additional_cost`, `fulfilment_cost`, `final_price`, `contribution`, `contribution_margin`, `is_active`) VALUES
(1, 1, 'Title Presenting Partner Package', 'Exclusive title naming rights, 10 VIP passes, keynote opening address, prime expo pavilion booth, and full digital media coverage.', 250000.00, 20000.00, 0.00, 100000.00, 230000.00, 130000.00, 56.52, 1),
(2, 1, 'Gold Innovation Showcase Package', 'Comprehensive presence with 3x3m booth, 20-min technical speaking slot, and targeted social media blast.', 125000.00, 15000.00, 5000.00, 45000.00, 115000.00, 70000.00, 60.87, 1),
(3, 1, 'Standard Demo & Brand Package', 'Standard exhibit booth with digital marketing push. (Exact mandatory sample: ₹30,000 revenue - ₹18,000 cost = ₹12,000 contribution, 40.00% margin).', 30000.00, 0.00, 0.00, 18000.00, 30000.00, 12000.00, 40.00, 1);

-- --------------------------------------------------------------------
-- 9. PACKAGE BENEFITS
-- --------------------------------------------------------------------
INSERT INTO `package_benefits` (`id`, `package_id`, `inventory_id`, `quantity`, `allocated_price`, `allocated_cost`) VALUES
(1, 1, 1, 1, 250000.00, 100000.00),
(2, 2, 2, 1, 95000.00, 35000.00),
(3, 2, 5, 1, 30000.00, 10000.00),
(4, 3, 4, 1, 30000.00, 18000.00);

-- --------------------------------------------------------------------
-- 10. PROPOSALS
-- --------------------------------------------------------------------
INSERT INTO `proposals` (`id`, `event_id`, `sponsor_id`, `package_id`, `title`, `current_version`, `status`, `proposed_price`, `estimated_fulfilment_cost`, `estimated_contribution`, `contribution_margin`, `notes`, `rejection_reason`) VALUES
(1, 1, 1, 1, 'CloudScale Exclusive Title Sponsorship Proposal', 2, 'accepted', 230000.00, 100000.00, 130000.00, 56.52, 'Accepted proposal for exclusive presenting rights with agreed discount.', NULL),
(2, 1, 3, 2, 'FinEdge Gold Innovation Sponsorship Offer', 2, 'counteroffer_organizer', 110000.00, 45000.00, 65000.00, 59.09, 'Organizer offered ₹110,000 with additional executive lounge access.', NULL),
(3, 4, 2, NULL, 'SportFit Hydration Station & Sampling Partnership', 1, 'submitted', 40000.00, 15000.00, 25000.00, 62.50, 'Requesting on-ground hydration rights and participant kit inclusion.', NULL);

-- --------------------------------------------------------------------
-- 11. PROPOSAL VERSIONS
-- --------------------------------------------------------------------
INSERT INTO `proposal_versions` (`id`, `proposal_id`, `version_number`, `proposed_by_role`, `proposed_by_user_id`, `proposed_price`, `fulfilment_cost`, `contribution`, `contribution_margin`, `selected_benefits`, `notes`, `ai_strategy_suggestion`) VALUES
(1, 1, 1, 'sponsor', 4, 220000.00, 100000.00, 120000.00, 54.55, '[{"inventory_id": 1, "name": "Exclusive Presenting Title Sponsor", "quantity": 1, "price": 220000}]', 'Initial proposal submitted by CloudScale offering ₹220,000.', 'Consider meeting at ₹230,000 with additional digital promotion value.'),
(2, 1, 2, 'organizer', 2, 230000.00, 100000.00, 130000.00, 56.52, '[{"inventory_id": 1, "name": "Exclusive Presenting Title Sponsor", "quantity": 1, "price": 230000}]', 'Agreed at ₹230,000 with dedicated email newsletter blast added.', 'Terms aligned on high contribution margin. Recommended: Lock agreement promptly.'),
(3, 2, 1, 'sponsor', 6, 95000.00, 45000.00, 50000.00, 52.63, '[{"inventory_id": 2, "name": "Gold Tier Partner Slot", "quantity": 1, "price": 95000}]', 'Sponsor requested 20% discount on Gold tier.', 'Sponsor has large budget (up to 1M). Counter with ₹110,000 and bundle a speaking slot.'),
(4, 2, 2, 'organizer', 2, 110000.00, 45000.00, 65000.00, 59.09, '[{"inventory_id": 2, "name": "Gold Tier Partner Slot", "quantity": 1, "price": 110000}]', 'Organizer counteroffer with bonus executive attendee passes.', 'Counteroffer sent. Pending sponsor acceptance.');

-- --------------------------------------------------------------------
-- 12. NEGOTIATION HISTORY
-- --------------------------------------------------------------------
INSERT INTO `negotiation_history` (`id`, `proposal_id`, `action_by_user_id`, `action_type`, `message`, `previous_price`, `new_price`) VALUES
(1, 1, 4, 'proposal_submitted', 'CloudScale submitted Title sponsorship proposal for ₹220,000.', NULL, 220000.00),
(2, 1, 2, 'counteroffer_sent', 'Apex Tech proposed ₹230,000 including VIP newsletter blast.', 220000.00, 230000.00),
(3, 1, 4, 'proposal_accepted', 'CloudScale accepted counteroffer of ₹230,000. Proceeding to agreement.', 230000.00, 230000.00),
(4, 2, 6, 'proposal_submitted', 'FinEdge submitted initial offer of ₹95,000 for Gold package.', NULL, 95000.00),
(5, 2, 2, 'counteroffer_sent', 'Organizer countered at ₹110,000 including 3 bonus executive passes.', 95000.00, 110000.00);

-- --------------------------------------------------------------------
-- 13. AGREEMENTS
-- Note: Agreement 1 is mutually approved
-- --------------------------------------------------------------------
INSERT INTO `agreements` (`id`, `proposal_id`, `event_id`, `sponsor_id`, `agreement_number`, `current_version`, `agreed_price`, `fulfilment_cost`, `contribution`, `contribution_margin`, `status`, `organizer_approved`, `sponsor_approved`, `organizer_approved_at`, `sponsor_approved_at`, `exclusivity_conditions`, `cancellation_policy`) VALUES
(1, 1, 1, 1, 'AGR-2026-001', 1, 230000.00, 100000.00, 130000.00, 56.52, 'mutually_approved', 1, 1, '2026-10-15 14:30:00', '2026-10-15 16:45:00', 'Strict exclusivity: No other Cloud Infrastructure, DevOps, or Kubernetes SaaS provider may be accepted as Title or Gold partner for Global AI & Cloud Conclave 2026.', 'Cancellation permitted up to 30 days prior to event with 50% refund. Cancellations within 30 days forfeit deposit and release all inventory slots back to the organizer.');

-- --------------------------------------------------------------------
-- 14. AGREEMENT VERSIONS
-- --------------------------------------------------------------------
INSERT INTO `agreement_versions` (`id`, `agreement_id`, `version_number`, `proposed_by_user_id`, `agreed_price`, `terms`, `benefits_included`, `exclusivity_clause`, `cancellation_clause`, `organizer_approval`, `sponsor_approval`, `organizer_approved_at`, `sponsor_approved_at`, `change_summary`, `ai_comparison_summary`) VALUES
(1, 1, 1, 2, 230000.00, 'Standard Master Sponsorship Agreement terms. Organizer agrees to deliver all designated benefits in accordance with the specifications. Payment schedule: 50% advance, 50% post-event completion.', '[{"benefit": "Exclusive Presenting Title Sponsor", "deliverables": ["Main Stage Backdrop Logo", "Opening Keynote Mention", "Expo Hall Prime Booth", "Digital Social Blast"], "value": 230000}]', 'Exclusive cloud platform sponsorship category locked.', '30-day notice with 50% refund schedule.', 1, 1, '2026-10-15 14:30:00', '2026-10-15 16:45:00', 'Initial mutually signed binding agreement version 1.', 'Baseline contract agreement established. Both parties ratified all clauses.');

-- --------------------------------------------------------------------
-- 15. INVENTORY RESERVATIONS
-- --------------------------------------------------------------------
INSERT INTO `inventory_reservations` (`id`, `inventory_id`, `agreement_id`, `proposal_id`, `sponsor_id`, `quantity`, `status`, `is_exclusive`, `released_at`) VALUES
(1, 1, 1, 1, 1, 1, 'confirmed_contracted', 1, NULL),
(2, 2, NULL, 2, 3, 1, 'reserved_pending', 0, NULL);

-- --------------------------------------------------------------------
-- 16. FULFILMENT DELIVERABLES
-- --------------------------------------------------------------------
INSERT INTO `fulfilment_deliverables` (`id`, `agreement_id`, `inventory_id`, `title`, `description`, `benefit_type`, `status`, `due_date`, `estimated_reach`, `rejection_reason`, `review_notes`, `reviewed_at`) VALUES
(1, 1, 1, 'Main Stage Center Backdrop Logo Placement', 'Ultra-high-definition logo print placed prominently on main keynote stage backdrop visible to all attendees and livestreams.', 'Stage Branding', 'approved', '2026-11-19', 15000, NULL, 'Verified high resolution stage backdrop placement. Approved by Marcus Vance.', '2026-10-16 11:00:00'),
(2, 1, 1, 'Opening Keynote Sponsor Video & Executive Mention', 'Play 90-second promotional reel before keynote speaker session and verbal thank you by event host.', 'Speaking Opportunity', 'submitted_for_review', '2026-11-20', 12000, NULL, 'Video cut finalized and added to AV run of show. Submitted for sponsor signoff.', NULL),
(3, 1, 1, 'Dedicated Social Media & Newsletter Blast Campaign', 'Sponsor feature in 3 dedicated tweets, 2 LinkedIn articles, and 1 dedicated email newsletter blast to 25,000 subscribers.', 'Digital Promotion', 'in_progress', '2026-11-15', 25000, NULL, NULL, NULL);

-- --------------------------------------------------------------------
-- 17. FULFILMENT EVIDENCE
-- Distinct measured reach with source and timestamp
-- --------------------------------------------------------------------
INSERT INTO `fulfilment_evidence` (`id`, `deliverable_id`, `submitted_by_user_id`, `evidence_type`, `title`, `url`, `notes`, `measured_reach`, `reach_source`, `reach_measured_at`) VALUES
(1, 1, 2, 'image_url', 'Proof of Stage Fabrication & Print Spec', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200', 'Stage fabrication complete. High-definition print with CloudScale logo centered at eye level.', 14850, 'Venue Turnstile Badge Scan & AV Monitor Feed', '2026-10-16 10:45:00'),
(2, 2, 2, 'url', 'Keynote Video Stream AV Cue Sheet & Upload Link', 'https://youtube.com/watch?v=sample_cloudscale_keynote_reel', '90-second 4K video reel uploaded and tested on venue projection system.', 13200, 'YouTube Live Scheduled Stream Registrations', '2026-10-17 15:30:00');

-- --------------------------------------------------------------------
-- 18. SPONSOR SHORTLISTS
-- --------------------------------------------------------------------
INSERT INTO `sponsor_shortlists` (`id`, `organizer_id`, `sponsor_id`, `event_id`, `outreach_status`, `follow_up_date`, `notes`) VALUES
(1, 1, 1, 1, 'committed', '2026-10-15', 'Agreement signed for Title sponsor.'),
(2, 1, 3, 1, 'in_discussion', '2026-10-22', 'Awaiting sponsor response on ₹110k counteroffer.'),
(3, 1, 4, 1, 'contacted', '2026-10-25', 'Shared EV pavilion partner kit with Sarah Jenkins.');

-- --------------------------------------------------------------------
-- 19. EVENT SHORTLISTS
-- --------------------------------------------------------------------
INSERT INTO `event_shortlists` (`id`, `sponsor_id`, `event_id`, `notes`) VALUES
(1, 1, 1, 'Confirmed event. Active sponsorship in progress.'),
(2, 3, 1, 'Under negotiation for Gold tier.'),
(3, 2, 4, 'Submitted sampling proposal.');

-- --------------------------------------------------------------------
-- 20. NOTIFICATIONS
-- With unique idempotency keys
-- --------------------------------------------------------------------
INSERT INTO `notifications` (`id`, `recipient_user_id`, `event_id`, `purpose`, `idempotency_key`, `title`, `message`, `is_read`, `created_at`) VALUES
(1, 2, 1, 'proposal_accepted', 'notif_prop_1_accepted_user_2', 'Proposal Accepted!', 'CloudScale Technologies accepted the Title sponsorship proposal for Global AI & Cloud Conclave 2026.', 1, '2026-10-15 14:35:00'),
(2, 4, 1, 'agreement_created', 'notif_agr_1_created_user_4', 'Agreement Ready for Signature', 'Agreement AGR-2026-001 has been generated and approved by Apex Tech. Please review and countersign.', 1, '2026-10-15 14:40:00'),
(3, 4, 1, 'fulfilment_submitted', 'notif_ful_2_submitted_user_4', 'New Deliverable Evidence Submitted', 'Apex Tech submitted evidence for: Keynote Sponsor Video. Please review and approve.', 0, '2026-10-17 15:35:00'),
(4, 2, 1, 'counteroffer_pending', 'notif_prop_2_counter_user_2', 'Counteroffer Sent to FinEdge Capital', 'Your counteroffer of ₹110,000 was sent to FinEdge Capital for review.', 0, '2026-10-16 12:00:00');

-- --------------------------------------------------------------------
-- 21. ACTIVITY LOGS
-- --------------------------------------------------------------------
INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at`) VALUES
(1, 2, 'create_event', 'event', 1, '{"name": "Global AI & Cloud Conclave 2026", "city": "Bangalore"}', '2026-10-10 09:00:00'),
(2, 4, 'submit_proposal', 'proposal', 1, '{"sponsor": "CloudScale Technologies", "amount": 220000}', '2026-10-12 11:30:00'),
(3, 2, 'send_counteroffer', 'proposal', 1, '{"counter_amount": 230000}', '2026-10-14 10:15:00'),
(4, 4, 'accept_counteroffer', 'proposal', 1, '{"final_price": 230000}', '2026-10-15 14:00:00'),
(5, 2, 'create_agreement', 'agreement', 1, '{"agreement_number": "AGR-2026-001"}', '2026-10-15 14:25:00'),
(6, 4, 'approve_agreement', 'agreement', 1, '{"status": "mutually_approved"}', '2026-10-15 16:45:00'),
(7, 2, 'submit_evidence', 'fulfilment', 1, '{"deliverable": "Main Stage Backdrop", "measured_reach": 14850}', '2026-10-16 10:45:00');

SET FOREIGN_KEY_CHECKS = 1;
