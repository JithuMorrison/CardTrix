// ==========================================
// PRIMAL DUELS: STRATEGY ARENA — Shared Types
// ==========================================

// ---- Enums ----

export type CreatureType = 'Fire' | 'Water' | 'Air' | 'Earth' | 'Shadow' | 'Divine';
export type BackgroundType = 'Volcano' | 'Ocean' | 'Sky' | 'Jungle' | 'Abyss' | 'Heaven';
export type SkillEffect = 'damage' | 'heal' | 'buff' | 'debuff' | 'dot' | 'shield';
export type BuffType = 'attack' | 'speed' | 'defense' | 'regen' | 'damage_reduction';
export type GamePhase = 'waiting' | 'setup' | 'battle' | 'ended';
export type Rarity = 'Common' | 'Rare' | 'SuperRare' | 'Epic' | 'Mythic' | 'Legendary' | 'UltraLegendary' | 'Heroic';
export type SupportCardType = 'buff' | 'behavior' | 'special';

// ---- Creature Definitions ----

export interface CreatureDef {
  id: string;
  name: string;
  type: CreatureType;
  backgroundType: BackgroundType;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;     // damage reduction stat
  baseSpeed: number;       // lower = faster (ticks between turns)
  skillIds: [string, string, string]; // exactly 3 skills
  description: string;
  image: string;
  rarity: Rarity;
  emoji: string;           // visual placeholder until real images are added
}

// ---- Skill Definitions ----

export interface SkillDef {
  id: string;
  name: string;
  type: CreatureType | 'Neutral';
  effect: SkillEffect;
  power: number;
  cooldown: number;        // in turns (1 turn = 2s)
  defaultWeight: number;   // 10-80, default frequency weight
  duration?: number;       // turns for buffs/debuffs/dots
  buffType?: BuffType;
  buffValue?: number;
  description: string;
  icon: string;
  rarity: Rarity;
  allowedCreatureIds?: string[];
}

// ---- Talent Definitions ----

export type TalentEffectType =
  | 'first_strike'
  | 'stat_boost'
  | 'on_hit_shield'
  | 'on_hit_heal'
  | 'berserker_attack'
  | 'passive_regen'
  | 'damage_reduction'
  | 'on_death_burst'
  | 'poison_on_hit'
  | 'lifesteal';

export interface TalentDef {
  id: string;
  name: string;
  description: string;
  effect: {
    type: TalentEffectType;
    stat?: string;
    value: number;
  };
  icon: string;
  rarity: Rarity;
}

// ---- Support Card Definitions ----

export interface SupportCardDef {
  id: string;
  name: string;
  type: SupportCardType;
  description: string;
  icon: string;
  rarity: Rarity;
  effects: SupportEffect[];
}

export interface SupportEffect {
  type: 'attack_boost' | 'speed_boost' | 'hp_boost' | 'defense_boost' | 'poison_on_hit' | 'lifesteal'
       | 'damage_reflect' | 'cooldown_reduce' | 'weight_shift';
  value: number;
  skillIndex?: number; // for weight_shift: which skill (0,1,2)
}

// ---- Battle State ----

export interface BattleCreature {
  id: string;              // unique instance ID
  defId: string;
  ownerId: string;
  name: string;
  type: CreatureType;
  backgroundType: BackgroundType;
  spawnOrder: number;      // 1-6, determines spawn sequence

  // Current stats
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;         // damage reduction stat
  speed: number;           // ticks between turns

  // Skills + config
  skills: BattleSkill[];   // exactly 3 skills
  talents: string[];       // up to 2 talent IDs
  supportCardId: string | null;

  // Combat state
  isAlive: boolean;
  buffs: ActiveBuff[];
  image: string;
  emoji: string;

  // Tick tracking
  attackTimerTicks: number; // ticks remaining until next attack
}

export interface BattleSkill {
  defId: string;
  name: string;
  cooldownRemaining: number; // turns remaining
  cooldown: number;          // base cooldown (turns)
  weight: number;            // configured frequency weight (10-80)
  effect: SkillEffect;
  power: number;
  type: CreatureType | 'Neutral';
  duration?: number;
  buffType?: BuffType;
  buffValue?: number;
  icon: string;
}

export interface ActiveBuff {
  id: string;
  type: BuffType | 'dot' | 'shield';
  value: number;
  remainingTurns: number;
  sourceId: string;
}

// ---- Player Battle State ----

export interface PlayerBattleState {
  playerId: string;
  playerName: string;
  isBot: boolean;

  activeCombatant: BattleCreature | null; // currently fighting creature
  spawnQueue: BattleCreature[];           // waiting to spawn (ordered)
  deadCreatures: BattleCreature[];        // fallen creatures

  totalCreatures: number;   // always 6
  creaturesAlive: number;
}

// ---- Game State (broadcast to clients) ----

export interface GameState {
  roomId: string;
  tick: number;
  phase: GamePhase;
  players: { [playerId: string]: PlayerBattleState };
  combatLog: CombatEvent[];
  winner?: string;
  matchTimer: number;
  roundNumber: number;
  rngSeed: number;
}

// ---- Combat Events (for animations) ----

export interface CombatEvent {
  tick: number;
  type: 'skill_used' | 'damage_dealt' | 'heal' | 'buff_applied' | 'debuff_applied'
       | 'creature_died' | 'creature_spawned' | 'dot_tick' | 'shield_applied'
       | 'battle_start' | 'battle_end' | 'round_start';
  sourceId?: string;
  targetId?: string;
  skillName?: string;
  skillIcon?: string;
  value?: number;
  rawDamage?: number;
  mitigated?: number;
  explanation?: string;
  attackerBuffs?: string;
  effectType?: string;
  attackerId?: string;
  defenderId?: string;
}

// ---- Deck Config (sent during matchmaking) ----

export interface DeckConfig {
  creatures: DeckCreature[];  // exactly 6, ordered 1→6
  isBotDeck?: boolean;
}

export interface DeckCreature {
  defId: string;
  skillIds: [string, string, string];
  skillWeights: [number, number, number];
  talentIds: [string | null, string | null];
  supportCardId: string | null;
}

// ---- Socket Event Payloads ----

export interface JoinQueuePayload {
  playerId: string;
  playerName: string;
  deck: DeckConfig;
}

export interface JoinBotPayload {
  playerId: string;
  playerName: string;
  deck: DeckConfig;
}

// ---- Player Profile ----

export interface PlayerProfile {
  id: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  unlockedCreatures: string[];
  unlockedSkills: string[];
  unlockedTalents: string[];
  unlockedSupportCards: string[];
  shards: { [defId: string]: number };
  lootBoxStats: {
    boxesOpened: number;
    pityCounters: Record<string, number>;
  };
  essence: number;
  totalWins: number;
  totalLosses: number;
  experience: number;
  level: number;
  coins: number;
  powerPoints: number;                        // currency for upgrading creatures
  creatureLevels: Record<string, number>;     // creature defId -> level (1-11)
  dailyMatchesPlayed: number;                 // reset daily, max 5 give rewards
  lastMatchDate: string;                      // ISO date string for daily reset
}
