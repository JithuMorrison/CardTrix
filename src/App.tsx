import { Routes, Route, useLocation } from 'react-router-dom';
import { SocketProvider, useSocketContext } from './context/SocketContext';
import HomePage from './pages/HomePage';
import DeckBuilder from './pages/DeckBuilder';
import BattleArena from './pages/BattleArena';
import Collection from './pages/Collection';
import Store from './pages/Store';
import { NavLink } from 'react-router-dom';
import './index.css';

function NavBar() {
  return (
    <nav className="nav">
      <div className="nav-items">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">🏠</span>
          Home
        </NavLink>
        <NavLink to="/deck" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">⚔️</span>
          Strategy
        </NavLink>
        <NavLink to="/collection" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">📚</span>
          Collection
        </NavLink>
        <NavLink to="/store" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-item-icon">✨</span>
          Vault
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
