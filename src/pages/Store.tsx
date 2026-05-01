import { useState } from 'react';
import { useSocketContext } from '../context/SocketContext';
import { PlayerProfile } from '../../shared/types';

const BOXES = [
  { id: 'rare', name: 'Rare Box', cost: 100, icon: '💎', color: '#3A8AC8' },
  { id: 'epic', name: 'Epic Box', cost: 300, icon: '🔥', color: '#8A3AC8' },
  { id: 'legendary', name: 'Legendary Box', cost: 500, icon: '👑', color: '#D4AF37' },
];

export default function Store() {
  const { socket, playerId, profile, connected, setProfile } = useSocketContext();
  const [opening, setOpening] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const openBox = (boxType: string) => {
    const box = BOXES.find(b => b.id === boxType);
    const essence = profile?.essence || 0;
    
    console.log(`[Store] openBox triggered for: ${boxType}. State -> opening: ${opening}, connected: ${connected}, essence: ${essence}, cost: ${box?.cost}`);

    if (opening) {
      console.warn('[Store] Already opening a box.');
      return;
    }

    if (!socket || !connected) {
      setError('Connection lost! Reconnecting to the Ancient Vault...');
      console.error('[Store] Socket not connected.');
      return;
    }

    if (box && essence < box.cost) {
      setError(`Insufficient Essence! You need ${box.cost} ✨ to open this box.`);
      return;
    }

    setOpening(true);
    setReward(null);
    setError(null);

    console.log(`[Store] Sending open_box event for ${boxType}`);
    socket.emit('open_box', { playerId, boxType }, (res: any) => {
      console.log('[Store] open_box response:', res);
      setOpening(false);
      if (res.success) {
        setReward(res.reward);
        if (res.player) setProfile(res.player);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="home-container" style={{ padding: '40px 20px', textAlign: 'center' }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>
          ✨ ANCIENT VAULT
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Use your Essence to unlock primal powers</p>
        
        <div style={{ display: 'inline-flex', gap: 20, marginTop: 20, padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>✨</span>
            <span style={{ fontFamily: 'var(--font-stat)', fontWeight: 700, color: 'var(--gold)' }}>{profile?.essence || 0}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>💎</span>
            <span style={{ fontFamily: 'var(--font-stat)', fontWeight: 700, color: 'var(--blue-water)' }}>{Object.values(profile?.shards || {}).reduce((a: number, b: number) => a + b, 0)}</span>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
        {BOXES.map(box => {
          const canAfford = (profile?.essence || 0) >= box.cost;
          return (
            <div key={box.id} className="creature-card" style={{ height: 'auto', padding: '30px 20px' }} onClick={() => openBox(box.id)}>
              <div style={{ fontSize: '4rem', marginBottom: 20, filter: `drop-shadow(0 0 15px ${box.color}66)` }}>{box.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: 8 }}>{box.name}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20 }}>Contains {box.id === 'basic' ? 'Common items' : `${box.id} or better items`}</p>
              
              <button 
                className={`btn ${canAfford ? 'btn-gold' : 'btn-secondary'}`}
                style={{ width: '100%', padding: '12px', pointerEvents: 'none' }}
              >
                {box.cost === 0 ? 'CLAIM FREE' : `OPEN - ${box.cost} ✨`}
              </button>
            </div>
          );
        })}
      </div>

      {opening && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: 20, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>UNSEALING VAULT...</p>
        </div>
      )}

      {reward && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => setReward(null)}>
          <div className="modal-card" style={{ textAlign: 'center', maxWidth: 400, animation: 'result-fade-in 0.5s ease', position: 'relative', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: `radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 60%)`, animation: 'spin-slow 10s linear infinite', zIndex: -1, pointerEvents: 'none' }} />
            
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 10, fontFamily: 'var(--font-stat)', fontWeight: 700 }}>NEW UNLOCK</div>
            <div style={{ margin: '30px 0', display: 'flex', justifyContent: 'center' }}>
              {(reward.image && !reward.image.includes('/assets/')) ? (
                <img src={reward.image} alt={reward.name} className="creature-sprite-lg" style={{ animation: 'spawn-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
              ) : (
                <div style={{ fontSize: '6rem', animation: 'spawn-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>{reward.icon || reward.emoji}</div>
              )}
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', color: 'var(--text-primary)', marginBottom: 10 }}>{reward.name}</h2>
            <div className={`rarity-badge rarity-${(reward.rarity || 'common').toLowerCase()}`} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
              {reward.rarity}
            </div>
            
            <p style={{ marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {reward.isDuplicate 
                ? `Duplicate! Converted to ${reward.fragmentsGiven} shards.` 
                : `A powerful new ${reward.type} has been added to your collection.`}
            </p>

            <button className="btn btn-primary btn-large" style={{ width: '100%', marginTop: 30 }} onClick={() => setReward(null)}>
              AWESOME
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="modal-backdrop" style={{ zIndex: 1000 }} onClick={() => setError(null)}>
          <div className="modal-card" style={{ maxWidth: 350, textAlign: 'center' }}>
            <h2 style={{ color: 'var(--red-combat)' }}>Oops!</h2>
            <p style={{ marginTop: 10, color: 'var(--text-secondary)' }}>{error}</p>
            <button className="btn btn-primary btn-large" style={{ width: '100%', marginTop: 20 }} onClick={() => setError(null)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
