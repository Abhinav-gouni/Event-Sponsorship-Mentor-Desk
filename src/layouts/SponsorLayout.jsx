import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const sponsorMenu = [
  { to: '/sponsor/dashboard', label: 'Dashboard', end: true },
  { to: '/sponsor/profile', label: 'Business Profile' },
  { to: '/sponsor/preferences', label: 'Preferences' },
  { to: '/sponsor/recommended-events', label: 'Recommended Events' },
  { to: '/sponsor/browse-events', label: 'Browse Events' },
  { to: '/sponsor/proposals', label: 'Proposals' },
  { to: '/sponsor/negotiations', label: 'Negotiations' },
  { to: '/sponsor/conversations', label: 'Messages & Committees' },
  { to: '/sponsor/active-sponsorships', label: 'Active Sponsorships' },
  { to: '/sponsor/fulfilment-review', label: 'Fulfilment Review' },
  { to: '/sponsor/settings', label: 'Settings' },
];

export default function SponsorLayout({ children, title = 'Sponsor Dashboard', subtitle }) {
  return (
    <div className="app-shell">
      <Sidebar items={sponsorMenu} title="Sponsor" />
      <main className="main-panel">
        <Topbar title={title} subtitle={subtitle} actions={<button className="primary-button" type="button">Submit Proposal</button>} />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
