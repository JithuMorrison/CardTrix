import { Routes, Route, useLocation } from 'react-router-dom';
import { SocketProvider, useSocketContext } from './context/SocketContext';
import HomePage from './pages/HomePage';
import DeckBuilder from './pages/DeckBuilder';
import BattleArena from './pages/BattleArena';
import Collection from './pages/Collection';
import Store from './pages/Store';
import AdminPanel from './pages/AdminPanel';
import { NavLink } from 'react-router-dom';
import './index.css';

function NavBar() {
  return (
    <nav className="nav">
      <div className="nav-items">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          </span>
          Home
        </NavLink>
        <NavLink to="/deck" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14.94 2.94L12 0 9.06 2.94 12 5.87l2.94-2.93zM5.87 8.94L2.94 6 0 8.94l2.94 2.93L5.87 8.94zM18.13 8.94L21.06 6 24 8.94l-2.94 2.93-2.93-2.93zM12 10c-3.87 0-7 3.13-7 7h2c0-2.76 2.24-5 5-5s5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0 4c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
          </span>
          Strategy
        </NavLink>
        <NavLink to="/collection" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
          </span>
          Collection
        </NavLink>
        <NavLink to="/store" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </span>
          Vault
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </span>
          Admin
        </NavLink>
      </div>
    </nav>
  );
}

function AppContent() {
  const location = useLocation();
  const { inBattle } = useSocketContext();
  const isBattlePage = location.pathname === '/battle';

  return (
    <div className="app-wrapper">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/deck" element={<DeckBuilder />} />
          <Route path="/battle" element={<BattleArena />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/store" element={<Store />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
      {!inBattle && !isBattlePage && <NavBar />}
    </div>
  );
}

function App() {
  return (
    <SocketProvider>
      <AppContent />
    </SocketProvider>
  );
}

export default App;
