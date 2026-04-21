import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../context/SocketContext';
import type { DeckConfig } from '../../shared/types';

interface SlotConfig {
  creatureId: string | null;
  skillIds: [string, string, string];
  skillWeights: [number, number, number];
  talentIds: [string | null, string | null];
  supportCardId: string | null;
}

const emptySlot = (): SlotConfig => ({
  creatureId: null,
  skillIds: ['', '', ''],
  skillWeights: [50, 30, 20],
  talentIds: [null, null],
  supportCardId: null,
});

const RARITY_ORDER: Record<string, number> = {
  Common: 1, Rare: 2, SuperRare: 3, Epic: 4,
  Mythic: 5, Legendary: 6, UltraLegendary: 7, Heroic: 8,
};

export default function DeckBuilder() {
  const navigate = useNavigate();
  const { gameData, profile, joinQueue, joinBot, connected, inQueue } = useSocketContext();

  const [slots, setSlots] = useState<SlotConfig[]>(() => {
    const saved = localStorage.getItem('primalduels_saved_deck');
    // Migration: If saved deck doesn't have skillIds, reset to empty
    const parsed = saved ? JSON.parse(saved) : null;
    if (parsed && Array.isArray(parsed) && !parsed[0].skillIds) return Array.from({ length: 6 }, emptySlot);
    return parsed || Array.from({ length: 6 }, emptySlot);
  });
  const [activeSlot, setActiveSlot] = useState(0);
  const [filterType, setFilterType] = useState('all');
  const [showTalentPicker, setShowTalentPicker] = useState<0 | 1 | null>(null);
  const [showSupportPicker, setShowSupportPicker] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState<0 | 1 | 2 | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('primalduels_saved_deck', JSON.stringify(slots));
  }, [slots]);

  const creatures = gameData?.creatures || [];
  const talents = (gameData?.talents || []).filter(t => profile?.unlockedTalents.includes(t.id));
  const supportCards = (gameData?.supportCards || []).filter(s => profile?.unlockedSupportCards.includes(s.id));

  const sortedCreatures = useMemo(() =>
    [...creatures]
      .filter(c => profile?.unlockedCreatures.includes(c.id))
      .sort((a: any, b: any) => (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0)),
    [creatures, profile?.unlockedCreatures]);

  const filteredCreatures = useMemo(() =>
    filterType === 'all' ? sortedCreatures : sortedCreatures.filter((c: any) => c.type === filterType),
    [sortedCreatures, filterType]);

  const usedCreatureIds = slots.map(s => s.creatureId).filter(Boolean) as string[];
  const usedSupportCount = slots.filter(s => s.supportCardId).length;
  const activeSlotConfig = slots[activeSlot];
  const activeCreatureDef = creatures.find((c: any) => c.id === activeSlotConfig?.creatureId);

  const totalWeightValid = activeSlotConfig
    ? activeSlotConfig.skillWeights.reduce((a, b) => a + b, 0) === 100
    : true;

  const deckReady = slots.every(s => s.creatureId !== null) && slots.every(s => {
    const w = s.skillWeights;
    return w[0] + w[1] + w[2] === 100;
  });

  // ---- Slot Actions ----

  const assignCreature = useCallback((creatureId: string) => {
    const def = creatures.find(c => c.id === creatureId);
    setSlots(prev => {
      const next = prev.map(s => s.creatureId === creatureId ? { ...s, creatureId: null } : s);
      next[activeSlot] = {
        ...next[activeSlot],
        creatureId,
        skillIds: def ? [...def.skillIds] as [string, string, string] : ['', '', ''],
        skillWeights: [50, 30, 20],
        talentIds: [null, null],
        supportCardId: null
      };
      return next;
    });
  }, [activeSlot, creatures]);

  const setWeight = useCallback((skillIdx: 0 | 1 | 2, value: number) => {
    setSlots(prev => {
      const next = [...prev];
      const weights = [...next[activeSlot].skillWeights] as [number, number, number];

      // Clamp value
      value = Math.max(10, Math.min(80, value));
      const diff = value - weights[skillIdx];
      weights[skillIdx] = value;

      // Redistribute diff from the other two
      const others = [0, 1, 2].filter(i => i !== skillIdx) as [number, number];
      const otherTotal = weights[others[0]] + weights[others[1]];
      if (otherTotal > 0) {
        const ratio0 = weights[others[0]] / otherTotal;
        const ratio1 = weights[others[1]] / otherTotal;
        weights[others[0]] = Math.max(10, Math.round(weights[others[0]] - diff * ratio0));
        weights[others[1]] = Math.max(10, Math.round(weights[others[1]] - diff * ratio1));
        // Fix rounding to ensure exact 100
        const sum = weights[0] + weights[1] + weights[2];
        weights[others[1]] += (100 - sum);
      }

      next[activeSlot] = { ...next[activeSlot], skillWeights: weights };
      return next;
    });
  }, [activeSlot]);

  const setTalent = useCallback((slot: 0 | 1, talentId: string | null) => {
    setSlots(prev => {
      const next = [...prev];
      const t = [...next[activeSlot].talentIds] as [string | null, string | null];
      // If selecting the same talent for both, clear the other
      if (talentId && t[1 - slot] === talentId) t[1 - slot] = null;
      t[slot] = talentId;
      next[activeSlot] = { ...next[activeSlot], talentIds: t };
      return next;
    });
    setShowTalentPicker(null);
  }, [activeSlot]);

  const setSkill = useCallback((slotIdx: 0 | 1 | 2, skillId: string) => {
    setSlots(prev => {
      const next = [...prev];
      const sIds = [...next[activeSlot].skillIds] as [string, string, string];
      // If skill already equipped in another slot, swap them
      const existingIdx = sIds.indexOf(skillId);
      if (existingIdx !== -1) {
        sIds[existingIdx] = sIds[slotIdx];
      }
      sIds[slotIdx] = skillId;
      next[activeSlot] = { ...next[activeSlot], skillIds: sIds };
      return next;
    });
    setShowSkillPicker(null);
  }, [activeSlot]);

  const setSupportCard = useCallback((cardId: string | null) => {
    setSlots(prev => {
      const next = [...prev];
      next[activeSlot] = { ...next[activeSlot], supportCardId: cardId };
      return next;
    });
    setShowSupportPicker(false);
  }, [activeSlot]);

  // ---- Drag & Drop reordering ----
  const handleDragStart = (idx: number) => setDragId(String(idx));
  const handleDrop = (targetIdx: number) => {
    if (dragId === null) return;
    const fromIdx = Number(dragId);
    if (fromIdx === targetIdx) return;
    setSlots(prev => {
      const next = [...prev];
      [next[fromIdx], next[targetIdx]] = [next[targetIdx], next[fromIdx]];
      return next;
    });
    setDragId(null);
  };

  // ---- Battle ----
  const buildDeck = (): DeckConfig => ({
    creatures: slots.map(s => ({
      defId: s.creatureId!,
      skillIds: s.skillIds,
      skillWeights: s.skillWeights,
      talentIds: s.talentIds,
      supportCardId: s.supportCardId,
    })),
  });

  const handlePvP = () => { if (deckReady) joinQueue(buildDeck()); };
  const handleBot = () => { if (deckReady) joinBot(buildDeck()); };

  const typeColors: Record<string, string> = {
    Fire: '#E87010', Water: '#3A8AC8', Air: '#64A0E6',
    Earth: '#6DBE3A', Shadow: '#8A3AC8', Divine: '#C8C864',
  };

  return (
    <div className="deck-builder">
      {/* LEFT: Creature Roster */}
      <div className="deck-sidebar">
        <div className="deck-sidebar-header">🐾 Creature Roster</div>

        {/* Type Filter */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {['all', 'Fire', 'Water', 'Air', 'Earth', 'Shadow', 'Divine'].map(t => (
            <button key={t}
              className={`btn ${filterType === t ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.65rem', borderRadius: 'var(--radius-full)' }}
              onClick={() => setFilterType(t)}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        <div className="deck-creature-list">
          {filteredCreatures.map((c: any) => {
            const inDeck = usedCreatureIds.includes(c.id);
            return (
              <div key={c.id}
                className={`deck-creature-item ${inDeck ? 'in-deck' : ''}`}
                onClick={() => assignCreature(c.id)}
                title={c.description}
              >
                <div className="deck-creature-thumb">{c.emoji}</div>
                <div className="deck-creature-info">
                  <div className="deck-creature-info-name">{c.name}</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 3 }}>
                    <span className={`type-badge type-${c.type.toLowerCase()}`}>{c.type}</span>
                    <span className={`rarity-badge rarity-${c.rarity.toLowerCase()}`} style={{ fontSize: '0.5rem', padding: '1px 5px' }}>{c.rarity}</span>
                  </div>
                </div>
                {inDeck && <span style={{ color: 'var(--gold)', fontSize: '1rem' }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER: Spawn Order Grid */}
      <div className="deck-main">
        <div className="deck-main-header">
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ⚔️ Strategy Configuration
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
              Order determines spawn sequence. Drag to reorder.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: usedCreatureIds.length === 6 ? 'var(--green-glow)' : 'var(--text-muted)', fontFamily: 'var(--font-stat)' }}>
              {usedCreatureIds.length}/6 creatures
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: usedSupportCount <= 3 ? 'var(--gold)' : 'var(--red-combat)', fontFamily: 'var(--font-stat)' }}>
              {usedSupportCount}/3 support
            </div>
          </div>
        </div>

        <div className="spawn-order-grid">
          {slots.map((slot, i) => {
            const creature = creatures.find((c: any) => c.id === slot.creatureId);
            return (
              <div
                key={i}
                className={`spawn-slot ${creature ? 'filled' : ''} ${activeSlot === i ? 'active' : ''}`}
                onClick={() => setActiveSlot(i)}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(i)}
              >
                <div className="spawn-slot-order">SPAWN {i + 1}</div>

                {creature ? (
                  <>
                    <div className="spawn-slot-emoji">{creature.emoji}</div>
                    <div className="spawn-slot-name">{creature.name}</div>
                    <span className={`rarity-badge rarity-${creature.rarity.toLowerCase()}`}>{creature.rarity}</span>

                    {/* Quick config indicators */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
                      {slot.talentIds[0] && (
                        <span style={{ fontSize: '0.9rem' }} title={talents.find((t: any) => t.id === slot.talentIds[0])?.name}>
                          {talents.find((t: any) => t.id === slot.talentIds[0])?.icon || '✨'}
                        </span>
                      )}
                      {slot.talentIds[1] && (
                        <span style={{ fontSize: '0.9rem' }} title={talents.find((t: any) => t.id === slot.talentIds[1])?.name}>
                          {talents.find((t: any) => t.id === slot.talentIds[1])?.icon || '✨'}
                        </span>
                      )}
                      {slot.supportCardId && (
                        <span style={{ fontSize: '0.9rem' }} title={supportCards.find((s: any) => s.id === slot.supportCardId)?.name}>
                          {supportCards.find((s: any) => s.id === slot.supportCardId)?.icon || '🃏'}
                        </span>
                      )}
                    </div>

                    {/* Weight bar */}
                    <div style={{ display: 'flex', width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1, marginTop: 4 }}>
                      <div style={{ flex: slot.skillWeights[0], background: '#6DBE3A' }} />
                      <div style={{ flex: slot.skillWeights[1], background: '#C88020' }} />
                      <div style={{ flex: slot.skillWeights[2], background: '#8A3AC8' }} />
                    </div>

                    <button
                      className="btn btn-danger"
                      style={{ padding: '2px 10px', fontSize: '0.65rem', marginTop: 4 }}
                      onClick={e => { e.stopPropagation(); setSlots(prev => { const n = [...prev]; n[i] = emptySlot(); return n; }); }}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}>➕</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click creature to assign</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Battle Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            className="play-btn" style={{ flex: 1, padding: '14px' }}
            onClick={handlePvP}
            disabled={!deckReady || !connected || inQueue}
          >
            {!deckReady ? `⚙️ Configure All Slots` : '⚔️ Quick PvP'}
          </button>
          <button
            className="play-btn-bot" style={{ flex: 1, padding: '14px' }}
            onClick={handleBot}
            disabled={!deckReady || !connected || inQueue}
          >
            {!deckReady ? '⚙️ Configure All Slots' : '🤖 VS Bot'}
          </button>
        </div>
      </div>

      {/* RIGHT: Slot Config */}
      <div className="deck-detail">
        {activeCreatureDef ? (
          <>
            <div style={{ textAlign: 'center', padding: '12px 0 16px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 16 }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 4 }}>{activeCreatureDef.emoji}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {activeCreatureDef.name}
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                <span className={`type-badge type-${activeCreatureDef.type.toLowerCase()}`}>{activeCreatureDef.type}</span>
                <span className={`rarity-badge rarity-${activeCreatureDef.rarity.toLowerCase()}`}>{activeCreatureDef.rarity}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, fontFamily: 'var(--font-stat)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <span>❤️ {activeCreatureDef.baseHp}</span>
                <span>⚔️ {activeCreatureDef.baseAttack}</span>
                <span>⚡ {activeCreatureDef.baseSpeed}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>
                {activeCreatureDef.description}
              </div>
            </div>

            {/* Skills */}
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 10 }}>
              EQUIPPED SKILLS (Click to Swap)
            </div>
            {activeSlotConfig.skillIds.map((skillId: string, i: number) => {
              const skill = gameData!.skills.find((s: any) => s.id === skillId);
              if (!skill) return null;
              const colors = ['#6DBE3A', '#C88020', '#8A3AC8'];
              return (
                <div className="skill-weight-row" key={skillId}>
                  <div className="skill-weight-header" onClick={() => setShowSkillPicker(i as 0|1|2)} style={{ cursor: 'pointer' }}>
                    <div className="skill-weight-name">
                      <span>{skill.icon}</span> {skill.name}
                    </div>
                    <div className="skill-weight-pct" style={{ color: colors[i] }}>
                      {activeSlotConfig.skillWeights[i]}%
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10} max={80}
                    value={activeSlotConfig.skillWeights[i]}
                    onChange={e => setWeight(i as 0|1|2, Number(e.target.value))}
                    style={{ accentColor: colors[i] }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <span className={`type-badge type-${skill.type.toLowerCase()}`} style={{ fontSize: '0.5rem' }}>{skill.type}</span>
                    <span className="skill-chip power">⚡ {skill.power} PWR</span>
                    <span className="skill-chip cd">⏳ {skill.cooldown}t</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                    {skill.description}
                  </div>
                </div>
              );
            })}

            {/* Talents */}
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 16, marginBottom: 8 }}>
              TALENTS (Max 2)
            </div>
            {([0, 1] as const).map(tSlot => {
              const talentId = activeSlotConfig.talentIds[tSlot];
              const talent = talentId ? talents.find((t: any) => t.id === talentId) : null;
              return (
                <div key={tSlot}
                  className={`talent-slot ${talent ? 'selected' : ''}`}
                  onClick={() => setShowTalentPicker(tSlot)}
                >
                  <div className="talent-slot-icon">{talent ? talent.icon : '➕'}</div>
                  <div className="talent-slot-info">
                    <div className="talent-slot-name">{talent ? talent.name : `Talent Slot ${tSlot + 1}`}</div>
                    <div className="talent-slot-desc">{talent ? talent.description : 'Click to assign'}</div>
                  </div>
                  {talent && (
                    <button
                      className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.6rem' }}
                      onClick={e => { e.stopPropagation(); setTalent(tSlot, null); }}
                    >✕</button>
                  )}
                </div>
              );
            })}

            {/* Support Card */}
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 16, marginBottom: 8 }}>
              SUPPORT CARD
              <span style={{ float: 'right', color: usedSupportCount >= 3 ? 'var(--red-combat)' : 'var(--text-muted)', fontSize: '0.65rem' }}>
                {usedSupportCount}/3 used
              </span>
            </div>
            <div
              className={`support-slot ${activeSlotConfig.supportCardId ? 'filled' : ''}`}
              onClick={() => setShowSupportPicker(true)}
            >
              {activeSlotConfig.supportCardId ? (() => {
                const card = supportCards.find((c: any) => c.id === activeSlotConfig.supportCardId);
                return (
                  <>
                    <span style={{ fontSize: '1.3rem' }}>{card?.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-primary)' }}>{card?.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{card?.description}</div>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '0.6rem' }}
                      onClick={e => { e.stopPropagation(); setSupportCard(null); }}>✕</button>
                  </>
                );
              })() : (
                <span>🃏 Attach support card (optional)</span>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚔️</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Select a spawn slot</div>
            <div style={{ fontSize: '0.75rem' }}>Click a creature from the left panel to assign it to this slot</div>
          </div>
        )}
      </div>

      {/* Talent Picker Modal */}
      {showTalentPicker !== null && (
        <div className="modal-backdrop" onClick={() => setShowTalentPicker(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">✨ Choose Talent {showTalentPicker + 1}</div>
            {talents.map((t: any) => {
              const isSelected = activeSlotConfig.talentIds.includes(t.id);
              return (
                <div key={t.id}
                  className={`talent-slot ${isSelected ? 'selected' : ''}`}
                  style={{ marginBottom: 6, cursor: 'pointer' }}
                  onClick={() => setTalent(showTalentPicker, t.id)}
                >
                  <div className="talent-slot-icon">{t.icon}</div>
                  <div className="talent-slot-info">
                    <div className="talent-slot-name">{t.name}</div>
                    <div className="talent-slot-desc">{t.description}</div>
                  </div>
                  <span className={`rarity-badge rarity-${t.rarity.toLowerCase()}`}>{t.rarity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Support Card Picker Modal */}
      {showSupportPicker && (
        <div className="modal-backdrop" onClick={() => setShowSupportPicker(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🃏 Choose Support Card</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Max 3 support cards per deck • {usedSupportCount} used
            </div>
            {supportCards.map((card: any) => {
              const isAttached = card.id === activeSlotConfig.supportCardId;
              const isUsedElsewhere = !isAttached && slots.some(s => s.supportCardId === card.id);
              const atLimit = !isAttached && usedSupportCount >= 3;
              return (
                <div key={card.id}
                  className={`talent-slot ${isAttached ? 'selected' : ''}`}
                  style={{ marginBottom: 6, cursor: atLimit || isUsedElsewhere ? 'not-allowed' : 'pointer', opacity: atLimit || isUsedElsewhere ? 0.4 : 1 }}
                  onClick={() => { if (!atLimit && !isUsedElsewhere) setSupportCard(card.id); }}
                >
                  <div className="talent-slot-icon">{card.icon}</div>
                  <div className="talent-slot-info">
                    <div className="talent-slot-name">{card.name}</div>
                    <div className="talent-slot-desc">{card.description}</div>
                  </div>
                  <span className={`rarity-badge rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Skill Picker Modal */}
      {showSkillPicker !== null && (
        <div className="modal-backdrop" onClick={() => setShowSkillPicker(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-title">⚔️ Choose Skill {showSkillPicker + 1}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Only showing unlocked & compatible skills for this creature type.
            </div>
            {gameData!.skills
              .filter(s => {
                const unlocked = profile?.unlockedSkills.includes(s.id);
                // Compatible if it's the creature's type or Neutral, AND 
                // Either no restricted list, or this creature is in the restricted list
                const typeMatches = s.type === activeCreatureDef.type || s.type === 'Neutral';
                const notRestricted = !s.allowedCreatureIds || s.allowedCreatureIds.length === 0 || s.allowedCreatureIds.includes(activeCreatureDef.id);
                return unlocked && typeMatches && notRestricted;
              })
              .map((s: any) => {
                const isSelected = activeSlotConfig.skillIds.includes(s.id);
                return (
                  <div key={s.id}
                    className={`talent-slot ${isSelected ? 'selected' : ''}`}
                    style={{ marginBottom: 6, cursor: 'pointer' }}
                    onClick={() => setSkill(showSkillPicker, s.id)}
                  >
                    <div className="talent-slot-icon">{s.icon}</div>
                    <div className="talent-slot-info">
                      <div className="talent-slot-name">{s.name}</div>
                      <div className="talent-slot-desc">{s.description}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <span className={`type-badge type-${s.type.toLowerCase()}`} style={{ fontSize: '0.5rem' }}>{s.type}</span>
                        <span className="skill-chip power">⚡ {s.power} PWR</span>
                      </div>
                    </div>
                    <span className={`rarity-badge rarity-${s.rarity.toLowerCase()}`}>{s.rarity}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
