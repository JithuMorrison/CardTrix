import { useState, useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';

const TYPES = ['Fire', 'Water', 'Air', 'Earth', 'Shadow', 'Divine'];
const BG_TYPES = ['Volcano', 'Ocean', 'Sky', 'Jungle', 'Abyss', 'Heaven'];
const RARITIES = ['Common', 'Rare', 'SuperRare', 'Epic', 'Mythic', 'Legendary', 'UltraLegendary', 'Heroic'];
const EFFECTS = ['damage', 'heal', 'buff', 'debuff', 'dot', 'shield'];
const BUFF_TYPES = ['attack', 'speed', 'defense', 'regen', 'damage_reduction'];
const TALENT_EFFECTS = ['first_strike','stat_boost','on_hit_shield','on_hit_heal','berserker_attack','passive_regen','damage_reduction','on_death_burst','poison_on_hit','lifesteal'];

export default function AdminPanel() {
  const { socket, gameData } = useSocketContext();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [tab, setTab] = useState<'creatures'|'skills'|'talents'|'support'>('creatures');
  const [msg, setMsg] = useState('');

  // Creature form
  const [cForm, setCForm] = useState({ id:'', name:'', type:'Earth', backgroundType:'Jungle', baseHp:700, baseAttack:300, baseSpeed:18, skillIds:'', description:'', emoji:'🐾', rarity:'Common', image:'' });
  // Skill form
  const [sForm, setSForm] = useState({ id:'', name:'', type:'Earth', effect:'damage', power:100, cooldown:2, defaultWeight:50, description:'', icon:'⚔️', rarity:'Common', duration:0, buffType:'', buffValue:0 });
  // Talent form
  const [tForm, setTForm] = useState({ id:'', name:'', description:'', effectType:'stat_boost', stat:'attack', value:25, icon:'✨', rarity:'Common' });
  // Support form
  const [scForm, setScForm] = useState({ id:'', name:'', type:'buff', description:'', icon:'🃏', rarity:'Common', effectsJson:'[{"type":"attack_boost","value":20}]' });

  const handleAuth = () => {
    socket?.emit('admin_auth', { password }, (res: any) => {
      if (res.success) { setAuthed(true); setPwError(''); }
      else setPwError('Wrong password');
    });
  };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const createCreature = () => {
    const creature = { ...cForm, baseHp: Number(cForm.baseHp), baseAttack: Number(cForm.baseAttack), baseSpeed: Number(cForm.baseSpeed), skillIds: cForm.skillIds.split(',').map(s=>s.trim()).slice(0,3) as [string,string,string], image: cForm.image || `/sprites/${cForm.id}.png` };
    socket?.emit('admin_create_creature', { password, creature }, (r: any) => { r.success ? flash('Creature created!') : flash(r.message); });
  };

  const createSkill = () => {
    const skill: any = { ...sForm, power: Number(sForm.power), cooldown: Number(sForm.cooldown), defaultWeight: Number(sForm.defaultWeight) };
    if (sForm.duration) skill.duration = Number(sForm.duration);
    if (sForm.buffType) { skill.buffType = sForm.buffType; skill.buffValue = Number(sForm.buffValue); }
    socket?.emit('admin_create_skill', { password, skill }, (r: any) => { r.success ? flash('Skill created!') : flash(r.message); });
  };

  const createTalent = () => {
    const talent = { id: tForm.id, name: tForm.name, description: tForm.description, icon: tForm.icon, rarity: tForm.rarity, effect: { type: tForm.effectType, stat: tForm.stat || undefined, value: Number(tForm.value) } };
    socket?.emit('admin_create_talent', { password, talent }, (r: any) => { r.success ? flash('Talent created!') : flash(r.message); });
  };

  const createSupport = () => {
    let effects = [];
    try { effects = JSON.parse(scForm.effectsJson); } catch { flash('Invalid effects JSON'); return; }
    const card = { ...scForm, effects };
    socket?.emit('admin_create_support', { password, card }, (r: any) => { r.success ? flash('Support card created!') : flash(r.message); });
  };

  const handleDelete = (type: string, id: string) => {
    if (!confirm(`Delete ${id}?`)) return;
    socket?.emit('admin_delete', { password, type, id }, (r: any) => { r.success ? flash('Deleted!') : flash(r.message); });
  };

  if (!authed) {
    return (
      <div className="page-container" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div className="admin-login-card">
          <div className="admin-login-icon">🔐</div>
          <h2 className="admin-login-title">ADMIN ACCESS</h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginBottom:24 }}>Enter the admin password to manage game data</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()}
            placeholder="Enter password..." className="admin-input" style={{ width:'100%', marginBottom:16, textAlign:'center', fontSize:'1.1rem' }} autoFocus />
          {pwError && <div style={{ color:'var(--red-combat)', marginBottom:12, fontSize:'0.85rem' }}>{pwError}</div>}
          <button className="btn btn-primary btn-large" style={{ width:'100%' }} onClick={handleAuth}>AUTHENTICATE</button>
        </div>
      </div>
    );
  }

  const inputStyle = "admin-input";
  const labelStyle: React.CSSProperties = { fontFamily:'var(--font-stat)', fontSize:'0.6rem', color:'var(--text-muted)', letterSpacing:'0.1em', marginBottom:4, display:'block' };

  return (
    <div className="page-container" style={{ padding:'20px', maxWidth:1200, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:32, paddingTop:20 }}>
        <div style={{ fontSize:'0.65rem', color:'var(--gold)', letterSpacing:'0.2em', fontFamily:'var(--font-stat)' }}>⚙️ ADMIN PANEL</div>
        <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'2rem', color:'var(--text-primary)', marginTop:8 }}>Game Data Manager</h1>
        {msg && <div className="admin-flash">{msg}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:24, flexWrap:'wrap' }}>
        {(['creatures','skills','talents','support'] as const).map(t => (
          <button key={t} className={`btn ${tab===t?'btn-primary':'btn-secondary'}`} onClick={()=>setTab(t)}>
            {t==='creatures'?'🐾 Creatures':t==='skills'?'⚔️ Skills':t==='talents'?'✨ Talents':'🃏 Support'}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        {/* CREATE FORM */}
        <div className="admin-panel-card">
          <h3 className="admin-panel-title">CREATE NEW {tab.toUpperCase()}</h3>
          
          {tab === 'creatures' && (
            <div className="admin-form">
              <label style={labelStyle}>ID</label><input className={inputStyle} value={cForm.id} onChange={e=>setCForm({...cForm,id:e.target.value})} placeholder="unique_id" />
              <label style={labelStyle}>NAME</label><input className={inputStyle} value={cForm.name} onChange={e=>setCForm({...cForm,name:e.target.value})} placeholder="Creature Name" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>TYPE</label><select className={inputStyle} value={cForm.type} onChange={e=>setCForm({...cForm,type:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>BACKGROUND</label><select className={inputStyle} value={cForm.backgroundType} onChange={e=>setCForm({...cForm,backgroundType:e.target.value})}>{BG_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>HP</label><input className={inputStyle} type="number" value={cForm.baseHp} onChange={e=>setCForm({...cForm,baseHp:+e.target.value})} /></div>
                <div><label style={labelStyle}>ATK</label><input className={inputStyle} type="number" value={cForm.baseAttack} onChange={e=>setCForm({...cForm,baseAttack:+e.target.value})} /></div>
                <div><label style={labelStyle}>SPD</label><input className={inputStyle} type="number" value={cForm.baseSpeed} onChange={e=>setCForm({...cForm,baseSpeed:+e.target.value})} /></div>
              </div>
              <label style={labelStyle}>SKILL IDS (comma-sep)</label><input className={inputStyle} value={cForm.skillIds} onChange={e=>setCForm({...cForm,skillIds:e.target.value})} placeholder="skill1,skill2,skill3" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>EMOJI</label><input className={inputStyle} value={cForm.emoji} onChange={e=>setCForm({...cForm,emoji:e.target.value})} /></div>
                <div><label style={labelStyle}>RARITY</label><select className={inputStyle} value={cForm.rarity} onChange={e=>setCForm({...cForm,rarity:e.target.value})}>{RARITIES.map(r=><option key={r}>{r}</option>)}</select></div>
              </div>
              <label style={labelStyle}>DESCRIPTION</label><textarea className={inputStyle} value={cForm.description} onChange={e=>setCForm({...cForm,description:e.target.value})} rows={2} />
              <button className="btn btn-primary" style={{ width:'100%', marginTop:12 }} onClick={createCreature}>CREATE CREATURE</button>
            </div>
          )}

          {tab === 'skills' && (
            <div className="admin-form">
              <label style={labelStyle}>ID</label><input className={inputStyle} value={sForm.id} onChange={e=>setSForm({...sForm,id:e.target.value})} placeholder="unique_id" />
              <label style={labelStyle}>NAME</label><input className={inputStyle} value={sForm.name} onChange={e=>setSForm({...sForm,name:e.target.value})} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>TYPE</label><select className={inputStyle} value={sForm.type} onChange={e=>setSForm({...sForm,type:e.target.value})}>{[...TYPES,'Neutral'].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label style={labelStyle}>EFFECT</label><select className={inputStyle} value={sForm.effect} onChange={e=>setSForm({...sForm,effect:e.target.value})}>{EFFECTS.map(e=><option key={e}>{e}</option>)}</select></div>
                <div><label style={labelStyle}>RARITY</label><select className={inputStyle} value={sForm.rarity} onChange={e=>setSForm({...sForm,rarity:e.target.value})}>{RARITIES.map(r=><option key={r}>{r}</option>)}</select></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>POWER</label><input className={inputStyle} type="number" value={sForm.power} onChange={e=>setSForm({...sForm,power:+e.target.value})} /></div>
                <div><label style={labelStyle}>CD</label><input className={inputStyle} type="number" value={sForm.cooldown} onChange={e=>setSForm({...sForm,cooldown:+e.target.value})} /></div>
                <div><label style={labelStyle}>WEIGHT</label><input className={inputStyle} type="number" value={sForm.defaultWeight} onChange={e=>setSForm({...sForm,defaultWeight:+e.target.value})} /></div>
                <div><label style={labelStyle}>ICON</label><input className={inputStyle} value={sForm.icon} onChange={e=>setSForm({...sForm,icon:e.target.value})} /></div>
              </div>
              {(sForm.effect === 'buff' || sForm.effect === 'debuff' || sForm.effect === 'dot') && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <div><label style={labelStyle}>DURATION</label><input className={inputStyle} type="number" value={sForm.duration} onChange={e=>setSForm({...sForm,duration:+e.target.value})} /></div>
                  <div><label style={labelStyle}>BUFF TYPE</label><select className={inputStyle} value={sForm.buffType} onChange={e=>setSForm({...sForm,buffType:e.target.value})}><option value="">None</option>{BUFF_TYPES.map(b=><option key={b}>{b}</option>)}</select></div>
                  <div><label style={labelStyle}>BUFF VAL</label><input className={inputStyle} type="number" value={sForm.buffValue} onChange={e=>setSForm({...sForm,buffValue:+e.target.value})} /></div>
                </div>
              )}
              <label style={labelStyle}>DESCRIPTION</label><textarea className={inputStyle} value={sForm.description} onChange={e=>setSForm({...sForm,description:e.target.value})} rows={2} />
              <button className="btn btn-primary" style={{ width:'100%', marginTop:12 }} onClick={createSkill}>CREATE SKILL</button>
            </div>
          )}

          {tab === 'talents' && (
            <div className="admin-form">
              <label style={labelStyle}>ID</label><input className={inputStyle} value={tForm.id} onChange={e=>setTForm({...tForm,id:e.target.value})} />
              <label style={labelStyle}>NAME</label><input className={inputStyle} value={tForm.name} onChange={e=>setTForm({...tForm,name:e.target.value})} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>EFFECT</label><select className={inputStyle} value={tForm.effectType} onChange={e=>setTForm({...tForm,effectType:e.target.value})}>{TALENT_EFFECTS.map(e=><option key={e}>{e}</option>)}</select></div>
                <div><label style={labelStyle}>VALUE</label><input className={inputStyle} type="number" value={tForm.value} onChange={e=>setTForm({...tForm,value:+e.target.value})} /></div>
                <div><label style={labelStyle}>ICON</label><input className={inputStyle} value={tForm.icon} onChange={e=>setTForm({...tForm,icon:e.target.value})} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>STAT (optional)</label><input className={inputStyle} value={tForm.stat} onChange={e=>setTForm({...tForm,stat:e.target.value})} placeholder="hp/attack/speed" /></div>
                <div><label style={labelStyle}>RARITY</label><select className={inputStyle} value={tForm.rarity} onChange={e=>setTForm({...tForm,rarity:e.target.value})}>{RARITIES.map(r=><option key={r}>{r}</option>)}</select></div>
              </div>
              <label style={labelStyle}>DESCRIPTION</label><textarea className={inputStyle} value={tForm.description} onChange={e=>setTForm({...tForm,description:e.target.value})} rows={2} />
              <button className="btn btn-primary" style={{ width:'100%', marginTop:12 }} onClick={createTalent}>CREATE TALENT</button>
            </div>
          )}

          {tab === 'support' && (
            <div className="admin-form">
              <label style={labelStyle}>ID</label><input className={inputStyle} value={scForm.id} onChange={e=>setScForm({...scForm,id:e.target.value})} />
              <label style={labelStyle}>NAME</label><input className={inputStyle} value={scForm.name} onChange={e=>setScForm({...scForm,name:e.target.value})} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div><label style={labelStyle}>TYPE</label><select className={inputStyle} value={scForm.type} onChange={e=>setScForm({...scForm,type:e.target.value})}><option>buff</option><option>behavior</option><option>special</option></select></div>
                <div><label style={labelStyle}>ICON</label><input className={inputStyle} value={scForm.icon} onChange={e=>setScForm({...scForm,icon:e.target.value})} /></div>
                <div><label style={labelStyle}>RARITY</label><select className={inputStyle} value={scForm.rarity} onChange={e=>setScForm({...scForm,rarity:e.target.value})}>{RARITIES.map(r=><option key={r}>{r}</option>)}</select></div>
              </div>
              <label style={labelStyle}>EFFECTS (JSON)</label><textarea className={inputStyle} value={scForm.effectsJson} onChange={e=>setScForm({...scForm,effectsJson:e.target.value})} rows={3} style={{ fontFamily:'monospace', fontSize:'0.75rem' }} />
              <label style={labelStyle}>DESCRIPTION</label><textarea className={inputStyle} value={scForm.description} onChange={e=>setScForm({...scForm,description:e.target.value})} rows={2} />
              <button className="btn btn-primary" style={{ width:'100%', marginTop:12 }} onClick={createSupport}>CREATE SUPPORT CARD</button>
            </div>
          )}
        </div>

        {/* EXISTING DATA LIST */}
        <div className="admin-panel-card">
          <h3 className="admin-panel-title">EXISTING {tab.toUpperCase()} ({
            tab==='creatures'? gameData?.creatures?.length||0 :
            tab==='skills'? gameData?.skills?.length||0 :
            tab==='talents'? gameData?.talents?.length||0 :
            gameData?.supportCards?.length||0
          })</h3>
          <div style={{ maxHeight:600, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {tab==='creatures' && gameData?.creatures?.map((c: any) => (
              <div key={c.id} className="admin-data-row">
                <div className="admin-data-sprite">{c.image && !c.image.includes('/assets/') ? <img src={c.image} alt={c.name} style={{ width:36,height:36,objectFit:'contain' }} /> : <span style={{fontSize:'1.5rem'}}>{c.emoji}</span>}</div>
                <div style={{ flex:1 }}>
                  <div className="admin-data-name">{c.name}</div>
                  <div style={{ display:'flex', gap:4 }}><span className={`type-badge type-${c.type.toLowerCase()}`}>{c.type}</span><span className={`rarity-badge rarity-${c.rarity.toLowerCase()}`}>{c.rarity}</span></div>
                </div>
                <div style={{ fontFamily:'var(--font-stat)', fontSize:'0.6rem', color:'var(--text-muted)' }}>❤️{c.baseHp} ⚔️{c.baseAttack}</div>
                <button className="btn btn-danger" style={{ padding:'2px 8px', fontSize:'0.6rem' }} onClick={()=>handleDelete('creatures',c.id)}>✕</button>
              </div>
            ))}
            {tab==='skills' && gameData?.skills?.map((s: any) => (
              <div key={s.id} className="admin-data-row">
                <span style={{ fontSize:'1.3rem', width:32, textAlign:'center' }}>{s.icon}</span>
                <div style={{ flex:1 }}>
                  <div className="admin-data-name">{s.name}</div>
                  <div style={{ display:'flex', gap:4 }}><span className={`type-badge type-${s.type.toLowerCase()}`}>{s.type}</span><span className="skill-chip power">⚡{s.power}</span></div>
                </div>
                <button className="btn btn-danger" style={{ padding:'2px 8px', fontSize:'0.6rem' }} onClick={()=>handleDelete('skills',s.id)}>✕</button>
              </div>
            ))}
            {tab==='talents' && gameData?.talents?.map((t: any) => (
              <div key={t.id} className="admin-data-row">
                <span style={{ fontSize:'1.3rem', width:32, textAlign:'center' }}>{t.icon}</span>
                <div style={{ flex:1 }}><div className="admin-data-name">{t.name}</div><div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{t.description}</div></div>
                <button className="btn btn-danger" style={{ padding:'2px 8px', fontSize:'0.6rem' }} onClick={()=>handleDelete('talents',t.id)}>✕</button>
              </div>
            ))}
            {tab==='support' && gameData?.supportCards?.map((c: any) => (
              <div key={c.id} className="admin-data-row">
                <span style={{ fontSize:'1.3rem', width:32, textAlign:'center' }}>{c.icon}</span>
                <div style={{ flex:1 }}><div className="admin-data-name">{c.name}</div><div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{c.description}</div></div>
                <button className="btn btn-danger" style={{ padding:'2px 8px', fontSize:'0.6rem' }} onClick={()=>handleDelete('supportCards',c.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
