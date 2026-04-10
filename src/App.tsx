import React, { useState, useEffect, useCallback, useMemo } from 'react';

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
  rook: 13,
  knight: 5,
  elephant: 4,
  cannon: 7,
  guard: 3,
  king: 1000,
  pawn: 2
};

const DESC: Record<Team, Record<PieceType, string>> = {
  cho: { rook: "차(車)!", knight: "마(馬)!", elephant: "상(象)!", cannon: "포(包)!", guard: "사(士)!", king: "초(楚)! 왕입니다.", pawn: "졸(卒)!" },
  han: { rook: "차(車)!", knight: "마(馬)!", elephant: "상(象)!", cannon: "포(包)!", guard: "사(士)!", king: "한(漢)! 왕입니다.", pawn: "병(兵)!" }
};

const App: React.FC = () => {
  const [board, setBoard] = useState<BoardState>(Array(BOARD_SIZE).fill(null));
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [moveCells, setMoveCells] = useState<number[]>([]);
  const [capCells, setCapCells] = useState<number[]>([]);
  const [gameMode, setGameMode] = useState<'none' | 'tutorial' | 'match'>('none');
  const [gameDiff, setGameDiff] = useState<string>('level1');
  const [turn, setTurn] = useState<Team | ''>('');
  const [gameOver, setGameOver] = useState(false);
  const [tutorialText, setTutorialText] = useState("모드를 골라주세요!");
  const [showDiffOptions, setShowDiffOptions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [capturingIdx, setCapturingIdx] = useState<number | null>(null);

  const fitBoard = useCallback(() => {
    const root = document.documentElement;
    const topBar = document.querySelector('.top-bar') as HTMLElement;
    const tutBox = document.querySelector('.tutorial-box') as HTMLElement;
    const uiH = (topBar?.offsetHeight || 0) + (tutBox?.offsetHeight || 0) + 40;
    const availH = window.innerHeight - uiH;
    const availW = window.innerWidth * 0.95;
    const maxW = availW / 9.2;
    const maxH = availH / 10.2;
    const sqSize = Math.max(20, Math.floor(Math.min(maxW, maxH)));
    root.style.setProperty('--square-size', sqSize + 'px');
  }, []);

  useEffect(() => {
    fitBoard();
    window.addEventListener('resize', fitBoard);
    return () => window.removeEventListener('resize', fitBoard);
  }, [fitBoard]);

  const makeSetup = useCallback(() => {
    const state: BoardState = Array(BOARD_SIZE).fill(null);
    const add = (r: number, c: number, type: PieceType, emoji: string, color: Team) => {
      state[r * COLS + c] = { type, emoji, color, desc: DESC[color][type] };
    };

    // 한나라(빨간팀) — 위쪽(row 0~3)
    add(0, 0, 'rook', '車', 'han'); add(0, 1, 'knight', '馬', 'han'); add(0, 2, 'elephant', '象', 'han');
    add(0, 3, 'guard', '士', 'han'); add(0, 5, 'guard', '士', 'han');
    add(0, 6, 'elephant', '象', 'han'); add(0, 7, 'knight', '馬', 'han'); add(0, 8, 'rook', '車', 'han');
    add(1, 4, 'king', '漢', 'han');
    add(2, 1, 'cannon', '包', 'han'); add(2, 7, 'cannon', '包', 'han');
    add(3, 0, 'pawn', '兵', 'han'); add(3, 2, 'pawn', '兵', 'han'); add(3, 4, 'pawn', '兵', 'han');
    add(3, 6, 'pawn', '兵', 'han'); add(3, 8, 'pawn', '兵', 'han');

    // 초나라(초록팀, 플레이어) — 아래쪽(row 6~9)
    add(9, 0, 'rook', '車', 'cho'); add(9, 1, 'knight', '馬', 'cho'); add(9, 2, 'elephant', '象', 'cho');
    add(9, 3, 'guard', '士', 'cho'); add(9, 5, 'guard', '士', 'cho');
    add(9, 6, 'elephant', '象', 'cho'); add(9, 7, 'knight', '馬', 'cho'); add(9, 8, 'rook', '車', 'cho');
    add(8, 4, 'king', '楚', 'cho');
    add(7, 1, 'cannon', '包', 'cho'); add(7, 7, 'cannon', '包', 'cho');
    add(6, 0, 'pawn', '卒', 'cho'); add(6, 2, 'pawn', '卒', 'cho'); add(6, 4, 'pawn', '卒', 'cho');
    add(6, 6, 'pawn', '卒', 'cho'); add(6, 8, 'pawn', '卒', 'cho');

    return state;
  }, []);

  const calcMoves = useCallback((idx: number, state: BoardState) => {
    const piece = state[idx];
    if (!piece) return { moves: [], caps: [] };
    const moves: number[] = [], caps: number[] = [];
    const r = Math.floor(idx / COLS), c = idx % COLS;
    const ok = (nr: number, nc: number) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS;
    const inPalace = (nr: number, nc: number) =>
      (nr >= 0 && nr <= 2 && nc >= 3 && nc <= 5) ||
      (nr >= 7 && nr <= 9 && nc >= 3 && nc <= 5);
    const isCenter = (nr: number, nc: number) => (nr === 1 && nc === 4) || (nr === 8 && nc === 4);

    const add = (nr: number, nc: number) => {
      if (!ok(nr, nc)) return false;
      const t = state[nr * COLS + nc];
      if (!t) { moves.push(nr * COLS + nc); return true; }
      if (t.color !== piece.color && !(piece.type === 'cannon' && t.type === 'cannon')) {
        caps.push(nr * COLS + nc);
      }
      return false;
    };

    if (piece.type === 'rook') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        for (let i = 1; i < 10; i++) if (!add(r + dr * i, c + dc * i)) break;
      });
      if (isCenter(r, c)) {
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
          let nr = r + dr, nc = c + dc;
          while (inPalace(nr, nc)) { if (!add(nr, nc)) break; nr += dr; nc += dc; }
        });
      } else if (inPalace(r, c)) {
        const cr = r < 5 ? 1 : 8;
        const dr = Math.sign(cr - r), dc = Math.sign(4 - c);
        if (dr !== 0 && dc !== 0) {
          let nr = r + dr, nc = c + dc;
          while (inPalace(nr, nc)) { if (!add(nr, nc)) break; nr += dr; nc += dc; }
        }
      }
    }

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
        const cr = r < 5 ? 1 : 8;
        const centerPiece = state[cr * COLS + 4];
        if (centerPiece && centerPiece.type !== 'cannon') {
          const oppR = cr + (cr - r), oppC = 4 + (4 - c);
          if (ok(oppR, oppC)) {
            const dest = state[oppR * COLS + oppC];
            if (!dest) moves.push(oppR * COLS + oppC);
            else if (dest.color !== piece.color && dest.type !== 'cannon') caps.push(oppR * COLS + oppC);
          }
        }
      }
    }

    if (piece.type === 'knight') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        if (ok(r + dr, c + dc) && !state[(r + dr) * COLS + (c + dc)]) {
          if (dr !== 0) { add(r + dr * 2, c - 1); add(r + dr * 2, c + 1); }
          else { add(r - 1, c + dc * 2); add(r + 1, c + dc * 2); }
        }
      });
    }

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

    if (piece.type === 'king' || piece.type === 'guard') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => { if (inPalace(r + dr, c + dc)) add(r + dr, c + dc); });
      if (isCenter(r, c)) {
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => add(r + dr, c + dc));
      } else if (inPalace(r, c)) {
        add(r < 5 ? 1 : 8, 4);
      }
    }

    if (piece.type === 'pawn') {
      const dir = piece.color === 'cho' ? -1 : 1;
      add(r + dir, c); add(r, c - 1); add(r, c + 1);
      if (inPalace(r, c)) {
        if (isCenter(r, c)) {
          add(r + dir, c - 1); add(r + dir, c + 1);
        } else if (c === 3 || c === 5) {
          if (dir === -1 && r === 2) add(1, 4);
          if (dir === 1 && r === 7) add(8, 4);
        }
      }
    }

    return { moves, caps };
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
  }, [calcMoves]);

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
  }, [calcMoves, isKingInCheck]);

  const evaluate = useCallback((state: BoardState) => {
    let score = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (!state[i]) continue;
      const p = state[i]!;
      const val = PIECE_VALUE[p.type] || 0;
      const r = Math.floor(i / COLS), c = i % COLS;
      const centerBonus = (10 - (Math.abs(r - 4.5) + Math.abs(c - 4))) * 0.12;
      score += (p.color === 'han') ? (val + centerBonus) : -(val + centerBonus);
    }
    return score;
  }, []);

  const getAllMovesFor = useCallback((color: Team, state: BoardState) => {
    const caps: { from: number; to: number; isCapture: boolean }[] = [];
    const quiets: { from: number; to: number; isCapture: boolean }[] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (!state[i] || state[i]?.color !== color) continue;
      const { moves, caps: cs } = getFilteredMoves(i, state);
      cs.forEach(to => caps.push({ from: i, to, isCapture: true }));
      moves.forEach(to => quiets.push({ from: i, to, isCapture: false }));
    }
    return [...caps, ...quiets];
  }, [getFilteredMoves]);

  const kingAlive = useCallback((state: BoardState, color: Team) => {
    return state.some(p => p && p.type === 'king' && p.color === color);
  }, []);

  const minimax = useCallback((state: BoardState, depth: number, isMaximizing: boolean, alpha: number, beta: number): number => {
    if (!kingAlive(state, 'han')) return -100000;
    if (!kingAlive(state, 'cho')) return 100000;
    if (depth === 0) return evaluate(state);

    const color = isMaximizing ? 'han' : 'cho';
    const moves = getAllMovesFor(color, state);
    if (moves.length === 0) return isMaximizing ? -50000 : 50000;

    if (isMaximizing) {
      let best = -Infinity;
      for (const m of moves) {
        const sim = [...state];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        const val = minimax(sim, depth - 1, false, alpha, beta);
        best = Math.max(best, val);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        const sim = [...state];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        const val = minimax(sim, depth - 1, true, alpha, beta);
        best = Math.min(best, val);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }, [evaluate, getAllMovesFor, kingAlive]);

  const isSquareAttackedBy = useCallback((sq: number, attackerColor: Team, state: BoardState) => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (!state[i] || state[i]?.color !== attackerColor) continue;
      const { moves, caps } = calcMoves(i, state);
      if (moves.includes(sq) || caps.includes(sq)) return true;
    }
    return false;
  }, [calcMoves]);

  const startTutorial = () => {
    setGameMode('tutorial');
    setGameOver(false);
    setBoard(makeSetup());
    setTurn('');
    setTutorialText("연습 모드! 초록팀(초)과 빨간팀(한) 모두 만져볼 수 있어요!");
    setSelIdx(null);
    setMoveCells([]);
    setCapCells([]);
    setShowDiffOptions(false);
  };

  const startMatch = (diff: string) => {
    setGameMode('match');
    setGameDiff(diff);
    setGameOver(false);
    setTurn('cho');
    setBoard(makeSetup());
    setTutorialText("컴퓨터 대결 시작! 아들 차례 — 초록색 말을 먼저 움직여!");
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

  const afterMove = useCallback((to: number, isPlayer: boolean, captured: PieceData | null, currentState: BoardState) => {
    if (captured && captured.type === 'king') {
      const winner = captured.color === 'han' ? '초나라(초록팀)' : '한나라(빨간팀, 컴퓨터)';
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
        if (isKingInCheck('han', currentState)) {
          setTutorialText("🚨 장군! 컴퓨터 로봇이 위험해요!");
        } else {
          setTutorialText("컴퓨터 로봇이 생각 중... 🤔");
        }
      } else {
        setTurn('cho');
        if (isKingInCheck('cho', currentState)) {
          setTutorialText("⚠️ 장군! 아들 왕이 위험해요! 피해야 해!");
        } else {
          setTutorialText("아들 차례! 멋지게 공격해봐요!");
        }
      }
    }
  }, [gameMode, isKingInCheck]);

  const doMove = useCallback((from: number, to: number, isPlayer: boolean) => {
    setIsAnimating(true);
    const newBoard = [...board];
    const captured = newBoard[to];
    newBoard[to] = newBoard[from];
    newBoard[from] = null;
    setBoard(newBoard);
    clearSel();

    setTimeout(() => {
      setIsAnimating(false);
      afterMove(to, isPlayer, captured, newBoard);
    }, 300);
  }, [board, afterMove]);

  const doCapture = useCallback((from: number, to: number, isPlayer: boolean) => {
    setIsAnimating(true);
    setCapturingIdx(to);
    
    setTimeout(() => {
      const newBoard = [...board];
      const captured = newBoard[to];
      newBoard[to] = newBoard[from];
      newBoard[from] = null;
      setBoard(newBoard);
      setCapturingIdx(null);
      clearSel();
      setIsAnimating(false);
      afterMove(to, isPlayer, captured, newBoard);
    }, 320);
  }, [board, afterMove]);

  const computerMove = useCallback(() => {
    if (gameMode !== 'match' || gameOver || isAnimating) return;

    const all = getAllMovesFor('han', board);
    if (all.length === 0) {
      setGameOver(true);
      setTutorialText("컴퓨터가 움직일 곳이 없어요! 아들 승리! 🎉");
      return;
    }

    let chosen: { from: number; to: number; isCapture: boolean } | null = null;

    if (gameDiff === 'level1') {
      chosen = all[Math.floor(Math.random() * all.length)];
    } else if (gameDiff === 'level2') {
      const caps = all.filter(m => m.isCapture);
      if (caps.length > 0) {
        const maxVal = Math.max(...caps.map(m => PIECE_VALUE[board[m.to]!.type] || 0));
        const bestCaps = caps.filter(m => (PIECE_VALUE[board[m.to]!.type] || 0) === maxVal);
        chosen = bestCaps[Math.floor(Math.random() * bestCaps.length)];
      } else {
        chosen = all[Math.floor(Math.random() * all.length)];
      }
    } else if (gameDiff === 'level3') {
      const scored = all.map(m => {
        const capVal = m.isCapture ? (PIECE_VALUE[board[m.to]!.type] || 0) : 0;
        const myVal = PIECE_VALUE[board[m.from]!.type] || 0;
        const sim = [...board];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        const danger = isSquareAttackedBy(m.to, 'cho', sim) ? myVal * 80 : 0;
        return { ...m, score: capVal * 100 - danger };
      });
      const maxS = Math.max(...scored.map(m => m.score));
      const best = scored.filter(m => m.score === maxS);
      chosen = best[Math.floor(Math.random() * best.length)];
    } else if (gameDiff === 'level4') {
      let bestScore = -Infinity;
      const candidates: typeof all = [];
      for (const m of all) {
        const sim = [...board];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        if (!kingAlive(sim, 'cho')) { chosen = m; break; }
        const score = minimax(sim, 0, false, -Infinity, Infinity);
        if (score > bestScore) {
          bestScore = score;
          candidates.length = 0;
          candidates.push(m);
        } else if (score === bestScore) {
          candidates.push(m);
        }
      }
      if (!chosen) chosen = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (gameDiff === 'level5') {
      let bestScore = -Infinity;
      const candidates: typeof all = [];
      for (const m of all) {
        const sim = [...board];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        if (!kingAlive(sim, 'cho')) { chosen = m; break; }
        const score = minimax(sim, 1, false, -Infinity, Infinity);
        if (score > bestScore) {
          bestScore = score;
          candidates.length = 0;
          candidates.push(m);
        } else if (score === bestScore) {
          candidates.push(m);
        }
      }
      if (!chosen) chosen = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (!chosen) chosen = all[Math.floor(Math.random() * all.length)];

    if (chosen.isCapture) doCapture(chosen.from, chosen.to, false);
    else doMove(chosen.from, chosen.to, false);
  }, [board, gameMode, gameOver, isAnimating, gameDiff, getAllMovesFor, isSquareAttackedBy, kingAlive, minimax, doCapture, doMove]);

  useEffect(() => {
    if (turn === 'han' && !gameOver && !isAnimating) {
      const timer = setTimeout(computerMove, 750);
      return () => clearTimeout(timer);
    }
  }, [turn, gameOver, isAnimating, computerMove]);

  const onSquareClick = (idx: number) => {
    if (gameOver || isAnimating) return;
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

  const boardLines = useMemo(() => {
    let lines = [];
    const thin = '0.03', thick = '0.1';
    for (let i = 0; i <= 9; i++) lines.push(<line key={`h${i}`} x1="0" y1={i} x2="8" y2={i} stroke="#000" strokeWidth={thin} />);
    for (let i = 0; i <= 8; i++) lines.push(<line key={`v${i}`} x1={i} y1="0" x2={i} y2="9" stroke="#000" strokeWidth={thin} />);
    lines.push(<line key="d1" x1="3" y1="0" x2="5" y2="2" stroke="#000" strokeWidth={thin} />);
    lines.push(<line key="d2" x1="5" y1="0" x2="3" y2="2" stroke="#000" strokeWidth={thin} />);
    lines.push(<line key="d3" x1="3" y1="7" x2="5" y2="9" stroke="#000" strokeWidth={thin} />);
    lines.push(<line key="d4" x1="5" y1="7" x2="3" y2="9" stroke="#000" strokeWidth={thin} />);
    lines.push(<rect key="p1" x="3" y="0" width="2" height="2" fill="none" stroke="#000" strokeWidth={thick} />);
    lines.push(<rect key="p2" x="3" y="7" width="2" height="2" fill="none" stroke="#000" strokeWidth={thick} />);
    return lines;
  }, []);

  return (
    <div className="lego-chess-container select-none">
      <div className="top-bar">
        <button className="menu-back-btn" onClick={goToMenu}>🏠 메뉴로 가기</button>
        <h1 className="game-title">장기게임</h1>
      </div>

      <div className="lego-board-wrapper">
        <div className="lego-board" id="board">
          <svg id="board-svg" width="100%" height="100%" viewBox="0 0 8 9" style={{ overflow: 'visible', position: 'absolute', zIndex: 1, pointerEvents: 'none' }}>
            {boardLines}
          </svg>
          
          <div id="click-layer" style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 5 }}>
            {Array.from({ length: BOARD_SIZE }).map((_, i) => {
              const r = Math.floor(i / COLS);
              const c = i % COLS;
              return (
                <div
                  key={i}
                  className={`intersection ${moveCells.includes(i) ? 'valid-move' : ''} ${capCells.includes(i) ? 'capture-move' : ''}`}
                  style={{ left: `calc(var(--square-size) * ${c})`, top: `calc(var(--square-size) * ${r})` }}
                  onClick={() => onSquareClick(i)}
                />
              );
            })}
          </div>

          {board.map((d, i) => {
            if (!d) return null;
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            return (
              <div
                key={`p-${i}`}
                className={`piece-wrapper ${d.color} ${selIdx === i ? 'selected' : ''} ${capturingIdx === i ? 'being-captured' : ''}`}
                style={{
                  transform: `translate(calc(var(--square-size) * ${c} - 50%), calc(var(--square-size) * ${r} - 50%))`
                }}
              >
                <div className="piece">{d.emoji}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p id="tutorial-box" class="tutorial-box">{tutorialText}</p>

      {gameMode === 'none' && (
        <div id="menu-overlay" className="menu-overlay">
          <div className="menu-title">어떤 모드로 해볼까?</div>
          <button className="menu-btn" onClick={startTutorial}>1. 혼자 규칙 연습하기</button>
          <button className="menu-btn" onClick={() => setShowDiffOptions(true)}>2. 컴퓨터랑 대결하기</button>
          
          {showDiffOptions && (
            <div id="diff-options" className="diff-container" style={{ display: 'flex' }}>
              <button className="diff-btn" style={{ backgroundColor: '#8bc34a' }} onClick={() => startMatch('level1')}>1단계: 입문 (랜덤 로봇)</button>
              <button className="diff-btn" style={{ backgroundColor: '#ffca28', color: '#333' }} onClick={() => startMatch('level2')}>2단계: 초급 (변덕쟁이)</button>
              <button className="diff-btn" style={{ backgroundColor: '#ff9800' }} onClick={() => startMatch('level3')}>3단계: 중급 (먹보 로봇)</button>
              <button className="diff-btn" style={{ backgroundColor: '#f44336' }} onClick={() => startMatch('level4')}>4단계: 고급 (전략가 로봇)</button>
              <button className="diff-btn" style={{ backgroundColor: '#9c27b0' }} onClick={() => startMatch('level5')}>5단계: 마스터 (예언자 로봇)</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
