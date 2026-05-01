import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../context/SocketContext';
import type { BattleCreature, CombatEvent, PlayerBattleState } from '../../shared/types';

// Background CSS class per background type
const BG_MAP: Record<string, string> = {
  Volcano: 'bg-map-volcano', Ocean: 'bg-map-ocean', Sky: 'bg-map-sky',
  Jungle: 'bg-map-jungle', Abyss: 'bg-map-abyss', Heaven: 'bg-map-heaven',
};

// Fallback gradient backgrounds
const BG_CLASS: Record<string, string> = {
  Volcano: 'bg-volcano', Ocean: 'bg-ocean', Sky: 'bg-sky',
  Jungle: 'bg-jungle', Abyss: 'bg-abyss', Heaven: 'bg-heaven',
};

function SpriteOrEmoji({ creature, className = '', style }: { creature: BattleCreature; className?: string; style?: React.CSSProperties }) {
  const hasSprite = creature.image && !creature.image.includes('/assets/');
  if (hasSprite) {
    return <img src={creature.image} alt={creature.name} className={`creature-sprite ${className}`} style={style} />;
  }
  return <div className={`arena-creature-emoji ${className}`} style={style}>{creature.emoji}</div>;
}

interface TacticalHUDProps { creature: BattleCreature | null; gameData: any; side: 'player' | 'enemy'; }
function TacticalHUD({ creature, gameData, side }: TacticalHUDProps) {
  if (!creature || !gameData) return null;
  const support = gameData.supportCards.find((s: any) => s.id === creature.supportCardId);
  const talents = creature.talents.map(tid => gameData.talents.find((t: any) => t.id === tid)).filter(Boolean);
  return (
    <div className="tactical-hud" style={{ position:'absolute', bottom:side==='player'?20:'auto', top:side==='enemy'?20:'auto', left:side==='player'?'auto':20, right:side==='player'?20:'auto', zIndex:20 }}>
      <div className="loadout-label">Skills</div>
      <div className="loadout-grid">{creature.skills.map((s,i) => <div key={i} className="loadout-item" title={s.name}>{s.icon}</div>)}</div>
      {(talents.length > 0 || support) && (<>
        <div className="loadout-label" style={{marginTop:8}}>Augments</div>
        <div className="loadout-grid">
          {talents.map((t: any,i: number) => <div key={i} className="loadout-item talent" title={t.name}>{t.icon}</div>)}
          {support && <div className="loadout-item support" title={support.name}>{support.icon}</div>}
        </div>
      </>)}
    </div>
  );
}

interface SkillPopup { id:string; icon:string; name:string; type:string; }
interface DmgPopup { id:string; value:number; type:'damage'|'heal'|'dot'; side:'player'|'enemy'; }
interface AnimState { playerAttacking:boolean; enemyAttacking:boolean; playerHit:boolean; enemyHit:boolean; playerDying:boolean; enemyDying:boolean; }

export default function BattleArena() {
  const navigate = useNavigate();
  const { gameState, playerId, battleEvents, isBot, gameData } = useSocketContext();
  const [skillPopup, setSkillPopup] = useState<SkillPopup | null>(null);
  const [dmgPopups, setDmgPopups] = useState<DmgPopup[]>([]);
  const [animState, setAnimState] = useState<AnimState>({ playerAttacking:false, enemyAttacking:false, playerHit:false, enemyHit:false, playerDying:false, enemyDying:false });
  const [showResult, setShowResult] = useState(false);
  const [spawnAnim, setSpawnAnim] = useState('');
  const [activeSkillInfo, setActiveSkillInfo] = useState<any>(null);
  const [shaking, setShaking] = useState(false);
  const popupIdRef = useRef(0);

  const myState = gameState?.players[playerId];
  const opponentId = gameState ? Object.keys(gameState.players).find(id => id !== playerId) : null;
  const opponentState = opponentId ? gameState?.players[opponentId] : null;
  const myCreature = myState?.activeCombatant;
  const enemyCreature = opponentState?.activeCombatant;

  const playerBgType = myCreature?.backgroundType || 'Jungle';
  const enemyBgType = enemyCreature?.backgroundType || 'Jungle';

  useEffect(() => { if (gameState?.phase==='ended') setTimeout(()=>setShowResult(true),600); }, [gameState?.phase]);

  useEffect(() => {
    if (!battleEvents || battleEvents.length === 0) return;
    for (const ev of battleEvents) handleEvent(ev);
  }, [battleEvents]);

  const addPopup = (popup: Omit<DmgPopup,'id'>) => {
    const id = `popup_${popupIdRef.current++}`;
    setDmgPopups(prev => [...prev, { ...popup, id }]);
    setTimeout(() => setDmgPopups(prev => prev.filter(p => p.id !== id)), 1200);
  };

  const handleEvent = (ev: CombatEvent) => {
    switch (ev.type) {
      case 'skill_used':
        setSkillPopup({ id:`skill_${popupIdRef.current++}`, icon:(ev as any).skillIcon||'⚔️', name:ev.skillName||'?', type:'damage' });
        if (gameData?.skills) { const info = gameData.skills.find((s: any) => s.name === ev.skillName); if (info) setActiveSkillInfo({...info, icon:(ev as any).skillIcon}); }
        setTimeout(() => setSkillPopup(null), 900);
        break;
      case 'damage_dealt': {
        const isEnemyTaking = ev.targetId?.includes(opponentId||'');
        if (isEnemyTaking) {
          setAnimState(p => ({...p, playerAttacking:true, enemyHit:true}));
          setTimeout(() => setAnimState(p => ({...p, playerAttacking:false, enemyHit:false})), 400);
          addPopup({value:ev.value||0, type:'damage', side:'enemy'});
        } else {
          setAnimState(p => ({...p, enemyAttacking:true, playerHit:true}));
          setTimeout(() => setAnimState(p => ({...p, enemyAttacking:false, playerHit:false})), 400);
          addPopup({value:ev.value||0, type:'damage', side:'player'});
        }
        if ((ev.value||0) > 100) { setShaking(true); setTimeout(()=>setShaking(false),300); }
        break;
      }
      case 'heal': addPopup({value:ev.value||0, type:'heal', side:ev.targetId?.includes(playerId)?'player':'enemy'}); break;
      case 'dot_tick': addPopup({value:ev.value||0, type:'dot', side:ev.targetId?.includes(playerId)?'player':'enemy'}); break;
      case 'creature_died': {
        const isP = ev.targetId?.includes(playerId);
        if (isP) { setAnimState(p=>({...p,playerDying:true})); setTimeout(()=>setAnimState(p=>({...p,playerDying:false})),700); }
        else { setAnimState(p=>({...p,enemyDying:true})); setTimeout(()=>setAnimState(p=>({...p,enemyDying:false})),700); }
        break;
      }
      case 'creature_spawned': setSpawnAnim(ev.targetId||''); setTimeout(()=>setSpawnAnim(''),600); break;
    }
  };

  if (!gameState) return (<div className="loading-screen"><div className="loading-spinner"/><div className="loading-text">Loading Arena...</div></div>);

  const isWinner = gameState.winner === playerId;
  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const myHpPct = myCreature ? (myCreature.hp/myCreature.maxHp)*100 : 0;
  const enemyHpPct = enemyCreature ? (enemyCreature.hp/enemyCreature.maxHp)*100 : 0;

  return (
    <div className={`arena-container ${shaking?'screen-shake':''}`}>
      {/* Battle Environment - Real background images */}
      <div className="arena-background-system">
        <div className={`arena-bg-side arena-bg-enemy ${BG_MAP[enemyBgType]||''}`}
          style={!BG_MAP[enemyBgType] ? {backgroundImage:`none`} : {}} />
        <div className={`arena-bg-side arena-bg-player ${BG_MAP[playerBgType]||''}`}
          style={!BG_MAP[playerBgType] ? {backgroundImage:`none`} : {}} />
        <div className="lightning-divider" />
      </div>

      {/* Grid overlay */}
      <div style={{ position:'absolute', inset:0, zIndex:1, opacity:0.03, backgroundImage:`linear-gradient(rgba(255,255,255,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.2) 1px,transparent 1px)`, backgroundSize:'60px 60px' }} />

      {/* Battle HUD */}
      <div className="battle-hud" style={{ position:'relative', zIndex:10 }}>
        <div className="hud-player-info">
          <div className="hud-player-name" style={{color:'var(--red-combat)'}}>
            {opponentState?.playerName||'Opponent'}
            {opponentState?.isBot && <span style={{marginLeft:6,fontSize:'0.65rem',color:'var(--gold)'}}>🤖 BOT</span>}
          </div>
          <div className="hud-hp-bar"><div className={`hud-hp-fill ${enemyHpPct>50?'health-high':enemyHpPct>25?'health-mid':'health-low'}`} style={{width:`${enemyHpPct}%`}} /></div>
          <div style={{fontFamily:'var(--font-stat)',fontSize:'0.6rem',color:'var(--text-muted)'}}>{opponentState?.creaturesAlive||0}/{opponentState?.totalCreatures||6} alive</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flexShrink:0}}>
          <div className="hud-timer">{formatTime(gameState.matchTimer)}</div>
          <div className="hud-round">ROUND {gameState.roundNumber}</div>
          <div style={{display:'flex',gap:4}}><div style={{width:6,height:6,borderRadius:'50%',background:'var(--green-glow)',animation:'pulse-glow 1s ease-in-out infinite'}}/><span style={{fontFamily:'var(--font-stat)',fontSize:'0.55rem',color:'var(--green-glow)'}}>AUTO</span></div>
        </div>
        <div className="hud-player-info" style={{alignItems:'flex-end'}}>
          <div className="hud-player-name" style={{color:'var(--green-glow)'}}>You</div>
          <div className="hud-hp-bar"><div className={`hud-hp-fill ${myHpPct>50?'health-high':myHpPct>25?'health-mid':'health-low'}`} style={{width:`${myHpPct}%`}} /></div>
          <div style={{fontFamily:'var(--font-stat)',fontSize:'0.6rem',color:'var(--text-muted)'}}>{myState?.creaturesAlive||0}/{myState?.totalCreatures||6} alive</div>
        </div>
      </div>

      {/* Main Battle Field */}
      <div className="arena-field" style={{ position:'relative', zIndex:5 }}>
        {/* Enemy Half */}
        <div className="arena-half" style={{alignItems:'flex-end',paddingBottom:12}}>
          <SpawnQueueDisplay player={opponentState} side="enemy" gameData={gameData} />
          <div style={{position:'relative'}}>
            <CreatureDisplay creature={enemyCreature} isEnemy={true} anim={{attacking:animState.enemyAttacking,hit:animState.enemyHit,dying:animState.enemyDying}} isSpawning={spawnAnim===enemyCreature?.id} />
            {dmgPopups.filter(p=>p.side==='enemy').map(p => (
              <div key={p.id} className={`damage-popup ${p.type}`} style={{top:'20%',left:'50%',transform:'translateX(-50%)'}}>{p.type==='heal'?`+${p.value}`:`-${p.value}`}</div>
            ))}
          </div>
          <TacticalHUD creature={enemyCreature} gameData={gameData} side="enemy" />
        </div>

        {/* VS Divider */}
        <div className="arena-vs-divider" style={{position:'relative'}}>
          <div style={{position:'absolute',left:0,right:0,top:'50%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)'}} />
          {skillPopup && (<div className="skill-impact-banner"><div className="skill-impact-icon">{skillPopup.icon}</div><div className="skill-impact-name">{skillPopup.name}</div></div>)}
        </div>

        {/* Player Half */}
        <div className="arena-half" style={{alignItems:'flex-start',paddingTop:12}}>
          <SpawnQueueDisplay player={myState} side="player" gameData={gameData} />
          <div style={{position:'relative'}}>
            <CreatureDisplay creature={myCreature} isEnemy={false} anim={{attacking:animState.playerAttacking,hit:animState.playerHit,dying:animState.playerDying}} isSpawning={spawnAnim===myCreature?.id} />
            {dmgPopups.filter(p=>p.side==='player').map(p => (
              <div key={p.id} className={`damage-popup ${p.type}`} style={{bottom:'20%',left:'50%',transform:'translateX(-50%)'}}>{p.type==='heal'?`+${p.value}`:`-${p.value}`}</div>
            ))}
          </div>
          <TacticalHUD creature={myCreature} gameData={gameData} side="player" />
        </div>
      </div>

      {/* Combat Log */}
      <div className="combat-log">
        {(gameState.combatLog||[]).slice(-10).map((ev,i) => (
          <div key={i} className="combat-log-entry" style={{opacity:0.4+i*0.06,display:'flex',flexDirection:'column',gap:2,padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,fontWeight:600}}>
              {ev.type==='skill_used' && `${(ev as any).skillIcon||'⚔️'} ${ev.skillName}`}
              {ev.type==='damage_dealt' && <><span>💥 {ev.skillName||'Attack'}:</span><span style={{color:'var(--red-combat)'}}>-{ev.value} dmg</span></>}
              {ev.type==='heal' && <span style={{color:'var(--green-glow)'}}>💚 +{ev.value} heal</span>}
              {ev.type==='creature_died' && <span style={{color:'var(--red-combat)'}}>💀 {ev.skillName} fell!</span>}
              {ev.type==='creature_spawned' && <span style={{color:'var(--green-glow)'}}>🐾 {ev.skillName} enters!</span>}
              {ev.type==='dot_tick' && <span style={{color:'var(--orange-fire)'}}>🔥 -{ev.value} burn</span>}
              {ev.type==='shield_applied' && <span style={{color:'var(--blue-water)'}}>🛡️ Shield up</span>}
              {ev.type==='round_start' && <span style={{color:'var(--gold)'}}>◈ Round {(ev.tick||0)/10+1}</span>}
            </div>
            {ev.explanation && <div style={{fontSize:'0.65rem',color:'var(--text-secondary)',paddingLeft:18,fontStyle:'italic'}}>↳ {ev.explanation}</div>}
          </div>
        ))}
      </div>

      <style>{`.hud-hp-fill,.arena-hp-fill{transition:width 0.6s cubic-bezier(0.4,0,0.2,1)}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 4px currentColor;opacity:0.7}50%{box-shadow:0 0 12px currentColor;opacity:1}}`}</style>

      {/* Skill Monitor */}
      {activeSkillInfo && (
        <div className="skill-monitor">
          <div className="skill-monitor-header"><span>ACTION MONITOR</span><button style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',float:'right'}} onClick={()=>setActiveSkillInfo(null)}>✕</button></div>
          <div className="skill-monitor-active">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{fontSize:'2.5rem'}}>{activeSkillInfo.icon||'⚔️'}</div>
              <div><div style={{fontFamily:'var(--font-heading)',fontSize:'1.2rem',color:'var(--text-primary)'}}>{activeSkillInfo.name}</div>
              <div style={{display:'flex',gap:6,marginTop:4}}><span className={`type-badge type-${activeSkillInfo.type.toLowerCase()}`}>{activeSkillInfo.type}</span><span className="skill-chip power">⚡ {activeSkillInfo.power} PWR</span></div></div>
            </div>
            <div style={{fontSize:'0.85rem',color:'var(--text-secondary)',lineHeight:1.5,borderLeft:'2px solid var(--border-mid)',paddingLeft:12}}>{activeSkillInfo.description}</div>
          </div>
        </div>
      )}

      {/* Result Overlay */}
      {showResult && (
        <div className="result-overlay">
          <div style={{fontSize:'5rem'}}>{isWinner?'🏆':'💀'}</div>
          <div className={`result-title ${isWinner?'result-win':'result-lose'}`}>{isWinner?'VICTORY!':'DEFEATED'}</div>
          <div style={{fontFamily:'var(--font-body)',fontSize:'1rem',color:'var(--text-secondary)'}}>{formatTime(gameState.matchTimer)} • Round {gameState.roundNumber}</div>
          {(gameState as any).rewards?.[playerId] && (
            <div className="result-stats">
              <div className="result-stat"><div className="result-stat-label">ESSENCE</div><div className="result-stat-value">+{(gameState as any).rewards[playerId].essence} ✨</div></div>
              <div className="result-stat"><div className="result-stat-label">EXPERIENCE</div><div className="result-stat-value" style={{color:'var(--green-glow)'}}>+{(gameState as any).rewards[playerId].xp} XP</div></div>
            </div>
          )}
          <div style={{display:'flex',gap:12}}>
            <button className="btn btn-primary btn-large" onClick={()=>window.location.href='/'}>HOME</button>
            <button className="btn btn-gold btn-large" onClick={()=>window.location.href='/deck'}>⚙️ STRATEGY</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreatureDisplay({ creature, isEnemy, anim, isSpawning }: { creature: BattleCreature|null|undefined; isEnemy:boolean; anim:{attacking:boolean;hit:boolean;dying:boolean}; isSpawning:boolean; }) {
  const hpPct = creature ? (creature.hp/creature.maxHp)*100 : 0;
  const hpClass = hpPct>60?'health-high':hpPct>30?'health-mid':hpPct>10?'health-low':'health-critical';
  const animClass = anim.dying?'dying':anim.hit?'taking-hit':anim.attacking?'attacking':isSpawning?'creature-spawn-enter':'';
  const spriteAnimClass = anim.dying?'dying':anim.hit?'hit':anim.attacking?'attacking':'';

  if (!creature) return (<div className="arena-creature-card" style={{opacity:0.3,minWidth:180}}><div style={{fontSize:'4rem',color:'var(--text-muted)'}}>💀</div><div style={{fontFamily:'var(--font-heading)',fontSize:'0.8rem',color:'var(--text-muted)',marginTop:8}}>Waiting...</div></div>);

  const hasSprite = creature.image && !creature.image.includes('/assets/');

  return (
    <div className={`arena-creature-card ${isEnemy?'enemy-side':'player-side'} ${hasSprite?'':animClass}`}>
      <div style={{position:'absolute',top:6,right:8,width:8,height:8,borderRadius:'50%',background:isEnemy?'var(--red-combat)':'var(--green-glow)',animation:'pulse-glow 1.5s ease-in-out infinite'}} />
      {hasSprite ? (
        <img src={creature.image} alt={creature.name}
          className={`creature-sprite ${spriteAnimClass}`}
          style={{ transform: isEnemy ? 'scaleX(-1)' : 'none' }} />
      ) : (
        <div className={`arena-creature-emoji`} style={{transform:isEnemy?'scaleX(-1)':'none'}}>{creature.emoji}</div>
      )}
      <div className="arena-creature-name">{creature.name}</div>
      <div style={{marginBottom:10}}><span className={`type-badge type-${creature.type.toLowerCase()}`}>{creature.type}</span></div>
      <div className="arena-hp-bar-wrap"><div className="arena-hp-bar"><div className={`arena-hp-fill ${hpClass}`} style={{width:`${hpPct}%`}} /></div><div className="arena-hp-text">{creature.hp} / {creature.maxHp}</div></div>
      {creature.buffs && creature.buffs.length > 0 && (
        <div style={{display:'flex',gap:3,flexWrap:'wrap',justifyContent:'center',marginTop:8}}>
          {creature.buffs.slice(0,4).map((buff,i) => (
            <div key={i} title={`${buff.type}: ${buff.value} (${buff.remainingTurns} turns)`}
              style={{width:16,height:16,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.55rem',border:'1px solid rgba(0,0,0,0.3)',
                background:buff.type==='dot'?'var(--orange-fire)':buff.type==='shield'?'var(--blue-water)':(buff.value||0)>0?'var(--green-glow)':'var(--red-combat)'}}>
              {buff.type==='dot'?'🔥':buff.type==='shield'?'🛡':(buff.value||0)>0?'↑':'↓'}
            </div>
          ))}
        </div>
      )}
      {creature.supportCardId && <div style={{position:'absolute',top:4,left:8,fontSize:'0.9rem'}} title={creature.supportCardId}>🃏</div>}
    </div>
  );
}

function SpawnQueueDisplay({ player, side, gameData }: { player: PlayerBattleState|null|undefined; side:'player'|'enemy'; gameData:any }) {
  if (!player) return null;
  const queue = player.spawnQueue || [];
  const dead = player.deadCreatures || [];
  if (queue.length === 0 && dead.length === 0) return null;
  return (
    <div className="spawn-queue" style={{maxHeight:220,overflowY:'auto'}}>
      <div className="spawn-queue-title">{side==='player'?'▼ YOUR QUEUE':'▲ ENEMY QUEUE'}</div>
      {dead.map(c => {
        const hasSprite = c.image && !c.image.includes('/assets/');
        return (
          <div key={c.id} className="spawn-queue-item dead">
            {hasSprite ? <img src={c.image} alt={c.name} className="creature-sprite-sm" style={{opacity:0.4,filter:'grayscale(1)'}} /> : <div className="spawn-queue-emoji">{c.emoji}</div>}
            <div className="spawn-queue-name">{c.name}</div>
            <div style={{fontSize:'0.6rem',color:'var(--red-combat)'}}>💀</div>
          </div>
        );
      })}
      {queue.map(c => {
        const hasSprite = c.image && !c.image.includes('/assets/');
        return (
          <div key={c.id} className="spawn-queue-item">
            {hasSprite ? <img src={c.image} alt={c.name} className="creature-sprite-sm" /> : <div className="spawn-queue-emoji">{c.emoji}</div>}
            <div className="spawn-queue-name">{c.name}</div>
            <div className="spawn-queue-hp-mini"><div className="spawn-queue-hp-fill" style={{width:`${(c.hp/c.maxHp)*100}%`}} /></div>
          </div>
        );
      })}
    </div>
  );
}
