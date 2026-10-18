import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const adminMenu = [
  { to: '/admin/dashboard', label: 'Admin Overview', end: true },
  { to: '/organizer/events', label: 'All Events' },
  { to: '/organizer/sponsors', label: 'All Sponsors' },
  { to: '/organizer/agreements', label: 'All Agreements' },
  { to: '/organizer/reports', label: 'Platform Reports' },
  { to: '/ai-chat', label: 'AI Advisor' },
];

export default function AdminLayout({ children, title = 'Administrator Portal', subtitle }) {
  return (
    <div className="app-shell">
      <Sidebar items={adminMenu} title="Administrator" />
      <main className="main-panel">
        <Topbar title={title} subtitle={subtitle} />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
