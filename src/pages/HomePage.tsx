import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../context/SocketContext';
import type { DeckConfig } from '../../shared/types';

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
    color: ['#B44DFF', '#FFD700', '#FF3B5C', '#87FF3C', '#00D4FF'][Math.floor(Math.random() * 5)],
  })), []);

  return (
    <div className="hero-particles">
      {particles.map(p => (
        <div key={p.id} className="particle"
          style={{ left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, background: `radial-gradient(circle, ${p.color}, transparent)`, opacity: 0.6 }}
        />
      ))}
    </div>
  );
}

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

      {/* Currency Bar */}
      <div className="currency-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #B44DFF, #6B1FAA)',
            border: '2px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-heading)', fontSize: '0.9rem', color: '#fff', cursor: 'pointer',
          }} onClick={() => setShowNameInput(true)}>
            {playerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', color: '#fff', lineHeight: 1 }}>{playerName}</div>
            <div style={{ fontFamily: 'var(--font-stat)', fontSize: '0.5rem', color: 'var(--gold)' }}>LVL {profile?.level || 1}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="currency-pill"><span className="currency-icon">🏆</span><span className="currency-value">{profile?.rating || 1000}</span></div>
          <div className="currency-pill"><span className="currency-icon">🪙</span><span className="currency-value">{profile?.coins || 0}</span></div>
          <div className="currency-pill"><span className="currency-icon">✨</span><span className="currency-value">{profile?.essence || 0}</span></div>
        </div>
      </div>

      {/* Name Input Modal */}
      {showNameInput && (
        <div className="modal-backdrop" style={{ zIndex: 100 }} onClick={() => setShowNameInput(false)}>
          <div className="modal-card" style={{ maxWidth: 350, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)', marginBottom: 16 }}>CHANGE NAME</h2>
            <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameSave()}
              className="admin-input" autoFocus style={{ textAlign: 'center', fontSize: '1.1rem' }}
            />
            <button className="btn btn-gold" onClick={handleNameSave} style={{ width: '100%', marginTop: 12 }}>SAVE</button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <Particles />
        <div className="hero-content">
          <div className="hero-badge" style={{ borderColor: 'rgba(180,77,255,0.5)', background: 'rgba(180,77,255,0.1)', color: '#B44DFF' }}>⚔️ STRATEGY ARENA</div>
          <h1 className="hero-title">PRIMAL<br/>DUELS</h1>
          <p className="hero-subtitle">STRATEGY ARENA</p>
          <p className="hero-tagline">"Strategy wins. Not luck."</p>

          <div className="hero-btns">
            <button
              className="play-btn"
              onClick={handleQuickPlay}
              disabled={!connected || !gameData || isSearching}
            >
              {!connected ? '⏳ Connecting...' : isSearching ? '🔍 Searching...' : '⚔️ QUICK PVP'}
            </button>
            <button
              className="play-btn-bot"
              onClick={handleVsBot}
              disabled={!connected || !gameData || isSearching}
            >
              🤖 VS BOT
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/deck')} style={{ flex: 1, maxWidth: 200 }}>
              ⚙️ STRATEGY
            </button>
            <button className="btn btn-gold" onClick={() => navigate('/store')} style={{ flex: 1, maxWidth: 200, animation: 'pulse-gold 2s infinite' }}>
              ✨ VAULT
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="home-section">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          background: 'var(--bg-card)', border: '2px solid var(--border-subtle)', borderRadius: 18, padding: '16px 20px',
        }}>
          {[
            { label: 'WINS', value: profile?.totalWins || 0, color: 'var(--green-glow)' },
            { label: 'LOSSES', value: profile?.totalLosses || 0, color: 'var(--red-combat)' },
            { label: 'RATING', value: profile?.rating || 1000, color: 'var(--gold)' },
            { label: 'LEVEL', value: profile?.level || 1, color: 'var(--blue-water)' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-stat)', fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Power-Ups Quick View */}
      {profile?.powerUps && profile.powerUps.length > 0 && (
        <section className="home-section" style={{ paddingTop: 0 }}>
          <h2 className="section-title"><span className="section-title-icon">⚡</span>Power-Ups</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {profile.powerUps.map((pu, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-card)', border: '2px solid rgba(135,255,60,0.2)', borderRadius: 14, padding: '8px 14px',
              }}>
                <span style={{ fontSize: '1.3rem' }}>{pu.icon}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', color: '#fff' }}>{pu.name}</span>
                <span style={{ fontFamily: 'var(--font-stat)', fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 700 }}>x{pu.quantity}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Primal Road */}
      <section className="home-section">
        <h2 className="section-title">
          <span className="section-title-icon">🛣️</span>
          Primal Road
          <span style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft: 10, fontWeight: 400, fontFamily: 'var(--font-body)' }}>EARN XP TO UNLOCK</span>
        </h2>
        
        <div className="primal-road-container">
          <div className="primal-road-track-bg" />
          <div className="primal-road-track-progress" 
            style={{ width: `${Math.min(100, (profile?.experience || 0) / 5000 * 100)}%` }} 
          />
          
          <div className="primal-road-items">
            {ROAD_REWARDS.map((reward, i) => {
              const hasXP = (profile?.experience || 0) >= reward.xpGoal;
              let isOwned = hasXP;
              if (reward.type === 'creature') isOwned = profile?.unlockedCreatures.includes(reward.id) ?? false;
              if (reward.type === 'skill') isOwned = profile?.unlockedSkills.includes(reward.id) ?? false;

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
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{profile?.experience || 0} / 5000 XP</span>
          <span>LEGENDARY</span>
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
            <button className="btn btn-gold" onClick={() => setUnlockModal(null)}>AWESOME!</button>
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
            { icon: '⚙️', title: 'Configure Strategy', desc: 'Set skill frequency, assign talents, attach support cards.' },
            { icon: '⚔️', title: 'Auto-Battle', desc: 'Combat runs every 2 seconds. Your strategy fights for you.' },
            { icon: '🏆', title: 'Last Standing Wins', desc: 'Defeat all 6 opponent creatures. A true test of planning.' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '2px solid var(--border-subtle)', borderRadius: 18,
              padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ fontSize: '2.2rem' }}>{item.icon}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: '#fff' }}>{item.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
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
