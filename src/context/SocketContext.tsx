import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, PlayerProfile, CombatEvent, DeckConfig } from '../../shared/types';

const SERVER_URL = 'http://localhost:3001';

interface GameData {
  creatures: any[];
  skills: any[];
  talents: any[];
  supportCards: any[];
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  playerId: string;
  playerName: string;
  profile: PlayerProfile | null;
  gameData: GameData | null;
  gameState: GameState | null;
  inQueue: boolean;
  inBattle: boolean;
  matchFound: boolean;
  opponentName: string;
  isBot: boolean;
  battleEvents: CombatEvent[];
  joinQueue: (deck: DeckConfig) => void;
  joinBot: (deck: DeckConfig) => void;
  leaveQueue: () => void;
  setPlayerName: (name: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocketContext() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider');
  return ctx;
}

function generatePlayerId(): string {
  let id = localStorage.getItem('primalduels_player_id');
  if (!id) {
    id = 'player_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('primalduels_player_id', id);
  }
  return id;
}

function getPlayerName(): string {
  return localStorage.getItem('primalduels_player_name') || 'Commander';
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [playerId] = useState(generatePlayerId);
  const [playerName, setPlayerNameState] = useState(getPlayerName);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [inQueue, setInQueue] = useState(false);
  const [inBattle, setInBattle] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [isBot, setIsBot] = useState(false);
  const [battleEvents, setBattleEvents] = useState<CombatEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected');
      socket.emit('get_profile', { playerId, playerName }, (data: PlayerProfile) => setProfile(data));
      socket.emit('get_game_data', {}, (data: GameData) => setGameData(data));
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('queue_joined', () => setInQueue(true));
    socket.on('queue_left', () => setInQueue(false));

    socket.on('match_found', (data: { roomId: string; opponentName: string; yourId: string; isBot?: boolean }) => {
      console.log('[Match] Found!', data);
      setMatchFound(true);
      setOpponentName(data.opponentName);
      setIsBot(data.isBot === true);
      setInQueue(false);
    });

    socket.on('game_start', (data: { state: GameState }) => {
      console.log('[Game] Started!', data);
      setGameState(data.state);
      setInBattle(true);
      setMatchFound(false);
    });

    socket.on('game_state_update', (data: any) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tick: data.tick,
          players: data.players,
          matchTimer: data.matchTimer,
          phase: data.phase,
          roundNumber: data.roundNumber ?? prev.roundNumber,
        };
      });
      if (data.events && data.events.length > 0) {
        setBattleEvents(data.events);
      }
    });

    socket.on('game_end', (data: { winner: string; state: GameState; rewards: any }) => {
      setGameState(data.state);
      // Keep inBattle true so result screen shows
    });

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket Error]', data.message);
    });

    return () => { socket.disconnect(); };
  }, [playerId, playerName]);

  const setPlayerName = useCallback((name: string) => {
    localStorage.setItem('primalduels_player_name', name);
    setPlayerNameState(name);
  }, []);

  const joinQueue = useCallback((deck: DeckConfig) => {
    socketRef.current?.emit('join_queue', { playerId, playerName, deck });
  }, [playerId, playerName]);

  const joinBot = useCallback((deck: DeckConfig) => {
    socketRef.current?.emit('join_bot', { playerId, playerName, deck });
  }, [playerId, playerName]);

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit('leave_queue', { playerId });
    setInQueue(false);
  }, [playerId]);

  const value: SocketContextType = {
    socket: socketRef.current,
    connected,
    playerId,
    playerName,
    profile,
    gameData,
    gameState,
    inQueue,
    inBattle,
    matchFound,
    opponentName,
    isBot,
    battleEvents,
    joinQueue,
    joinBot,
    leaveQueue,
    setPlayerName,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
