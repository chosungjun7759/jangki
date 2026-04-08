/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---
type Team = 'cho' | 'han';
type PieceType = 'rook' | 'knight' | 'elephant' | 'cannon' | 'guard' | 'king' | 'pawn';

interface PieceData {
  type: PieceType;
  emoji: string;
  color: Team;
  desc: string;
}

type BoardState = (PieceData | null)[];

const ROWS = 10;
const COLS = 9;
const BOARD_SIZE = ROWS * COLS;

const PIECE_VALUE: Record<PieceType, number> = {
  pawn: 2,
  knight: 5,
  elephant: 3,
  rook: 13,
  cannon: 7,
  guard: 3,
  king: 1000
};

const DESC: Record<Team, Record<PieceType, string>> = {
  cho: {
    rook: "차(車)! 십자 방향으로 쌩쌩 끝까지 달려요!",
    knight: "마(馬)! 한 칸 직진 후 대각선으로 폴짝!",
    elephant: "상(象)! 한 칸 직진 후 대각선으로 두 칸 쑥쑥!",
    cannon: "포(包)! 다른 말을 훌쩍 뛰어넘어 공격해요!",
    guard: "사(士)! 궁성 안에서 왕을 지켜요.",
    king: "초(楚)! 왕입니다. 잡히면 져요!",
    pawn: "졸(卒)! 앞으로, 양옆으로 한 칸씩 진격!"
  },
  han: {
    rook: "차(車)! 십자 방향으로 쌩쌩 끝까지 달려요!",
    knight: "마(馬)! 한 칸 직진 후 대각선으로 폴짝!",
    elephant: "상(象)! 한 칸 직진 후 대각선으로 두 칸 쑥쑥!",
    cannon: "포(包)! 다른 말을 훌쩍 뛰어넘어 공격해요!",
    guard: "사(士)! 궁성 안에서 왕을 지켜요.",
    king: "한(漢)! 왕입니다. 잡히면 져요!",
    pawn: "병(兵)! 앞으로, 양옆으로 한 칸씩 진격!"
  }
};

export default function App() {
  const [board, setBoard] = useState<BoardState>(Array(BOARD_SIZE).fill(null));
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [moveCells, setMoveCells] = useState<number[]>([]);
  const [capCells, setCapCells] = useState<number[]>([]);
  const [gameMode, setGameMode] = useState<'none' | 'tutorial' | 'match'>('none');
  const [gameDiff, setGameDiff] = useState<string>('');
  const [turn, setTurn] = useState<Team | ''>('cho');
  const [gameOver, setGameOver] = useState(false);
  const [tutorialText, setTutorialText] = useState('모드를 골라주세요!');
  const [showDiffOptions, setShowDiffOptions] = useState(false);
  const [bgmActive, setBgmActive] = useState(false);
  const [curVideoId, setCurVideoId] = useState('iQIkgz9P-nM');
  const [capturingIdx, setCapturingIdx] = useState<number | null>(null);

  const ytPlayerRef = useRef<any>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // --- YouTube API ---
  useEffect(() => {
    const onPlayerReady = () => {
      // Player is ready
    };

    const initPlayer = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        ytPlayerRef.current = new (window as any).YT.Player('youtube-player', {
          height: '0',
          width: '0',
          videoId: curVideoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 0, loop: 1, playlist: curVideoId },
          events: {
            onReady: onPlayerReady
          }
        });
      }
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }
  }, []);

  useEffect(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      ytPlayerRef.current.loadVideoById(curVideoId);
      if (bgmActive) {
        ytPlayerRef.current.playVideo();
      }
    }
  }, [curVideoId]);

  const toggleBgm = () => {
    if (!ytPlayerRef.current || typeof ytPlayerRef.current.playVideo !== 'function') return;
    if (bgmActive) {
      ytPlayerRef.current.pauseVideo();
      setBgmActive(false);
    } else {
      ytPlayerRef.current.playVideo();
      setBgmActive(true);
    }
  };

  // --- Board Fitting ---
  const fitBoard = useCallback(() => {
    const root = document.documentElement;
    const title = document.querySelector('.game-title') as HTMLElement;
    const ctrls = document.querySelector('.music-controls') as HTMLElement;
    const tutBox = document.querySelector('.tutorial-box') as HTMLElement;
    const uiH = (title?.offsetHeight || 0) + (ctrls?.offsetHeight || 0) + (tutBox?.offsetHeight || 0) + 48;
    const availH = window.innerHeight - uiH;
    const availW = window.innerWidth * 0.97;
    const sizeByWidth = availW * (10 / 9);
    const sizeByHeight = availH;
    const boardHeight = Math.floor(Math.min(sizeByWidth, sizeByHeight));
    root.style.setProperty('--board-size', boardHeight + 'px');
  }, []);

  useEffect(() => {
    fitBoard();
    window.addEventListener('resize', fitBoard);
    return () => window.removeEventListener('resize', fitBoard);
  }, [fitBoard]);

  // --- Game Logic ---
  const makeSetup = useCallback(() => {
    const state: BoardState = Array(BOARD_SIZE).fill(null);
    const add = (r: number, c: number, type: PieceType, emoji: string, color: Team) => {
      state[r * COLS + c] = { type, emoji, color, desc: DESC[color][type] };
    };

    // 초나라(파란색, 위쪽)
    add(0, 0, 'rook', '車', 'cho'); add(0, 1, 'knight', '馬', 'cho'); add(0, 2, 'elephant', '象', 'cho'); add(0, 3, 'guard', '士', 'cho'); add(0, 5, 'guard', '士', 'cho'); add(0, 6, 'elephant', '象', 'cho'); add(0, 7, 'knight', '馬', 'cho'); add(0, 8, 'rook', '車', 'cho');
    add(1, 4, 'king', '楚', 'cho');
    add(2, 1, 'cannon', '包', 'cho'); add(2, 7, 'cannon', '包', 'cho');
    add(3, 0, 'pawn', '卒', 'cho'); add(3, 2, 'pawn', '卒', 'cho'); add(3, 4, 'pawn', '卒', 'cho'); add(3, 6, 'pawn', '卒', 'cho'); add(3, 8, 'pawn', '卒', 'cho');

    // 한나라(빨간색, 아래쪽)
    add(9, 0, 'rook', '車', 'han'); add(9, 1, 'knight', '馬', 'han'); add(9, 2, 'elephant', '象', 'han'); add(9, 3, 'guard', '士', 'han'); add(9, 5, 'guard', '士', 'han'); add(9, 6, 'elephant', '象', 'han'); add(9, 7, 'knight', '馬', 'han'); add(9, 8, 'rook', '車', 'han');
    add(8, 4, 'king', '漢', 'han');
    add(7, 1, 'cannon', '包', 'han'); add(7, 7, 'cannon', '包', 'han');
    add(6, 0, 'pawn', '兵', 'han'); add(6, 2, 'pawn', '兵', 'han'); add(6, 4, 'pawn', '兵', 'han'); add(6, 6, 'pawn', '兵', 'han'); add(6, 8, 'pawn', '兵', 'han');

    return state;
  }, []);

  const isKingInCheck = useCallback((color: Team, state: BoardState) => {
    let kingIdx = -1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state[i] && state[i]?.color === color && state[i]?.type === 'king') {
        kingIdx = i;
        break;
      }
    }
    if (kingIdx === -1) return false;
    const opponent = color === 'cho' ? 'han' : 'cho';
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state[i] && state[i]?.color === opponent) {
        const { caps } = calcMoves(i, state);
        if (caps.includes(kingIdx)) return true;
      }
    }
    return false;
  }, []);

  const getFilteredMoves = useCallback((idx: number, state: BoardState) => {
    const piece = state[idx];
    if (!piece) return { moves: [], caps: [] };
    const { moves, caps } = calcMoves(idx, state);
    const filterFn = (to: number) => {
      const sim = [...state];
      sim[to] = sim[idx];
      sim[idx] = null;
      return !isKingInCheck(piece.color, sim);
    };
    return { moves: moves.filter(filterFn), caps: caps.filter(filterFn) };
  }, [isKingInCheck]);

  const calcMoves = useCallback((idx: number, state: BoardState) => {
    const piece = state[idx];
    if (!piece) return { moves: [], caps: [] };
    const moves: number[] = [], caps: number[] = [];
    const r = Math.floor(idx / COLS), c = idx % COLS;
    const ok = (nr: number, nc: number) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS;

    const inPalace = (nr: number, nc: number) => (nr >= 0 && nr <= 2 && nc >= 3 && nc <= 5) || (nr >= 7 && nr <= 9 && nc >= 3 && nc <= 5);
    const isCenter = (nr: number, nc: number) => (nr === 1 && nc === 4) || (nr === 8 && nc === 4);

    const add = (nr: number, nc: number) => {
      if (!ok(nr, nc)) return false;
      const t = state[nr * COLS + nc];
      if (!t) { moves.push(nr * COLS + nc); return true; }
      if (t.color !== piece.color && !(piece.type === 'cannon' && t.type === 'cannon')) caps.push(nr * COLS + nc);
      return false;
    };

    // 1. 차(車)
    if (piece.type === 'rook') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        for (let i = 1; i < 10; i++) if (!add(r + dr * i, c + dc * i)) break;
      });
      if (isCenter(r, c)) {
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
          let nr = r + dr, nc = c + dc; while (inPalace(nr, nc)) { if (!add(nr, nc)) break; nr += dr; nc += dc; }
        });
      } else if (inPalace(r, c)) {
        const cr = r < 5 ? 1 : 8, dr = Math.sign(cr - r), dc = Math.sign(4 - c);
        if (dr !== 0 && dc !== 0) { let nr = r + dr, nc = c + dc; while (inPalace(nr, nc)) { if (!add(nr, nc)) break; nr += dr; nc += dc; } }
      }
    }

    // 2. 포(包)
    if (piece.type === 'cannon') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        let jumped = false;
        for (let i = 1; i < 10; i++) {
          const nr = r + dr * i, nc = c + dc * i; if (!ok(nr, nc)) break;
          const t = state[nr * COLS + nc];
          if (!jumped) {
            if (t) { if (t.type === 'cannon') break; jumped = true; }
          } else {
            if (!t) moves.push(nr * COLS + nc);
            else { if (t.color !== piece.color && t.type !== 'cannon') caps.push(nr * COLS + nc); break; }
          }
        }
      });
      if (inPalace(r, c) && !isCenter(r, c)) {
        const cr = r < 5 ? 1 : 8; const centerPiece = state[cr * COLS + 4];
        if (centerPiece && centerPiece.type !== 'cannon') {
          const oppR = cr + (cr - r), oppC = 4 + (4 - c); const dest = state[oppR * COLS + oppC];
          if (!dest) moves.push(oppR * COLS + oppC);
          else if (dest.color !== piece.color && dest.type !== 'cannon') caps.push(oppR * COLS + oppC);
        }
      }
    }

    // 3. 마(馬)
    if (piece.type === 'knight') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        if (ok(r + dr, c + dc) && !state[(r + dr) * COLS + (c + dc)]) {
          if (dr !== 0) { add(r + dr * 2, c - 1); add(r + dr * 2, c + 1); } else { add(r - 1, c + dc * 2); add(r + 1, c + dc * 2); }
        }
      });
    }

    // 4. 상(象)
    if (piece.type === 'elephant') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        if (ok(r + dr, c + dc) && !state[(r + dr) * COLS + (c + dc)]) {
          if (dr !== 0) {
            if (ok(r + dr * 2, c - 1) && !state[(r + dr * 2) * COLS + (c - 1)]) add(r + dr * 3, c - 2);
            if (ok(r + dr * 2, c + 1) && !state[(r + dr * 2) * COLS + (c + 1)]) add(r + dr * 3, c + 2);
          } else {
            if (ok(r - 1, c + dc * 2) && !state[(r - 1) * COLS + (c + dc * 2)]) add(r - 2, c + dc * 3);
            if (ok(r + 1, c + dc * 2) && !state[(r + 1) * COLS + (c + dc * 2)]) add(r + 2, c + dc * 3);
          }
        }
      });
    }

    // 5. 왕 & 사
    if (piece.type === 'king' || piece.type === 'guard') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => { if (inPalace(r + dr, c + dc)) add(r + dr, c + dc); });
      if (isCenter(r, c)) {
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => add(r + dr, c + dc));
      } else if (inPalace(r, c)) {
        add(r < 5 ? 1 : 8, 4);
      }
    }

    // 6. 졸/병
    if (piece.type === 'pawn') {
      const dir = piece.color === 'cho' ? 1 : -1;
      add(r + dir, c); add(r, c - 1); add(r, c + 1);
      if (inPalace(r, c)) {
        if (isCenter(r, c)) { add(r + dir, c - 1); add(r + dir, c + 1); }
        else if (c === 3 || c === 5) { if ((dir === 1 && r < 1) || (dir === -1 && r > 8)) add(r + dir, 4); }
      }
    }

    return { moves, caps };
  }, []);

  const startTutorial = () => {
    setGameMode('tutorial');
    setGameOver(false);
    setBoard(makeSetup());
    setTurn('');
    setTutorialText("연습 모드! 초록색 팀(초)과 빨간색 팀(한) 모두 만져볼 수 있어요!");
    setSelIdx(null);
    setMoveCells([]);
    setCapCells([]);
  };

  const startMatch = (diff: string) => {
    setGameMode('match');
    setGameDiff(diff);
    setGameOver(false);
    setTurn('cho');
    setBoard(makeSetup());
    setTutorialText("컴퓨터 대결 시작! 아들 차례 — 초록색(초) 말을 먼저 움직여!");
    setSelIdx(null);
    setMoveCells([]);
    setCapCells([]);
    setShowDiffOptions(false);
  };

  const goToMenu = () => {
    setGameOver(true);
    setGameMode('none');
    setShowDiffOptions(false);
    setTutorialText("모드를 골라주세요!");
    setSelIdx(null);
    setMoveCells([]);
    setCapCells([]);
  };

  const clearSel = () => {
    setSelIdx(null);
    setMoveCells([]);
    setCapCells([]);
  };

  const selectPiece = (idx: number) => {
    const piece = board[idx];
    if (!piece) return;
    setSelIdx(idx);
    let text = piece.desc;
    const { moves, caps } = getFilteredMoves(idx, board);
    if (moves.length === 0 && caps.length === 0) {
      text += "\n(움직일 수 있는 곳이 없어요!)";
    }
    setTutorialText(text);
    setMoveCells(moves);
    setCapCells(caps);
  };

  const afterMove = (to: number, isPlayer: boolean, captured: PieceData | null) => {
    if (captured && captured.type === 'king') {
      const winner = captured.color === 'han' ? '초나라(초록팀, 아들)' : '한나라(빨간팀, 컴퓨터)';
      setGameOver(true);
      setTutorialText(`🎉 게임 종료! ${winner} 승리! 🎉`);
      setTimeout(() => {
        if (confirm(`외통수! ${winner} 승리!\n메뉴로 돌아갈까요?`)) {
          goToMenu();
        }
      }, 400);
      return;
    }

    if (gameMode === 'match') {
      if (isPlayer) {
        setTurn('han');
        if (isKingInCheck('han', board)) {
          setTutorialText("🚨 장군! 컴퓨터 로봇이 위험해요!");
        } else {
          setTutorialText("컴퓨터 로봇이 생각 중... 🤔");
        }
      } else {
        setTurn('cho');
        if (isKingInCheck('cho', board)) {
          setTutorialText("⚠️ 장군! 아들 왕이 위험해요! 피해야 해!");
        } else {
          setTutorialText("아들 차례! 멋지게 공격해봐요!");
        }
      }
    }
  };

  const doMove = (from: number, to: number, isPlayer: boolean) => {
    const newBoard = [...board];
    newBoard[to] = newBoard[from];
    newBoard[from] = null;
    setBoard(newBoard);
    clearSel();
    setTimeout(() => afterMove(to, isPlayer, null), 300);
  };

  const doCapture = (from: number, to: number, isPlayer: boolean) => {
    const targetData = board[to];
    setCapturingIdx(to);
    setTimeout(() => {
      const newBoard = [...board];
      newBoard[to] = newBoard[from];
      newBoard[from] = null;
      setBoard(newBoard);
      setCapturingIdx(null);
      clearSel();
      setTimeout(() => afterMove(to, isPlayer, targetData), 300);
    }, 300);
  };

  const computerMove = useCallback(() => {
    if (gameMode !== 'match' || gameOver || turn !== 'han') return;

    const all: { from: number; to: number; capVal: number; isCapture: boolean; score?: number }[] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (!board[i] || board[i]?.color !== 'han') continue;
      const { moves, caps } = getFilteredMoves(i, board);
      moves.forEach(to => all.push({ from: i, to, capVal: 0, isCapture: false }));
      caps.forEach(to => {
        const target = board[to];
        if (target) {
          all.push({ from: i, to, capVal: PIECE_VALUE[target.type] || 0, isCapture: true });
        }
      });
    }

    if (all.length === 0) {
      setGameOver(true);
      setTutorialText("컴퓨터가 움직일 곳이 없어요! 아들 승리! 🎉");
      return;
    }

    let chosen: any = null;
    if (gameDiff === 'level1') {
      chosen = all[Math.floor(Math.random() * all.length)];
    } else if (gameDiff === 'level2') {
      const caps = all.filter(m => m.isCapture);
      chosen = caps.length && Math.random() > 0.5 ? caps[Math.floor(Math.random() * caps.length)] : all[Math.floor(Math.random() * all.length)];
    } else if (gameDiff === 'level3') {
      const maxV = Math.max(...all.map(m => m.capVal));
      const best = all.filter(m => m.capVal === maxV);
      chosen = best[Math.floor(Math.random() * best.length)];
    } else if (gameDiff === 'level4' || gameDiff === 'level5') {
      const scored = all.map(m => {
        const r = Math.floor(m.to / COLS), c = m.to % COLS;
        const centerBonus = 10 - (Math.abs(r - 4.5) + Math.abs(c - 4));
        const movingPieceVal = PIECE_VALUE[board[m.from]!.type];

        let score = (m.capVal * 1000) + (centerBonus * 2);

        // 5단계 전용: 현재 내 기물이 위험에 처해있었다면 탈출 보너스
        if (gameDiff === 'level5') {
          let currentlyAttacked = false;
          for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[j] && board[j]?.color === 'cho') {
              const { moves: wm, caps: wc } = calcMoves(j, board);
              if ([...wm, ...wc].includes(m.from)) {
                currentlyAttacked = true;
                break;
              }
            }
          }
          if (currentlyAttacked) score += movingPieceVal * 500;
        }

        // 가상 이동 시뮬레이션 (이동할 자리가 안전한지 확인)
        const sim = [...board];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;

        let destAttacked = false;
        for (let j = 0; j < BOARD_SIZE; j++) {
          if (sim[j] && sim[j]?.color === 'cho') {
            const { moves: wm, caps: wc } = calcMoves(j, sim);
            if ([...wm, ...wc].includes(m.to)) {
              destAttacked = true;
              break;
            }
          }
        }

        // 이동할 자리가 공격받는 자리라면 기물 가치만큼 감점 (단, 왕을 잡는 경우는 예외)
        if (destAttacked && m.capVal < 1000) {
          score -= movingPieceVal * 1000;
        }

        return { ...m, score };
      });
      const maxS = Math.max(...scored.map(m => m.score!));
      const best = scored.filter(m => m.score === maxS);
      chosen = best[Math.floor(Math.random() * best.length)];
    }

    if (chosen.isCapture) doCapture(chosen.from, chosen.to, false);
    else doMove(chosen.from, chosen.to, false);
  }, [gameMode, gameOver, turn, board, gameDiff, calcMoves]);

  useEffect(() => {
    if (turn === 'han' && !gameOver) {
      const timer = setTimeout(computerMove, 750);
      return () => clearTimeout(timer);
    }
  }, [turn, gameOver, computerMove]);

  const onSquareClick = (idx: number) => {
    if (gameOver) return;
    if (gameMode === 'match' && turn !== 'cho') return;

    const clicked = board[idx];

    if (selIdx !== null) {
      if (idx === selIdx) { clearSel(); return; }
      if (clicked && clicked.color === board[selIdx]?.color) {
        clearSel();
        selectPiece(idx);
        return;
      }

      if (moveCells.includes(idx)) doMove(selIdx, idx, true);
      else if (capCells.includes(idx)) doCapture(selIdx, idx, true);
      else setTutorialText("거긴 못 가! 초록 불빛을 눌러!");
    } else {
      if (!clicked) return;
      if (gameMode === 'match' && clicked.color !== 'cho') {
        setTutorialText("아들 차례니까 초록 말만 움직여!");
        return;
      }
      selectPiece(idx);
    }
  };

  return (
    <div className="lego-chess-container select-none">
      <div className="top-bar">
        <button className="menu-back-btn" onClick={goToMenu}>🏠 메뉴로 가기</button>
        <h1 className="game-title">장기 마스터</h1>
      </div>

      <div className="music-controls">
        <select 
          id="bgm-select" 
          className="bgm-select"
          value={curVideoId}
          onChange={(e) => setCurVideoId(e.target.value)}
        >
          <option value="iQIkgz9P-nM">🎵 신나는 구구단송</option>
          <option value="SEwmVVhlqyg">🎻 똑똑해지는 모차르트</option>
        </select>
        <button 
          id="bgm-btn" 
          className="bgm-btn"
          onClick={toggleBgm}
          style={{ backgroundColor: bgmActive ? '#4CAF50' : 'var(--lego-red)' }}
        >
          {bgmActive ? '🔇 음악 끄기' : '▶ 음악 켜기'}
        </button>
      </div>

      <div id="youtube-player" style={{ display: 'none' }}></div>

      <div id="board" className="lego-board" ref={boardRef}>
        {gameMode === 'none' && (
          <div id="menu-overlay" className="menu-overlay">
            <div className="menu-title">어떤 모드로 해볼까?</div>
            {!showDiffOptions ? (
              <>
                <button className="menu-btn" onClick={startTutorial}>1. 튜토리얼 (혼자 연습하기)</button>
                <button className="menu-btn" onClick={() => setShowDiffOptions(true)}>2. 컴퓨터랑 대결하기</button>
              </>
            ) : (
              <div id="diff-options" className="diff-container" style={{ display: 'flex' }}>
                <button className="diff-btn" style={{ backgroundColor: '#8bc34a' }} onClick={() => startMatch('level1')}>1단계: 입문 (랜덤 로봇)</button>
                <button className="diff-btn" style={{ backgroundColor: '#ffca28', color: '#333' }} onClick={() => startMatch('level2')}>2단계: 초급 (변덕쟁이)</button>
                <button className="diff-btn" style={{ backgroundColor: '#ff9800' }} onClick={() => startMatch('level3')}>3단계: 중급 (먹보 로봇)</button>
                <button className="diff-btn" style={{ backgroundColor: '#f44336' }} onClick={() => startMatch('level4')}>4단계: 고급 (전략가 로봇)</button>
                <button className="diff-btn" style={{ backgroundColor: '#9c27b0' }} onClick={() => startMatch('level5')}>5단계: 마스터 (예언자 로봇)</button>
                <button className="menu-btn mt-4" onClick={() => setShowDiffOptions(false)}>뒤로 가기</button>
              </div>
            )}
          </div>
        )}

        {Array.from({ length: BOARD_SIZE }).map((_, i) => {
          const r = Math.floor(i / COLS);
          const c = i % COLS;
          let palaceClass = '';
          if ((r >= 0 && r <= 2) || (r >= 7 && r <= 9)) {
            if (c >= 3 && c <= 5) {
              if (r === 0 || r === 7) palaceClass += ' palace-top';
              if (r === 2 || r === 9) palaceClass += ' palace-bottom';
              if (c === 3) palaceClass += ' palace-left';
              if (c === 5) palaceClass += ' palace-right';
            }
          }

          return (
            <div 
              key={i} 
              className={`square ${palaceClass} ${moveCells.includes(i) ? 'valid-move' : ''} ${capCells.includes(i) ? 'capture-move' : ''}`}
              onClick={() => onSquareClick(i)}
            >
              {board[i] && (
                <div 
                  className={`piece ${board[i]?.color} ${selIdx === i ? 'selected' : ''} ${capturingIdx === i ? 'being-captured' : ''}`}
                  style={{
                    transform: `translate(0, 0)` // React handles rendering, CSS handles grid
                  }}
                >
                  {board[i]?.emoji}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p id="tutorial-box" className="tutorial-box">{tutorialText}</p>
    </div>
  );
}
