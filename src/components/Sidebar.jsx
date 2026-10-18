import { NavLink } from 'react-router-dom';

export default function Sidebar({ items = [], title = 'Menu' }) {
  return (
    <aside className="sidebar-panel">
      <div className="sidebar-header">
        <div className="brand-mark">C34</div>
        <div>
          <p className="eyebrow">Sponsorship Desk</p>
          <h2>{title}</h2>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-item" end={item.end}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
