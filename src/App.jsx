import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import Events from './pages/organizer/Events';
import CreateEvent from './pages/organizer/CreateEvent';
import SponsorFinder from './pages/organizer/SponsorFinder';
import Sponsors from './pages/organizer/Sponsors';
import Inventory from './pages/organizer/Inventory';
import PackageBuilder from './pages/organizer/PackageBuilder';
import Negotiations from './pages/organizer/Negotiations';
import Agreements from './pages/organizer/Agreements';
import Fulfilment from './pages/organizer/Fulfilment';
import Reports from './pages/organizer/Reports';
import OrganizerConversations from './pages/organizer/OrganizerConversations';
import CommitteeContactManager from './pages/organizer/CommitteeContactManager';

// Sponsor Pages
import SponsorDashboard from './pages/sponsor/SponsorDashboard';
import BusinessProfile from './pages/sponsor/BusinessProfile';
import SponsorshipPreferences from './pages/sponsor/SponsorshipPreferences';
import RecommendedEvents from './pages/sponsor/RecommendedEvents';
import BrowseEvents from './pages/sponsor/BrowseEvents';
import Proposals from './pages/sponsor/Proposals';
import NegotiationHistory from './pages/sponsor/NegotiationHistory';
import ActiveSponsorships from './pages/sponsor/ActiveSponsorships';
import FulfilmentReview from './pages/sponsor/FulfilmentReview';
import SponsorSettings from './pages/sponsor/SponsorSettings';
import SponsorConversations from './pages/sponsor/SponsorConversations';

// Shared Pages
import Notifications from './pages/shared/Notifications';
import AIChat from './pages/shared/AIChat';
import NotFound from './pages/shared/NotFound';

function ProtectedRoute({ children, allowedRoles = ['organizer', 'sponsor', 'admin'] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }}></div>
          <p style={{ color: 'var(--muted)', fontWeight: 500 }}>Connecting to C34 Sponsorship Desk...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    const fallback = user.role === 'admin' ? '/admin/dashboard' : user.role === 'sponsor' ? '/sponsor/dashboard' : '/organizer/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const homePath = user?.role === 'admin' 
    ? '/admin/dashboard' 
    : user?.role === 'sponsor' 
      ? '/sponsor/dashboard' 
      : '/organizer/dashboard';

  return (
    <Routes>
      {/* Public Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Shared Authenticated */}
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />

      {/* Admin Portal */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

      {/* Organizer Portal */}
      <Route path="/organizer/dashboard" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><OrganizerDashboard /></ProtectedRoute>} />
      <Route path="/organizer/events" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><Events /></ProtectedRoute>} />
      <Route path="/organizer/events/create" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><CreateEvent /></ProtectedRoute>} />
      <Route path="/organizer/sponsor-finder" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><SponsorFinder /></ProtectedRoute>} />
      <Route path="/organizer/sponsors" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><Sponsors /></ProtectedRoute>} />
      <Route path="/organizer/inventory" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><Inventory /></ProtectedRoute>} />
      <Route path="/organizer/package-builder" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><PackageBuilder /></ProtectedRoute>} />
      <Route path="/organizer/negotiations" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><Negotiations /></ProtectedRoute>} />
      <Route path="/organizer/conversations" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><OrganizerConversations /></ProtectedRoute>} />
      <Route path="/organizer/committees" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><CommitteeContactManager /></ProtectedRoute>} />
      <Route path="/organizer/agreements" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><Agreements /></ProtectedRoute>} />
      <Route path="/organizer/fulfilment" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><Fulfilment /></ProtectedRoute>} />
      <Route path="/organizer/reports" element={<ProtectedRoute allowedRoles={['organizer', 'admin']}><Reports /></ProtectedRoute>} />

      {/* Sponsor Portal */}
      <Route path="/sponsor/dashboard" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><SponsorDashboard /></ProtectedRoute>} />
      <Route path="/sponsor/profile" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><BusinessProfile /></ProtectedRoute>} />
      <Route path="/sponsor/preferences" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><SponsorshipPreferences /></ProtectedRoute>} />
      <Route path="/sponsor/recommended-events" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><RecommendedEvents /></ProtectedRoute>} />
      <Route path="/sponsor/browse-events" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><BrowseEvents /></ProtectedRoute>} />
      <Route path="/sponsor/proposals" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><Proposals /></ProtectedRoute>} />
      <Route path="/sponsor/negotiations" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><NegotiationHistory /></ProtectedRoute>} />
      <Route path="/sponsor/conversations" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><SponsorConversations /></ProtectedRoute>} />
      <Route path="/sponsor/active-sponsorships" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><ActiveSponsorships /></ProtectedRoute>} />
      <Route path="/sponsor/fulfilment-review" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><FulfilmentReview /></ProtectedRoute>} />
      <Route path="/sponsor/settings" element={<ProtectedRoute allowedRoles={['sponsor', 'admin']}><SponsorSettings /></ProtectedRoute>} />

      {/* Defaults */}
      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
