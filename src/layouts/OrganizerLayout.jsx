import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const organizerMenu = [
  { to: '/organizer/dashboard', label: 'Dashboard', end: true },
  { to: '/organizer/events', label: 'Events' },
  { to: '/organizer/sponsor-finder', label: 'Sponsor Finder' },
  { to: '/organizer/sponsors', label: 'Sponsors' },
  { to: '/organizer/inventory', label: 'Inventory' },
  { to: '/organizer/package-builder', label: 'Package Builder' },
  { to: '/organizer/negotiations', label: 'Negotiations' },
  { to: '/organizer/conversations', label: 'AI Messages & Approvals' },
  { to: '/organizer/committees', label: 'Committee Contacts' },
  { to: '/organizer/agreements', label: 'Agreements' },
  { to: '/organizer/fulfilment', label: 'Fulfilment' },
  { to: '/organizer/reports', label: 'Reports' },
];

export default function OrganizerLayout({ children, title = 'Organizer Dashboard', subtitle }) {
  return (
    <div className="app-shell">
      <Sidebar items={organizerMenu} title="Organizer" />
      <main className="main-panel">
        <Topbar title={title} subtitle={subtitle} actions={<button className="primary-button" type="button">New Event</button>} />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
