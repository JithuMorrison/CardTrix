import { useState } from 'react';
import { useSocketContext } from '../context/SocketContext';

const RARITY_ORDER: Record<string, number> = {
  Common: 1, Rare: 2, SuperRare: 3, Epic: 4,
  Mythic: 5, Legendary: 6, UltraLegendary: 7, Heroic: 8,
};

function SpriteOrEmoji({ item, size = 'md' }: { item: any; size?: 'sm'|'md'|'lg' }) {
  const hasSprite = item.image && !item.image.includes('/assets/');
  const cls = size === 'sm' ? 'creature-sprite-sm' : size === 'lg' ? 'creature-sprite-lg' : 'creature-sprite-md';
  if (hasSprite) return <img src={item.image} alt={item.name} className={cls} />;
  return <div className={size === 'lg' ? 'creature-card-emoji' : ''} style={{ fontSize: size === 'sm' ? '1.5rem' : size === 'lg' ? '5rem' : '3rem' }}>{item.emoji || item.icon}</div>;
}

export default function Collection() {
  const { gameData, profile, socket, setProfile } = useSocketContext();
  const [tab, setTab] = useState<'creatures' | 'skills' | 'support' | 'talents'>('creatures');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = () => {
    if (!socket || !selected || !profile) return;
    setUpgrading(true);
    socket.emit('upgrade_creature', { playerId: profile.id, creatureId: selected.id }, (res: any) => {
      setUpgrading(false);
      if (res.success && res.player) {
        setProfile(res.player);
      } else {
        alert(res.message || 'Failed to upgrade');
      }
    });
  };

  const creatures = (gameData?.creatures || []).sort((a: any, b: any) => (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0));
  const skills = (gameData?.skills || []).sort((a: any, b: any) => (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0));
  const supportCards = gameData?.supportCards || [];
  const talents = gameData?.talents || [];
  const unlockedCreatures = profile?.unlockedCreatures || [];
  const unlockedSkills = profile?.unlockedSkills || [];
  const unlockedSupport = profile?.unlockedSupportCards || [];
  const unlockedTalents = profile?.unlockedTalents || [];

  const filteredCreatures = filterType === 'all' ? creatures : creatures.filter((c: any) => c.type === filterType);
  const filteredSkills = filterType === 'all' ? skills : skills.filter((s: any) => s.type === filterType);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, rgba(20, 24, 16, 0.9) 0%, transparent 100%)', padding: '40px 20px 20px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-stat)', fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.2em', marginBottom: 8 }}>⚙️ PRIMAL DUELS</div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>Collection</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>{unlockedCreatures.length}/{creatures.length} creatures unlocked</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '0 20px 20px', flexWrap: 'wrap' }}>
        {(['creatures', 'skills', 'support', 'talents'] as const).map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 20px', fontSize: '0.8rem' }} onClick={() => setTab(t)}>
            {t === 'creatures' ? '🐾 Creatures' : t === 'skills' ? '⚔️ Skills' : t === 'support' ? '🃏 Support' : '✨ Talents'}
          </button>
        ))}
      </div>

      {/* Type Filter for creatures/skills */}
      {(tab === 'creatures' || tab === 'skills') && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {['all', 'Fire', 'Water', 'Air', 'Earth', 'Shadow', 'Divine'].map(t => (
              <button key={t} className={`btn ${filterType === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '0.7rem', borderRadius: 'var(--radius-full)' }}
                onClick={() => setFilterType(t)}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'creatures' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
          <div className="collection-grid">
            {filteredCreatures.map((c: any) => {
              const unlocked = unlockedCreatures.includes(c.id);
              const hasSprite = c.image && !c.image.includes('/assets/');
              return (
                <div key={c.id} className={`creature-card card-holo ${!unlocked ? 'locked' : ''}`} onClick={() => setSelected(c)}>
                  {hasSprite ? <img src={c.image} alt={c.name} className="creature-sprite-md" style={{ marginBottom: 8 }} /> :
                    <div className="creature-card-emoji">{c.emoji}</div>}
                  <div className="creature-card-name">{c.name}</div>
                  <div style={{ marginBottom: 8 }}><span className={`rarity-badge rarity-${c.rarity.toLowerCase()}`}>{c.rarity}</span></div>
                  <div style={{ fontFamily: 'var(--font-heading)', color: 'var(--gold)', fontSize: '0.8rem', marginBottom: 4 }}>LVL {profile?.creatureLevels?.[c.id] || 1}</div>
                  <div className="creature-card-stats"><span>❤️ {c.baseHp}</span><span>⚔️ {c.baseAttack}</span><span>🛡️ {c.baseDefense}</span></div>
                  <div style={{ marginTop: 8 }}><span className={`type-badge type-${c.type.toLowerCase()}`}>{c.type}</span></div>
                  {!unlocked && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '1rem' }}>🔒</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'skills' && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
          <div className="collection-grid">
            {filteredSkills.map((s: any) => {
              const unlocked = unlockedSkills.includes(s.id);
              return (
                <div key={s.id} className={`creature-card ${!unlocked ? 'locked' : ''}`} style={{ height: 'auto', minHeight: 140 }}>
                  <div className="creature-card-emoji">{s.icon}</div>
                  <div className="creature-card-name">{s.name}</div>
                  <div style={{ marginBottom: 8 }}><span className={`rarity-badge rarity-${s.rarity.toLowerCase()}`}>{s.rarity}</span></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }}>{s.description}</div>
                  <div style={{ marginTop: 'auto' }}><span className={`type-badge type-${s.type.toLowerCase()}`}>{s.type}</span></div>
                  {!unlocked && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: '1rem' }}>🔒</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'support' && (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {supportCards.map((card: any) => {
              const unlocked = unlockedSupport.includes(card.id);
              return (
                <div key={card.id} className="card-holo" style={{
                  background: 'var(--bg-card)', border: '2px solid var(--border-mid)', borderRadius: '16px', padding: '16px 20px',
                  display: 'flex', gap: 16, alignItems: 'center', opacity: unlocked ? 1 : 0.6, filter: unlocked ? 'none' : 'grayscale(1)', position: 'relative'
                }}>
                  <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>{card.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{card.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{card.description}</div>
                    <span className={`rarity-badge rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span>
                  </div>
                  {!unlocked && <div style={{ position: 'absolute', top: 12, right: 16, fontSize: '1.2rem' }}>🔒</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'talents' && (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {talents.map((t: any) => {
              const unlocked = unlockedTalents.includes(t.id);
              return (
                <div key={t.id} style={{
                  background: 'var(--bg-card)', border: '2px solid var(--border-mid)', borderRadius: '16px', padding: '14px 20px',
                  display: 'flex', gap: 14, alignItems: 'center', opacity: unlocked ? 1 : 0.6, filter: unlocked ? 'none' : 'grayscale(1)', position: 'relative'
                }}>
                  <div style={{ fontSize: '2rem', flexShrink: 0 }}>{t.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{t.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{t.description}</div>
                    <span className={`rarity-badge rarity-${t.rarity.toLowerCase()}`}>{t.rarity}</span>
                  </div>
                  {!unlocked && <div style={{ position: 'absolute', top: 12, right: 16, fontSize: '1.2rem' }}>🔒</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Creature Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <SpriteOrEmoji item={selected} size="lg" />
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6, marginTop: 8 }}>{selected.name}</h2>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <span className={`type-badge type-${selected.type.toLowerCase()}`}>{selected.type}</span>
                <span className={`rarity-badge rarity-${selected.rarity.toLowerCase()}`}>{selected.rarity}</span>
              </div>
            </div>
            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 16, textAlign: 'center' }}>{selected.description}</div>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 20, fontFamily: 'var(--font-stat)', fontSize: '0.75rem' }}>
              <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-muted)' }}>HP</div><div style={{ color: 'var(--green-glow)', fontWeight: 700, fontSize: '1.1rem' }}>{selected.baseHp}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-muted)' }}>ATK</div><div style={{ color: 'var(--red-combat)', fontWeight: 700, fontSize: '1.1rem' }}>{selected.baseAttack}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-muted)' }}>DEF</div><div style={{ color: '#06B6D4', fontWeight: 700, fontSize: '1.1rem' }}>{selected.baseDefense}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ color: 'var(--text-muted)' }}>SPD</div><div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.1rem' }}>{selected.baseSpeed}</div></div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.12em', marginBottom: 10 }}>SKILLS</div>
            {selected.skillIds?.map((skillId: string) => {
              const skill = gameData?.skills?.find((s: any) => s.id === skillId);
              if (!skill) return null;
              return (
                <div key={skillId} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: 6 }}>
                  <span style={{ fontSize: '1.2rem' }}>{skill.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{skill.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{skill.description}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-stat)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{skill.defaultWeight}%</span>
                </div>
              );
            })}

            {unlockedCreatures.includes(selected.id) && (
              <div style={{ marginTop: 24, padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border-mid)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: 8, color: 'var(--gold)', textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>
                  Level {profile?.creatureLevels?.[selected.id] || 1} {profile?.creatureLevels?.[selected.id] >= 11 ? '(MAXED)' : ''}
                </div>
                {(!profile?.creatureLevels?.[selected.id] || profile.creatureLevels[selected.id] < 11) && (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                      Upgrade Cost:{' '}
                      <span style={{ color: '#FFD700', fontWeight: 700 }}>{(profile?.creatureLevels?.[selected.id] || 1) * 50} 🪙</span> +{' '}
                      <span style={{ color: '#87FF3C', fontWeight: 700 }}>{(profile?.creatureLevels?.[selected.id] || 1) * 20} ⚡</span>
                    </div>
                    <button 
                      className="btn btn-gold" 
                      style={{ padding: '12px 24px', fontSize: '1rem', width: '100%' }}
                      onClick={handleUpgrade}
                      disabled={upgrading || (profile?.coins || 0) < (profile?.creatureLevels?.[selected.id] || 1) * 50 || (profile?.powerPoints || 0) < (profile?.creatureLevels?.[selected.id] || 1) * 20}
                    >
                      {upgrading ? 'UPGRADING...' : 'UPGRADE CREATURE'}
                    </button>
                  </>
                )}
              </div>
            )}

            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 16 }} onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
