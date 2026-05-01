import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../context/SocketContext';
import type { BattleCreature, CombatEvent, PlayerBattleState } from '../../shared/types';

const BG_MAP: Record<string, string> = {
  Volcano: 'bg-map-volcano', Ocean: 'bg-map-ocean', Sky: 'bg-map-sky',
  Jungle: 'bg-map-jungle', Abyss: 'bg-map-abyss', Heaven: 'bg-map-heaven',
};

interface TacticalHUDProps { creature: BattleCreature | null; gameData: any; side: 'player' | 'enemy'; }
function TacticalHUD({ creature, gameData, side }: TacticalHUDProps) {
  if (!creature || !gameData) return null;
  const support = gameData.supportCards.find((s: any) => s.id === creature.supportCardId);
  const talents = creature.talents.map((tid: string) => gameData.talents.find((t: any) => t.id === tid)).filter(Boolean);
  return (
    <div className="tactical-hud" style={{ position:'absolute', bottom: -50, [side==='player'?'left':'right']: 0, zIndex:20, display:'flex', gap:10, alignItems:'flex-start' }}>
      <div>
        <div className="loadout-label">Skills</div>
        <div className="loadout-grid" style={{flexDirection:'row'}}>{creature.skills.map((s,i) => <div key={i} className="loadout-item" title={s.name}>{s.icon}</div>)}</div>
      </div>
      {(talents.length > 0 || support) && (
        <div>
          <div className="loadout-label">Augments</div>
          <div className="loadout-grid" style={{flexDirection:'row'}}>
            {talents.map((t: any,i: number) => <div key={i} className="loadout-item talent" title={t.name}>{t.icon}</div>)}
            {support && <div className="loadout-item support" title={support.name}>{support.icon}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

interface SkillPopup { id:string; icon:string; name:string; type:string; side?:'player'|'enemy'; }
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

  const [playerBg, setPlayerBg] = useState<string>('Jungle');
  const [enemyBg, setEnemyBg] = useState<string>('Jungle');

  useEffect(() => {
    if (myCreature?.backgroundType) setPlayerBg(myCreature.backgroundType);
  }, [myCreature?.backgroundType]);

  useEffect(() => {
    if (enemyCreature?.backgroundType) setEnemyBg(enemyCreature.backgroundType);
  }, [enemyCreature?.backgroundType]);

  const playerBgType = playerBg;
  const enemyBgType = enemyBg;

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
      case 'skill_used': {
        const side = ev.sourceId?.includes(playerId) ? 'player' : 'enemy';
        setSkillPopup({ id:`skill_${popupIdRef.current++}`, icon:(ev as any).skillIcon||'⚔️', name:ev.skillName||'?', type:'damage', side });
        if (gameData?.skills) { const info = gameData.skills.find((s: any) => s.name === ev.skillName); if (info) setActiveSkillInfo({...info, icon:(ev as any).skillIcon}); }
        setTimeout(() => setSkillPopup(null), 900);
        break;
      }
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
    <div className={`arena-container ${shaking?'screen-shake':''}`} style={{ display:'flex', flexDirection:'column' }}>
      {/* Slanted Split Battle Environment */}
      <div className="arena-background-system" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div className={`${BG_MAP[playerBgType]||''}`} style={{ position: 'absolute', inset: 0, opacity: 0.8, backgroundSize: 'cover', clipPath: 'polygon(0 0, 55% 0, 45% 100%, 0 100%)' }} />
        <div className={`${BG_MAP[enemyBgType]||''}`} style={{ position: 'absolute', inset: 0, opacity: 0.8, backgroundSize: 'cover', transform: 'scaleX(-1)', clipPath: 'polygon(0 0, 45% 0, 55% 100%, 0 100%)' }} />
        
        {/* Slanted Glowing Divider */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none', filter: 'drop-shadow(0 0 15px var(--gold-bright)) drop-shadow(0 0 5px var(--gold))' }}>
          <polygon points="55,0 55.3,0 45.3,100 45,100" fill="var(--gold)" />
        </svg>
      </div>
      <div style={{ position:'absolute', inset:0, zIndex:1, opacity:0.03, backgroundImage:`linear-gradient(rgba(255,255,255,0.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.2) 1px,transparent 1px)`, backgroundSize:'60px 60px' }} />

      {/* Top HUD */}
      <div className="battle-hud" style={{ position:'relative', zIndex:10, width:'100%', padding:'10px 20px', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(10px)' }}>
        <div className="hud-player-info" style={{ flex: 1 }}>
          <div className="hud-player-name" style={{color:'var(--green-glow)'}}>You</div>
          <div className="hud-hp-bar"><div className={`hud-hp-fill ${myHpPct>50?'health-high':myHpPct>25?'health-mid':'health-low'}`} style={{width:`${myHpPct}%`}} /></div>
          <div style={{fontFamily:'var(--font-stat)',fontSize:'0.6rem',color:'var(--text-muted)'}}>{myState?.creaturesAlive||0}/{myState?.totalCreatures||6} alive</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flexShrink:0, padding:'0 20px'}}>
          <div className="hud-timer">{formatTime(gameState.matchTimer)}</div>
          <div className="hud-round">ROUND {gameState.roundNumber}</div>
        </div>
        <div className="hud-player-info" style={{alignItems:'flex-end', flex: 1}}>
          <div className="hud-player-name" style={{color:'var(--red-combat)'}}>
            {opponentState?.playerName||'Opponent'}
            {opponentState?.isBot && <span style={{marginLeft:6,fontSize:'0.65rem',color:'var(--gold)'}}>🤖 BOT</span>}
          </div>
          <div className="hud-hp-bar"><div className={`hud-hp-fill ${enemyHpPct>50?'health-high':enemyHpPct>25?'health-mid':'health-low'}`} style={{width:`${enemyHpPct}%`}} /></div>
          <div style={{fontFamily:'var(--font-stat)',fontSize:'0.6rem',color:'var(--text-muted)'}}>{opponentState?.creaturesAlive||0}/{opponentState?.totalCreatures||6} alive</div>
        </div>
      </div>

      {/* Spawn Queues fixed to the sides */}
      <div style={{ position:'absolute', left: 20, top: 80, zIndex: 10 }}>
        <SpawnQueueDisplay player={myState} side="player" gameData={gameData} />
      </div>
      <div style={{ position:'absolute', right: 20, top: 80, zIndex: 10 }}>
        <SpawnQueueDisplay player={opponentState} side="enemy" gameData={gameData} />
      </div>

      {/* Main Battle Field (Horizontal) */}
      <div className="arena-field" style={{ position:'relative', zIndex:5, display:'flex', flexDirection:'row', justifyContent:'center', alignItems:'center', flex:1, gap:'15%' }}>
        
        {/* Player Half (Left) */}
        <div className="arena-half player-half" style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <CreatureDisplay creature={myCreature} isEnemy={false} anim={{attacking:animState.playerAttacking,hit:animState.playerHit,dying:animState.playerDying}} isSpawning={spawnAnim===myCreature?.id} />
          {dmgPopups.filter(p=>p.side==='player').map(p => (
            <div key={p.id} className={`damage-popup ${p.type}`} style={{top:'-20px',left:'50%',transform:'translateX(-50%)'}}>{p.type==='heal'?`+${p.value}`:`-${p.value}`}</div>
          ))}
          <TacticalHUD creature={myCreature} gameData={gameData} side="player" />
        </div>

        {/* Center Area */}
        <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', zIndex: 50 }}>
          {skillPopup && (
            <div className={`skill-impact-banner`}>
              <div className="skill-impact-icon">{skillPopup.icon}</div>
              <div className="skill-impact-name" style={{ color: skillPopup.side === 'player' ? 'var(--green-glow)' : 'var(--red-combat)', textShadow: skillPopup.side === 'player' ? '0 0 20px rgba(109,190,58,0.8), 0 2px 4px rgba(0,0,0,0.8)' : '0 0 20px rgba(255,64,64,0.8), 0 2px 4px rgba(0,0,0,0.8)' }}>
                {skillPopup.name}
              </div>
            </div>
          )}
        </div>

        {/* Enemy Half (Right) */}
        <div className="arena-half enemy-half" style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <CreatureDisplay creature={enemyCreature} isEnemy={true} anim={{attacking:animState.enemyAttacking,hit:animState.enemyHit,dying:animState.enemyDying}} isSpawning={spawnAnim===enemyCreature?.id} />
          {dmgPopups.filter(p=>p.side==='enemy').map(p => (
            <div key={p.id} className={`damage-popup ${p.type}`} style={{top:'-20px',left:'50%',transform:'translateX(-50%)'}}>{p.type==='heal'?`+${p.value}`:`-${p.value}`}</div>
          ))}
          <TacticalHUD creature={enemyCreature} gameData={gameData} side="enemy" />
        </div>

      </div>

      {/* Combat Log */}
      <div className="combat-log" style={{ bottom: 20, top: 'auto', right: 20, maxHeight: 150 }}>
        {(gameState.combatLog||[]).slice(-5).map((ev,i) => (
          <div key={i} className="combat-log-entry" style={{opacity:0.6+i*0.1,display:'flex',flexDirection:'column',gap:2,padding:'4px 8px',background:'rgba(0,0,0,0.4)',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
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
@keyframes pulse-glow{0%,100%{box-shadow:0 0 4px currentColor;opacity:0.7}50%{box-shadow:0 0 12px currentColor;opacity:1}}
.damage-popup{animation: dmg-float-up 1s ease forwards;}
@keyframes dmg-float-up { 0% { transform: translate(-50%, 0) scale(1); opacity: 1; } 100% { transform: translate(-50%, -60px) scale(0.8); opacity: 0; } }
`}</style>

      {/* Skill Monitor */}
      {activeSkillInfo && (
        <div className="skill-monitor" style={{ top: 'auto', bottom: 20, left: 20, right: 'auto' }}>
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

  if (!creature) return (<div className="arena-creature-entity" style={{opacity:0.3,minWidth:180, textAlign:'center'}}><div style={{fontSize:'4rem',color:'var(--text-muted)'}}>💀</div><div style={{fontFamily:'var(--font-heading)',fontSize:'0.8rem',color:'var(--text-muted)',marginTop:8}}>Waiting...</div></div>);

  const hasSprite = creature.image && !creature.image.includes('/assets/');

  return (
    <div className={`arena-creature-entity ${isEnemy?'enemy-side':'player-side'} ${hasSprite?'':animClass}`} style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{marginBottom:10}}><span className={`type-badge type-${creature.type.toLowerCase()}`}>{creature.type}</span></div>
      
      {/* Sprite/Emoji rendered directly, no card borders */}
      <div style={{ transform: isEnemy ? 'scaleX(-1)' : 'none' }}>
        {hasSprite ? (
          <img src={creature.image} alt={creature.name}
            className={`creature-sprite-lg ${spriteAnimClass}`}
            style={{ filter: `drop-shadow(0 10px 15px rgba(0,0,0,0.6))` }} />
        ) : (
          <div className={`arena-creature-emoji ${spriteAnimClass}`} style={{ fontSize: '6rem' }}>{creature.emoji}</div>
        )}
      </div>
      
      {/* Name and HP float below the creature */}
      <div style={{ background:'rgba(0,0,0,0.5)', padding:'6px 12px', borderRadius:20, marginTop:10, backdropFilter:'blur(4px)', border:'1px solid rgba(255,255,255,0.1)' }}>
        <div className="arena-creature-name" style={{margin:0, textAlign:'center'}}>{creature.name}</div>
        <div className="arena-hp-bar-wrap" style={{width: 140, marginTop: 4}}>
          <div className="arena-hp-bar"><div className={`arena-hp-fill ${hpClass}`} style={{width:`${hpPct}%`}} /></div>
          <div className="arena-hp-text">{creature.hp} / {creature.maxHp}</div>
        </div>
      </div>
      
      {/* Buffs */}
      {creature.buffs && creature.buffs.length > 0 && (
        <div style={{display:'flex',gap:3,flexWrap:'wrap',justifyContent:'center',marginTop:8}}>
          {creature.buffs.slice(0,4).map((buff,i) => (
            <div key={i} title={`${buff.type}: ${buff.value} (${buff.remainingTurns} turns)`}
              style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',border:'1px solid rgba(0,0,0,0.3)',
                background:buff.type==='dot'?'var(--orange-fire)':buff.type==='shield'?'var(--blue-water)':(buff.value||0)>0?'var(--green-glow)':'var(--red-combat)'}}>
              {buff.type==='dot'?'🔥':buff.type==='shield'?'🛡':(buff.value||0)>0?'↑':'↓'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpawnQueueDisplay({ player, side, gameData }: { player: PlayerBattleState|null|undefined; side:'player'|'enemy'; gameData:any }) {
  if (!player) return null;
  const queue = player.spawnQueue || [];
  const dead = player.deadCreatures || [];
  if (queue.length === 0 && dead.length === 0) return null;
  return (
    <div className="spawn-queue" style={{maxHeight:260,overflowY:'auto', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(5px)', padding:12}}>
      <div className="spawn-queue-title">{side==='player'?'YOUR QUEUE':'ENEMY QUEUE'}</div>
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
