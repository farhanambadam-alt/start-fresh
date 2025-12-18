/**
 * Game Lobby Component
 * 
 * Handles room creation, joining, and waiting room UI.
 * All state comes from server - we only send intents.
 */

import React, { useState } from 'react';
import { Users, Plus, LogIn, Loader2, Copy, Check, Wifi, WifiOff } from 'lucide-react';
import { useGameStore, useMyColor } from '@/state/gameState';
import { generateRoomCode } from '@/network/gameSocket';
import { PlayerColor } from '@/data/ludoData';

const PLAYER_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

const COLOR_STYLES: Record<PlayerColor, { bg: string; border: string; text: string }> = {
  red: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
};

interface GameLobbyProps {
  onJoinRoom: (roomCode: string) => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({ onJoinRoom }) => {
  const { connectionState, gameState, error } = useGameStore();
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const myColor = useMyColor();
  const userId = useGameStore((s) => s.userId);
  const isWaiting = gameState?.phase === 'WAITING';
  const players = gameState?.players ?? [];

  const handleCopyRoomId = async () => {
    if (gameState?.roomCode) {
      await navigator.clipboard.writeText(gameState.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Create a new room with a generated code
  const handleCreateRoom = () => {
    setIsCreating(true);
    const newRoomCode = generateRoomCode();
    onJoinRoom(newRoomCode);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length >= 4) {
      setIsCreating(false);
      onJoinRoom(roomCode.toUpperCase());
    }
  };

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
      connectionState === 'connected' ? 'bg-green-500/20 text-green-400' :
      connectionState === 'connecting' || connectionState === 'reconnecting' ? 'bg-yellow-500/20 text-yellow-400' :
      'bg-red-500/20 text-red-400'
    }`}>
      {connectionState === 'connected' ? <Wifi size={14} /> : 
       connectionState === 'connecting' || connectionState === 'reconnecting' ? <Loader2 size={14} className="animate-spin" /> : 
       <WifiOff size={14} />}
      <span className="capitalize">{connectionState}</span>
    </div>
  );

  // Waiting Room View
  if (isWaiting && gameState?.roomCode) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Waiting Room</h1>
              <p className="text-muted-foreground text-sm">Share the room code with friends</p>
            </div>
            <ConnectionIndicator />
          </div>

          {/* Room Code */}
          <div className="bg-secondary/50 rounded-xl p-4 mb-6">
            <p className="text-xs text-muted-foreground mb-2">Room Code</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-mono font-bold text-foreground tracking-wider flex-1">
                {gameState.roomCode}
              </span>
              <button
                onClick={handleCopyRoomId}
                className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors"
              >
                {copied ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <Copy size={20} className="text-primary" />
                )}
              </button>
            </div>
          </div>

          {/* Players */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Users size={16} />
              Players ({players.length}/4)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PLAYER_COLORS.map((color) => {
                const player = players.find(p => p.color === color);
                const isMe = player?.id === userId;
                const styles = COLOR_STYLES[color];
                
                return (
                  <div
                    key={color}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      player 
                        ? `${styles.bg} ${styles.border}` 
                        : 'bg-secondary/30 border-border border-dashed opacity-50'
                    }`}
                  >
                    <span className={`font-medium capitalize ${player ? styles.text : 'text-muted-foreground'}`}>
                      {color} {isMe && '(You)'}
                    </span>
                    {player && !player.connected && (
                      <span className="text-xs text-muted-foreground block">Reconnecting...</span>
                    )}
                    {!player && (
                      <span className="text-xs text-muted-foreground block">Waiting...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Start hint */}
          <p className="text-center text-muted-foreground text-sm">
            {players.length >= 2 
              ? 'Waiting for host to start the game...'
              : 'Need at least 2 players to start'}
          </p>
        </div>
      </div>
    );
  }

  // Main Lobby View - Create or Join a room
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Ludo
          </h1>
          <p className="text-muted-foreground">Multiplayer Board Game</p>
        </div>

        {/* Create Room Button */}
        <button
          onClick={handleCreateRoom}
          disabled={connectionState === 'connecting'}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mb-6 shadow-lg"
        >
          {connectionState === 'connecting' && isCreating ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Creating Room...
            </>
          ) : (
            <>
              <Plus size={20} />
              Create New Room
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-sm">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Join Game Form */}
        <form onSubmit={handleJoinRoom}>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <LogIn size={20} />
            Join Existing Game
          </h2>
          
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter Room Code"
            maxLength={6}
            className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground font-mono text-lg tracking-wider text-center mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          
          <button
            type="submit"
            disabled={roomCode.length < 4 || connectionState === 'connecting'}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {connectionState === 'connecting' && !isCreating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Join Room
              </>
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/20 border border-destructive text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Connection Status */}
        <div className="mt-6 flex justify-center">
          <ConnectionIndicator />
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
