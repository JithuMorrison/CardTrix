import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../context/SocketContext';
import type { DeckConfig, PlayerProfile } from '../../shared/types';

const ROAD_REWARDS = [
  { xpGoal: 500,  type: 'essence',  id: 'essence',     name: '250 ✨', count: 250, icon: '✨' },
  { xpGoal: 1200, type: 'creature', id: 'chimera',     name: 'Chimera', icon: '🦁' },
  { xpGoal: 2000, type: 'skill',    id: 'earth_shield', name: 'Earth Shield', icon: '🛡️' },
  { xpGoal: 3500, type: 'essence',  id: 'essence',     name: '1000 ✨', count: 1000, icon: '✨' },
  { xpGoal: 5000, type: 'creature', id: 'spectral_tiger', name: 'Spectral Tiger', icon: '🐯' },
];

function Particles() {
  const particles = useMemo(() => Array.from({ length: 35 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 20,
    duration: 10 + Math.random() * 15,
    size: 2 + Math.random() * 5,
    color: ['particle-green', 'particle-gold', 'particle-red'][Math.floor(Math.random() * 3)],
  })), []);

  return (
    <div className="hero-particles">
      {particles.map(p => (
        <div key={p.id} className={`particle ${p.color}`}
          style={{ left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}
    </div>
  );
}

/** Build a default 6-creature deck with default weights */
function buildDefaultDeck(gameData: any): DeckConfig | null {
  if (!gameData || !gameData.creatures || gameData.creatures.length < 6) return null;
  return {
    creatures: gameData.creatures.slice(0, 6).map((c: any) => ({
      defId: c.id,
      skillWeights: [50, 30, 20] as [number, number, number],
      talentIds: [
        gameData.talents[0]?.id ?? null,
        gameData.talents[1]?.id ?? null,
      ] as [string | null, string | null],
      supportCardId: gameData.supportCards?.[0]?.id ?? null,
    })),
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const {
    connected, profile, gameData, playerId, playerName,
    inQueue, matchFound, opponentName, inBattle, isBot,
    joinQueue, joinBot, leaveQueue, setPlayerName
  } = useSocketContext();

  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);
  const [unlockModal, setUnlockModal] = useState<{ rewards: any[] } | null>(null);

  // Helper to load or build deck
  const getActiveDeck = useCallback((): DeckConfig | null => {
    const saved = localStorage.getItem('primalduels_saved_deck');
    if (saved) {
      try {
        const slots = JSON.parse(saved);
        if (slots.some((s: any) => s.creatureId !== null)) {
          return {
            creatures: slots.filter((s: any) => s.creatureId !== null).map((s: any) => ({
              defId: s.creatureId,
              skillWeights: s.skillWeights,
              talentIds: s.talentIds,
              supportCardId: s.supportCardId,
            })),
          };
        }
      } catch (e) { console.error('Error loading saved deck', e); }
    }
    return buildDefaultDeck(gameData);
  }, [gameData]);

  useEffect(() => {
    if (inBattle) navigate('/battle');
  }, [inBattle, navigate]);

  const handleQuickPlay = () => {
    const deck = getActiveDeck();
    if (!deck) return;
    joinQueue(deck);
  };

  const handleVsBot = () => {
    const deck = getActiveDeck();
    if (!deck) return;
    joinBot(deck);
  };

  const handleNameSave = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
      setShowNameInput(false);
    }
  };



  // Correct way to listen for road_unlock:
  const { socket } = useSocketContext();
  useEffect(() => {
    if (!socket) return;
    const handleUnlock = (data: { rewards: any[] }) => {
      setUnlockModal(data);
    };
    socket.on('road_unlock', handleUnlock);
    return () => { socket.off('road_unlock', handleUnlock); };
  }, [socket]);

  const isSearching = inQueue && !matchFound;

  return (
    <div className="home-container">
      {/* Matchmaking Overlay */}
      {(inQueue || matchFound) && (
        <div className="matchmaking-overlay">
          {matchFound ? (
            <>
              <div className="matchmaking-vs">
                <div className="matchmaking-player">
                  <div className="matchmaking-avatar">{playerName.charAt(0).toUpperCase()}</div>
                  <div className="matchmaking-name">{playerName}</div>
                </div>
                <div className="matchmaking-vs-text">VS</div>
                <div className="matchmaking-player">
                  <div className={`matchmaking-avatar ${isBot ? 'bot' : ''}`}>
                    {isBot ? '🤖' : opponentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="matchmaking-name">{opponentName}</div>
                </div>
              </div>
              <div className="loading-spinner" />
              <div className="matchmaking-text">Loading Arena...</div>
            </>
          ) : (
            <>
              <div className="loading-spinner" />
              <div className="matchmaking-text">
                {connected ? 'Searching for Opponent...' : 'Connecting...'}
              </div>
              <div className="matchmaking-subtext">Primal duels await</div>
              <button className="btn btn-secondary" onClick={leaveQueue} style={{ marginTop: 12 }}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <Particles />
        <div className="hero-content">
          <div className="hero-badge">🐾 STRATEGY ARENA</div>
          <h1 className="hero-title">PRIMAL<br/>DUELS</h1>
          <p className="hero-subtitle">STRATEGY ARENA</p>
          <p className="hero-tagline">"Strategy wins. Not luck."</p>

          <div className="hero-btns">
            <button
              className="play-btn"
              onClick={handleQuickPlay}
              disabled={!connected || !gameData || isSearching}
            >
              {!connected ? '⏳ Connecting...' : isSearching ? '🔍 Searching...' : '⚔️ Quick PvP'}
            </button>
            <button
              className="play-btn-bot"
              onClick={handleVsBot}
              disabled={!connected || !gameData || isSearching}
            >
              🤖 VS Bot
            </button>
            <button
              className="btn btn-gold"
              style={{ flex: 1, padding: '14px', borderRadius: '12px', letterSpacing: '0.1em', animation: 'pulse-gold 2s infinite' }}
              onClick={() => navigate('/store')}
              disabled={!connected || !gameData || isSearching}
            >
              ✨ ANCIENT VAULT
            </button>
          </div>
          <p style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Or configure your deck first →
            <button
              onClick={() => navigate('/deck')}
              style={{ background: 'none', border: 'none', color: 'var(--green-glow)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.75rem', marginLeft: 4, textDecoration: 'underline' }}
            >
              Open Strategy Builder
            </button>
          </p>
        </div>
      </section>

      {/* Profile Card */}
      <section className="home-section">
        <div className="profile-card">
          <div className="profile-avatar" onClick={() => setShowNameInput(true)}>
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            {showNameInput ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                  style={{
                    background: 'var(--bg-deep)', border: '1px solid var(--border-accent)',
                    borderRadius: 'var(--radius-sm)', padding: '6px 12px',
                    color: 'var(--text-primary)', fontFamily: 'var(--font-heading)',
                    fontSize: '1rem', outline: 'none', width: 150,
                  }} autoFocus
                />
                <button className="btn btn-primary" onClick={handleNameSave} style={{ padding: '6px 16px', fontSize: '0.8rem' }}>Save</button>
              </div>
            ) : (
              <div className="profile-name">{playerName}</div>
            )}
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat-label">WINS</span>
                <span className="profile-stat-value" style={{ color: 'var(--green-glow)' }}>{profile?.totalWins || 0}</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">LOSSES</span>
                <span className="profile-stat-value" style={{ color: 'var(--red-combat)' }}>{profile?.totalLosses || 0}</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">LVL</span>
                <span className="profile-stat-value">{profile?.level || 1}</span>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(200, 150, 10, 0.1)', border: '1px solid rgba(200, 150, 10, 0.2)',
              borderRadius: 'var(--radius-sm)', padding: '4px 12px', width: 'fit-content' }}>
              <span style={{ fontSize: '1rem' }}>✨</span>
              <span style={{ fontFamily: 'var(--font-stat)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--gold)' }}>
                {profile?.essence || 0} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>ESSENCE</span>
              </span>
            </div>
          </div>
          <div className="profile-rating">{profile?.rating || 1000}</div>
        </div>
      </section>

      {/* Primal Road (Trophy Road) */}
      <section className="home-section">
        <h2 className="section-title">
          <span className="section-title-icon">🛣️</span>
          Primal Road
          <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: 10, fontWeight: 400 }}>EARN XP TO UNLOCK EXCLUSIVE POWER</span>
        </h2>
        
        <div className="primal-road-container">
          <div className="primal-road-track-bg" />
          <div className="primal-road-track-progress" 
            style={{ width: `${Math.min(100, (profile?.experience || 0) / 5000 * 100)}%` }} 
          />
          
          <div className="primal-road-items">
            {ROAD_REWARDS.map((reward, i) => {
              const hasXP = (profile?.experience || 0) >= reward.xpGoal;
              // Check if actually owned for non-essence rewards
              let isOwned = hasXP;
              if (reward.type === 'creature') isOwned = profile?.unlockedCreatures.includes(reward.id) ?? false;
              if (reward.type === 'skill') isOwned = profile?.unlockedSkills.includes(reward.id) ?? false;
              if (reward.type === 'talent') isOwned = profile?.unlockedTalents.includes(reward.id) ?? false;

              return (
                <div key={i} className={`road-item ${hasXP ? 'unlocked' : 'locked'}`}
                  style={{ left: `${(reward.xpGoal / 5000) * 100}%` }}>
                  <div className="road-item-icon">{reward.icon}</div>
                  <div className="road-item-tooltip">
                    <div className="tooltip-name">{reward.name}</div>
                    <div className="tooltip-xp">{reward.xpGoal} XP</div>
                  </div>
                  {isOwned && <div className="road-item-check">✓</div>}
                </div>
              );
            })}
          </div>
        </div>
        
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>START</span>
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{profile?.experience || 0} / 5000 XP TOTAL</span>
          <span>LEGENDARY REWARD</span>
        </div>
      </section>

      {/* Unlock Modal */}
      {unlockModal && (
        <div className="unlock-overlay" onClick={() => setUnlockModal(null)}>
          <div className="unlock-card" onClick={e => e.stopPropagation()}>
            <div className="unlock-header">NEW UNLOCK!</div>
            <div className="unlock-grid">
              {unlockModal.rewards.map((r, i) => (
                <div key={i} className="unlock-item">
                  <div className="unlock-icon">{r.icon || '✨'}</div>
                  <div className="unlock-name">{r.name}</div>
                  <div className="unlock-type">{r.type.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <p className="unlock-desc">Continue your journey on the Primal Road to unlock more exclusive content.</p>
            <button className="btn btn-primary" onClick={() => setUnlockModal(null)}>AWESOME!</button>
          </div>
        </div>
      )}

      {/* How to Play */}
      <section className="home-section">
        <h2 className="section-title">
          <span className="section-title-icon">📖</span>
          How to Play
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { icon: '🐾', title: 'Pick 6 Creatures', desc: 'Choose your lineup. Order determines spawn sequence.' },
            { icon: '⚙️', title: 'Configure Strategy', desc: 'Set skill frequency weights, assign up to 2 talents per creature, attach support cards.' },
            { icon: '⚔️', title: 'Auto-Battle', desc: 'Combat runs automatically every 2 seconds. Your pre-set strategy fights for you.' },
            { icon: '🏆', title: 'Last Standing Wins', desc: 'Defeat all 6 opponent creatures. A true test of planning.' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
              padding: '16px', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: '2rem' }}>{item.icon}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Server Status */}
      <section className="home-section" style={{ textAlign: 'center', paddingBottom: 100 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? 'var(--green-glow)' : 'var(--red-combat)',
            boxShadow: connected ? '0 0 8px var(--green-glow)' : '0 0 8px var(--red-combat)',
          }} />
          {connected ? 'Server Online' : 'Connecting...'}
        </div>
      </section>
    </div>
  );
}
