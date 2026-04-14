# 🐾 Primal Duels: Strategy Arena

Welcome to **Primal Duels**, a strategy-first, turn-based auto-battler where you don't just play cards — you design the instincts of legendary creatures.

## ⚔️ Quick Start

To get the complete game running locally:

### 1. Install Dependencies
From the project root, run:
```bash
npm run install:all
```
This will install all required packages for both the Frontend and the Backend.

### 2. Start the Backend (Game Server)
In a new terminal:
```bash
npm run dev:server
```
The server will start on `http://localhost:3001`.

### 3. Start the Frontend (Game Client)
In another terminal:
```bash
npm run dev:client
```
The game will be available at `http://localhost:5173`.

---

## 🧩 Core Gameplay Mechanics

### 🐾 Strategic Deployment
Before the battle, select **6 creatures** and arrange them in your preferred **Spawn Order**. When one creature falls, the next one in line joins the arena.

### ⚙️ Instinct Configuration
*   **Skill Weights**: For each creature, you can configure the frequency (10% - 80%) of their 3 unique skills. Strategy wins. Not luck.
*   **Talents**: Assign up to **2 talents** per creature (e.g., First Strike, Poison on Hit, Lifesteal) to define their combat behavior.
*   **Support Cards**: Attach non-deployable support cards to provide passive buffs or specialized modifications.

### ⚔️ Auto-Battle Engine
Once the arena opens, the game is fully automated. The battle engine processes turns every **2 seconds** (20 ticks), executing skills based on your pre-set weights and timing.

---

## 🛠️ Technology Stack
*   **Frontend**: React + TypeScript + Vite + Socket.io-client
*   **Backend**: Node.js + Express + Socket.io + tsx (for local dev)
*   **Battle Logic**: Deterministic seeded RNG engine for fair, repeatable combat simulations.

---

## 🤖 Development
*   **Shared Types**: All game models and network payloads are defined in `/shared/types.ts`.
*   **Creature Roster**: Edit `/server/src/data/creatures.ts` to add new animals or balance stats.
*   **Skill Library**: Edit `/server/src/data/skills.ts` to modify skill effects and power.
