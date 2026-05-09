import { useState, useEffect, useMemo } from 'react';
import { useSocketContext } from '../context/SocketContext';

const BOXES = [
  { id: 'rare', name: 'RARE BOX', cost: 100, icon: '📦', color: '#3B82F6', glowColor: 'rgba(59,130,246,0.5)', desc: 'Rare+ creatures & skills' },
  { id: 'epic', name: 'EPIC BOX', cost: 300, icon: '🎁', color: '#D946EF', glowColor: 'rgba(217,70,239,0.5)', desc: 'Epic+ items & power points' },
  { id: 'legendary', name: 'MEGA BOX', cost: 500, icon: '👑', color: '#FFD700', glowColor: 'rgba(255,215,0,0.5)', desc: 'Legendary chance & big rewards' },
  { id: 'support', name: 'SUPPORT BOX', cost: 400, icon: '🛡️', color: '#06B6D4', glowColor: 'rgba(6,182,212,0.5)', desc: 'Guaranteed support card only' },
];

const RARITY_COLORS: Record<string, string> = {
  Common: '#9CA3AF', Rare: '#3B82F6', SuperRare: '#8B5CF6', Epic: '#D946EF',
  Mythic: '#F43F5E', Legendary: '#F59E0B', UltraLegendary: '#FF6000', Heroic: '#06B6D4',
};

type Phase = 'shop' | 'shaking' | 'bursting' | 'flash' | 'reveal' | 'summary';

export default function Store() {
  const { socket, playerId, profile, connected, setProfile } = useSocketContext();
  const [phase, setPhase] = useState<Phase>('shop');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeBox, setActiveBox] = useState<typeof BOXES[0] | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);

  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 3, size: 3 + Math.random() * 6,
    color: ['#FFD700', '#B44DFF', '#FF3B5C', '#87FF3C', '#00D4FF'][Math.floor(Math.random() * 5)],
  })), []);

  const openBox = (box: typeof BOXES[0]) => {
    const essence = profile?.essence || 0;
    if (phase !== 'shop' || !socket || !connected) return;
    if (essence < box.cost) {
      setError(`Need ${box.cost} ✨ to open this box!`);
      return;
    }

    setActiveBox(box);
    setError(null);
    setResult(null);
    setPhase('shaking');

    setTimeout(() => {
      setPhase('bursting');
      socket.emit('open_box', { playerId, boxType: box.id }, (res: any) => {
        if (res.success) {
          setResult(res.result);
          if (res.player) setProfile(res.player);
          setTimeout(() => {
            setPhase('flash');
            setTimeout(() => {
              setRevealIndex(0);
              setPhase('reveal');
            }, 400);
          }, 500);
        } else {
          setPhase('shop');
          setError(res.message);
        }
      });
    }, 1500);
  };

  useEffect(() => {
    if (phase !== 'reveal' || !result) return;
    const totalItems = 1 + (result.bonusCoins > 0 ? 1 : 0) + (result.bonusPowerPoints > 0 ? 1 : 0);
    if (revealIndex < totalItems - 1) {
      const timer = setTimeout(() => setRevealIndex(i => i + 1), 800);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setPhase('summary'), 1200);
      return () => clearTimeout(timer);
    }
  }, [phase, revealIndex, result]);

  const goBack = () => {
    setPhase('shop');
    setResult(null);
    setActiveBox(null);
    setRevealIndex(0);
  };

  const revealItems: { icon: string; name: string; subtitle: string; color: string }[] = [];
  if (result) {
    const mainItem = result.items[0];
    revealItems.push({
      icon: mainItem.icon,
      name: mainItem.name,
      subtitle: mainItem.isDuplicate ? `Duplicate → +${mainItem.fragmentsGiven} shards` : `NEW ${mainItem.type.toUpperCase()}!`,
      color: RARITY_COLORS[mainItem.rarity] || '#fff',
    });
    if (result.bonusCoins > 0) {
      revealItems.push({ icon: '🪙', name: `${result.bonusCoins} Coins`, subtitle: 'Bonus coins!', color: '#FFD700' });
    }
    if (result.bonusPowerPoints > 0) {
      revealItems.push({ icon: '⚡', name: `${result.bonusPowerPoints} Power Points`, subtitle: 'Use to upgrade creatures!', color: '#87FF3C' });
    }
  }

  // ---- SHOP VIEW ----
  if (phase === 'shop') {
    return (
      <div className="home-container" style={{ padding: '0 20px 120px', textAlign: 'center' }}>
        <div className="currency-bar" style={{ justifyContent: 'center', gap: 16 }}>
          <div className="currency-pill"><span className="currency-icon">🪙</span><span className="currency-value">{profile?.coins || 0}</span></div>
          <div className="currency-pill"><span className="currency-icon">✨</span><span className="currency-value">{profile?.essence || 0}</span></div>
          <div className="currency-pill"><span className="currency-icon">⚡</span><span className="currency-value">{profile?.powerPoints || 0}</span></div>
        </div>

        <header style={{ marginTop: 30, marginBottom: 40 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.8rem', color: 'var(--gold)', textShadow: '0 4px 0 #996600, 0 0 40px rgba(255,215,0,0.3)' }}>
            VAULT
          </h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '1rem' }}>Spend Essence to unlock primal powers!</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, maxWidth: 920, margin: '0 auto' }}>
          {BOXES.map(box => {
            const canAfford = (profile?.essence || 0) >= box.cost;
            return (
              <div key={box.id} onClick={() => canAfford && openBox(box)}
                style={{
                  background: `linear-gradient(180deg, ${box.color}15, ${box.color}08)`,
                  border: `3px solid ${box.color}40`,
                  borderRadius: 22, padding: '30px 20px', cursor: canAfford ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                  opacity: canAfford ? 1 : 0.5,
                  boxShadow: canAfford ? `0 0 30px ${box.glowColor}` : 'none',
                }}
                onMouseEnter={e => { if (canAfford) (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px) scale(1.02)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {box.id === 'support' && (
                  <div style={{ position: 'absolute', top: 10, right: 10, background: '#06B6D4', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: '0.6rem', padding: '2px 8px', borderRadius: 8 }}>SUPPORT ONLY</div>
                )}
                <div style={{ fontSize: '4rem', marginBottom: 14, filter: `drop-shadow(0 0 20px ${box.color})`, animation: 'sprite-idle 2.5s ease-in-out infinite' }}>{box.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '1.2rem', marginBottom: 6 }}>{box.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>{box.desc}</p>
                <button className="btn btn-gold" style={{ width: '100%', padding: '12px', fontSize: '1rem', pointerEvents: 'none' }}>
                  {box.cost} ✨ OPEN
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => setError(null)}>
            <div className="modal-card" style={{ maxWidth: 350, textAlign: 'center' }}>
              <h2 style={{ color: 'var(--red-combat)', fontFamily: 'var(--font-heading)' }}>Oops!</h2>
              <p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>{error}</p>
              <button className="btn btn-primary btn-large" style={{ width: '100%', marginTop: 20 }} onClick={() => setError(null)}>OK</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- BOX OPENING ANIMATION ----
  return (
    <div className="box-opening-overlay">
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: '50%',
          background: p.color, left: `${p.left}%`, top: '-5%',
          animation: `coin-rain ${2 + p.delay}s linear ${p.delay}s infinite`, opacity: 0.6,
        }} />
      ))}

      {phase === 'shaking' && activeBox && (
        <div style={{ textAlign: 'center' }}>
          <div className="box-3d shaking" style={{ filter: `drop-shadow(0 0 40px ${activeBox.color})` }}>{activeBox.icon}</div>
          <div style={{ marginTop: 30, fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--text-muted)', animation: 'pulse-gold 1s infinite' }}>OPENING...</div>
        </div>
      )}

      {phase === 'bursting' && activeBox && (
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div className="light-rays-effect" />
          <div className="box-3d bursting" style={{ filter: `drop-shadow(0 0 40px ${activeBox.color})` }}>{activeBox.icon}</div>
        </div>
      )}

      {phase === 'flash' && <div className="flash-overlay" />}

      {phase === 'reveal' && revealItems[revealIndex] && (
        <div className="reward-reveal-card" key={revealIndex} style={{ borderColor: revealItems[revealIndex].color }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.15, borderRadius: 20, background: `radial-gradient(circle, ${revealItems[revealIndex].color} 0%, transparent 70%)` }} />
          <div style={{ fontSize: '5rem', marginBottom: 16, animation: 'reward-bounce-in 0.5s ease', filter: `drop-shadow(0 0 30px ${revealItems[revealIndex].color})` }}>{revealItems[revealIndex].icon}</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', color: '#fff', marginBottom: 8 }}>{revealItems[revealIndex].name}</div>
          <div style={{ display: 'inline-block', padding: '4px 16px', borderRadius: 12, background: `${revealItems[revealIndex].color}25`, border: `2px solid ${revealItems[revealIndex].color}`, fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: revealItems[revealIndex].color, fontWeight: 700 }}>
            {revealItems[revealIndex].subtitle}
          </div>
        </div>
      )}

      {phase === 'summary' && result && (
        <div style={{ textAlign: 'center', animation: 'reward-bounce-in 0.5s ease' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--gold)', marginBottom: 30, textShadow: '0 0 20px rgba(255,215,0,0.4)' }}>REWARDS!</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 30 }}>
            {revealItems.map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: `2px solid ${item.color}50`, borderRadius: 16, padding: '20px 24px', textAlign: 'center', minWidth: 130 }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: '#fff' }}>{item.name}</div>
                <div style={{ fontSize: '0.7rem', color: item.color, fontWeight: 700, marginTop: 4 }}>{item.subtitle}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-gold btn-large" onClick={goBack}>AWESOME!</button>
        </div>
      )}
    </div>
  );
}
