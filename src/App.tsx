import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

type Team = 'cho' | 'han';
type PieceType = 'rook' | 'knight' | 'elephant' | 'cannon' | 'guard' | 'king' | 'pawn';

interface PieceData {
  type: PieceType;
  emoji: string;
  color: Team;
}

type BoardState = (PieceData | null)[];

const ROWS = 10;
const COLS = 9;
const BOARD_SIZE = ROWS * COLS;

const PIECE_VALUE: Record<PieceType, number> = {
  pawn: 20,
  guard: 30,
  elephant: 40,
  knight: 50,
  cannon: 70,
  rook: 130,
  king: 10000
};

const DESC: Record<Team, Record<PieceType, string>> = {
  cho: { rook: "차(車)", knight: "마(馬)", elephant: "상(象)", cannon: "포(包)", guard: "사(士)", king: "초(楚)", pawn: "졸(卒)" },
  han: { rook: "차(車)", knight: "마(馬)", elephant: "상(象)", cannon: "포(包)", guard: "사(士)", king: "한(漢)", pawn: "병(兵)" }
};

const App: React.FC = () => {
  const [board, setBoard] = useState<BoardState>(Array(BOARD_SIZE).fill(null));
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [moveCells, setMoveCells] = useState<number[]>([]);
  const [capCells, setCapCells] = useState<number[]>([]);
  const [gameMode, setGameMode] = useState<'none' | 'tutorial' | 'match' | 'local_pvp'>('none');
  const [gameDiff, setGameDiff] = useState<string>('level1');
  const [turn, setTurn] = useState<Team | ''>('');
  const [gameOver, setGameOver] = useState(false);
  const [tutorialText, setTutorialText] = useState("모드를 골라주세요!");
  const [showDiffOptions, setShowDiffOptions] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [capturingIdx, setCapturingIdx] = useState<number | null>(null);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isCheck, setIsCheck] = useState(false);
  const [wasInCheckState, setWasInCheck] = useState(false);
  const [boardHistory, setBoardHistory] = useState<string[]>([]);
  const [isBikjangState, setIsBikjangState] = useState(false);
  const [isDraw, setIsDraw] = useState(false);
  const [showSetupOverlay, setShowSetupOverlay] = useState(false);
  const [selectingSetupFor, setSelectingSetupFor] = useState<Team>('cho');
  const [pendingMode, setPendingMode] = useState<'none' | 'tutorial' | 'match' | 'local_pvp'>('none');
  const [pendingDiff, setPendingDiff] = useState<string>('');
  const [pendingChoSetup, setPendingChoSetup] = useState<string>('');

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const clackRef = useRef<HTMLAudioElement | null>(null);

  const fitBoard = useCallback(() => {
    const root = document.documentElement;
    const topBar = document.querySelector('.top-bar') as HTMLElement;
    const tutBox = document.querySelector('.tutorial-box') as HTMLElement;
    const uiH = (topBar?.offsetHeight || 0) + (tutBox?.offsetHeight || 0) + 40;
    const sqSize = Math.max(20, Math.floor(Math.min((window.innerWidth * 0.95) / 9.2, (window.innerHeight - uiH) / 10.2)));
    root.style.setProperty('--square-size', sqSize + 'px');
  }, []);

  useEffect(() => {
    fitBoard();
    window.addEventListener('resize', fitBoard);
    return () => window.removeEventListener('resize', fitBoard);
  }, [fitBoard]);

  const speakVoice = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = 'ko-KR';
      msg.rate = 1.1;
      msg.pitch = 1.2;
      window.speechSynthesis.speak(msg);
    }
  }, []);

  const toggleBGM = () => {
    if (bgmRef.current) {
      if (isBgmPlaying) {
        bgmRef.current.pause();
      } else {
        bgmRef.current.play().catch(() => {});
      }
      setIsBgmPlaying(!isBgmPlaying);
    }
  };

  const unlockAudio = () => {
    if ('speechSynthesis' in window) {
      const silentUtterance = new SpeechSynthesisUtterance('');
      silentUtterance.volume = 0;
      window.speechSynthesis.speak(silentUtterance);
    }
    if (clackRef.current) {
      clackRef.current.volume = 0;
      clackRef.current.play().then(() => {
        if (clackRef.current) {
          clackRef.current.pause();
          clackRef.current.currentTime = 0;
          clackRef.current.volume = 1;
        }
      }).catch(() => {});
    }
  };

  const makeSetup = useCallback((choSetupType: string, hanSetupType: string) => {
    const state: BoardState = Array(BOARD_SIZE).fill(null);
    const add = (r: number, c: number, type: PieceType, emoji: string, color: Team) => {
      state[r * COLS + c] = { type, emoji, color };
    };

    const getPieces = (typeStr: string) => {
      const map: Record<string, { t: PieceType; e: string }> = {
        'M': { t: 'knight', e: '馬' },
        'S': { t: 'elephant', e: '象' }
      };
      return [map[typeStr[0]], map[typeStr[1]], map[typeStr[2]], map[typeStr[3]]];
    };

    const hanP = getPieces(hanSetupType);
    const choP = getPieces(choSetupType);

    // 한나라(빨간팀) — 위쪽(row 0~3)
    add(0, 0, 'rook', '車', 'han');
    add(0, 1, hanP[0].t, hanP[0].e, 'han');
    add(0, 2, hanP[1].t, hanP[1].e, 'han');
    add(0, 3, 'guard', '士', 'han');
    add(0, 5, 'guard', '士', 'han');
    add(0, 6, hanP[2].t, hanP[2].e, 'han');
    add(0, 7, hanP[3].t, hanP[3].e, 'han');
    add(0, 8, 'rook', '車', 'han');
    add(1, 4, 'king', '漢', 'han');
    add(2, 1, 'cannon', '包', 'han');
    add(2, 7, 'cannon', '包', 'han');
    add(3, 0, 'pawn', '兵', 'han');
    add(3, 2, 'pawn', '兵', 'han');
    add(3, 4, 'pawn', '兵', 'han');
    add(3, 6, 'pawn', '兵', 'han');
    add(3, 8, 'pawn', '兵', 'han');

    // 초나라(초록팀, 플레이어) — 아래쪽(row 6~9)
    add(9, 0, 'rook', '車', 'cho');
    add(9, 1, choP[0].t, choP[0].e, 'cho');
    add(9, 2, choP[1].t, choP[1].e, 'cho');
    add(9, 3, 'guard', '士', 'cho');
    add(9, 5, 'guard', '士', 'cho');
    add(9, 6, choP[2].t, choP[2].e, 'cho');
    add(9, 7, choP[3].t, choP[3].e, 'cho');
    add(9, 8, 'rook', '車', 'cho');
    add(8, 4, 'king', '楚', 'cho');
    add(7, 1, 'cannon', '包', 'cho');
    add(7, 7, 'cannon', '包', 'cho');
    add(6, 0, 'pawn', '卒', 'cho');
    add(6, 2, 'pawn', '卒', 'cho');
    add(6, 4, 'pawn', '卒', 'cho');
    add(6, 6, 'pawn', '卒', 'cho');
    add(6, 8, 'pawn', '卒', 'cho');

    return state;
  }, []);

  const calcPseudoMoves = useCallback((idx: number, state: BoardState) => {
    const piece = state[idx];
    if (!piece) return { moves: [], caps: [] };
    const moves: number[] = [], caps: number[] = [];
    const r = Math.floor(idx / COLS), c = idx % COLS;
    const ok = (nr: number, nc: number) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS;
    const inPalace = (nr: number, nc: number) =>
      (nr >= 0 && nr <= 2 && nc >= 3 && nc <= 5) ||
      (nr >= 7 && nr <= 9 && nc >= 3 && nc <= 5);
    const isCenter = (nr: number, nc: number) => (nr === 1 && nc === 4) || (nr === 8 && nc === 4);
    const isCorner = (nr: number, nc: number) => ((nr === 0 || nr === 2 || nr === 7 || nr === 9) && (nc === 3 || nc === 5));

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
      if (inPalace(r, c) && isCorner(r, c)) {
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
      } else if (isCorner(r, c)) {
        add(r < 5 ? 1 : 8, 4);
      }
    }

    if (piece.type === 'pawn') {
      const dir = piece.color === 'cho' ? -1 : 1;
      add(r + dir, c); add(r, c - 1); add(r, c + 1);
      if (inPalace(r, c)) {
        if (isCenter(r, c)) {
          add(r + dir, c - 1); add(r + dir, c + 1);
        } else if (isCorner(r, c)) {
          const cr = r < 5 ? 1 : 8;
          if (r + dir === cr) add(cr, 4);
        }
      }
    }

    return { moves, caps };
  }, []);

  const isKingFacing = useCallback((state: BoardState) => {
    let choKingIdx = -1, hanKingIdx = -1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state[i] && state[i]?.type === 'king') {
        if (state[i]?.color === 'cho') choKingIdx = i;
        else hanKingIdx = i;
      }
    }
    if (choKingIdx === -1 || hanKingIdx === -1) return false;
    const choC = choKingIdx % COLS, hanC = hanKingIdx % COLS;
    if (choC !== hanC) return false;
    const choR = Math.floor(choKingIdx / COLS), hanR = Math.floor(hanKingIdx / COLS);
    const minR = Math.min(choR, hanR), maxR = Math.max(choR, hanR);
    for (let r = minR + 1; r < maxR; r++) {
      if (state[r * COLS + choC]) return false;
    }
    return true;
  }, []);

  const isKingInCheck = useCallback((state: BoardState, targetColor: Team) => {
    let kingIdx = -1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state[i] && state[i]?.color === targetColor && state[i]?.type === 'king') {
        kingIdx = i;
        break;
      }
    }
    if (kingIdx === -1) return false;
    const opponent = targetColor === 'cho' ? 'han' : 'cho';
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state[i] && state[i]?.color === opponent) {
        const { caps } = calcPseudoMoves(i, state);
        if (caps.includes(kingIdx)) return true;
      }
    }
    return false;
  }, [calcPseudoMoves]);

  const getLegalMovesForPiece = useCallback((idx: number, state: BoardState) => {
    const piece = state[idx];
    if (!piece) return { moves: [], caps: [] };
    const { moves, caps } = calcPseudoMoves(idx, state);
    const legalMoves: number[] = [], legalCaps: number[] = [];
    const pieceColor = piece.color;

    for (const to of moves) {
      const sim = [...state];
      sim[to] = sim[idx];
      sim[idx] = null;
      // [패치 1.3] 내 왕이 장군을 맞는 자살수만 차단 (빅장 이동은 합법이므로 통과됨)
      if (!isKingInCheck(sim, pieceColor)) legalMoves.push(to);
    }
    for (const to of caps) {
      const sim = [...state];
      sim[to] = sim[idx];
      sim[idx] = null;
      if (!isKingInCheck(sim, pieceColor)) legalCaps.push(to);
    }
    return { moves: legalMoves, caps: legalCaps };
  }, [calcPseudoMoves, isKingInCheck]);

  const getAllLegalMoves = useCallback((state: BoardState, color: Team) => {
    const allMoves: { from: number; to: number; isCapture: boolean }[] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      if (state[i] && state[i]?.color === color) {
        const { moves, caps } = getLegalMovesForPiece(i, state);
        moves.forEach(to => allMoves.push({ from: i, to: to, isCapture: false }));
        caps.forEach(to => allMoves.push({ from: i, to: to, isCapture: true }));
      }
    }
    return allMoves;
  }, [getLegalMovesForPiece]);

  const evaluateBoard = useCallback((state: BoardState) => {
    let score = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const p = state[i];
      if (!p) continue;
      let val = PIECE_VALUE[p.type] * 10;
      const r = Math.floor(i / COLS), c = i % COLS;
      const centerBonus = 10 - (Math.abs(r - 4.5) + Math.abs(c - 4));
      val += centerBonus;
      if (p.color === 'han') score += val;
      else score -= val;
    }
    return score;
  }, []);

  const minimax = useCallback((state: BoardState, depth: number, alpha: number, beta: number, isMaximizing: boolean): number => {
    if (depth === 0) return evaluateBoard(state);
    const color = isMaximizing ? 'han' : 'cho';
    const moves = getAllLegalMoves(state, color);

    if (moves.length === 0) return isMaximizing ? -999999 : 999999;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let m of moves) {
        const sim = [...state];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        const ev = minimax(sim, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let m of moves) {
        const sim = [...state];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        const ev = minimax(sim, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [evaluateBoard, getAllLegalMoves]);

  const selectMode = (mode: 'tutorial' | 'match' | 'local_pvp', diff: string) => {
    unlockAudio();
    setPendingMode(mode);
    setPendingDiff(diff);
    setShowDiffOptions(false);
    setSelectingSetupFor('cho');
    setShowSetupOverlay(true);
  };

  const handleSetupSelection = (setupType: string) => {
    if (selectingSetupFor === 'cho') {
      setPendingChoSetup(setupType);
      if (pendingMode === 'local_pvp') {
        setSelectingSetupFor('han');
      } else {
        const setupTypes = ['MSSM', 'SMMS', 'MSMS', 'SMSM'];
        const randomHan = setupTypes[Math.floor(Math.random() * setupTypes.length)];
        startGame(setupType, randomHan);
      }
    } else {
      startGame(pendingChoSetup, setupType);
    }
  };

  const startGame = (choSetupType: string, hanSetupType: string) => {
    setShowSetupOverlay(false);
    setGameMode(pendingMode);
    setGameDiff(pendingDiff);
    setGameOver(false);
    setTurn('cho');
    setBoard(makeSetup(choSetupType, hanSetupType));
    setBoardHistory([]);
    setIsBikjangState(false);
    setIsDraw(false);
    
    if (pendingMode === 'tutorial') {
      setTutorialText("연습 모드! 양 팀 모두 만져볼 수 있어요!");
      setTurn('');
    } else if (pendingMode === 'local_pvp') {
      setTutorialText("2인 대결 시작! 마스터 먼저 둡니다.");
    } else {
      setTutorialText("대결 시작! 마스터 차례 (초록색 먼저)");
    }
    
    setIsCheck(false);
    setSelIdx(null);
    setMoveCells([]);
    setCapCells([]);
  };

  const goToMenu = () => {
    setGameOver(true);
    setGameMode('none');
    setShowDiffOptions(false);
    setShowSetupOverlay(false);
    setTutorialText("모드를 골라주세요!");
    setSelIdx(null);
    setMoveCells([]);
    setCapCells([]);
    setIsCheck(false);
    setIsDraw(false);
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
    const { moves, caps } = getLegalMovesForPiece(idx, board);
    setMoveCells(moves);
    setCapCells(caps);
    
    // [패치 1.3] 기물 설명 (튜토리얼 박스 활용)
    setIsCheck(false);
    setIsDraw(false);
    setTutorialText(DESC[piece.color][piece.type]);
  };

  const declareDraw = useCallback((reason: string) => {
    setGameOver(true);
    setIsCheck(false);
    setIsDraw(true);
    setTutorialText(`🤝 무승부! (${reason}) 🤝`);
    speakVoice("무승부로 대국이 종료되었습니다.");
    setTimeout(() => {
      if (confirm(`게임이 무승부로 끝났습니다.\n사유: ${reason}\n메뉴로 돌아갈까요?`)) {
        goToMenu();
      }
    }, 800);
  }, [speakVoice]);

  const afterMove = useCallback((isPlayer: boolean, captured: PieceData | null, movedColor: Team, currentState: BoardState) => {
    if (captured && captured.type === 'king') {
      const winner = gameMode === 'local_pvp' ? (movedColor === 'cho' ? '초나라(초록팀)' : '한나라(빨간팀)') : (movedColor === 'cho' ? '초나라(초록팀, 마스터)' : '한나라(빨간팀, 컴퓨터)');
      setGameOver(true);
      setTutorialText(`🎉 게임 종료! ${winner} 승리! 🎉`);
      setIsCheck(false);
      speakVoice("외통수! 게임이 끝났습니다.");
      setTimeout(() => {
        if (confirm(`외통수! ${winner} 승리!\n메뉴로 돌아갈까요?`)) {
          goToMenu();
        }
      }, 400);
      return;
    }

    // [패치 1.3] 2. 만년장(3회 동형 반복) 무승부 검사
    const historyStr = currentState.map(p => p ? p.color + p.type : '.').join('');
    const newHistory = [...boardHistory, historyStr];
    setBoardHistory(newHistory);
    const repeatCount = newHistory.filter(s => s === historyStr).length;
    if (repeatCount >= 3) {
      declareDraw("동일 국면 3회 반복 - 만년장");
      return;
    }

    // [패치 1.3] 3. 빅장(왕과 왕이 마주봄) 무승부 검사
    const currentlyFacing = isKingFacing(currentState);
    if (isBikjangState && currentlyFacing) {
      declareDraw("빅장 성립 - 두 왕이 마주봄");
      return;
    }
    setIsBikjangState(currentlyFacing);

    const opponentColor = movedColor === 'cho' ? 'han' : 'cho';
    const isOpponentInCheck = isKingInCheck(currentState, opponentColor);
    const isMeStillInCheck = isKingInCheck(currentState, movedColor);

    if (wasInCheckState && !isMeStillInCheck && !currentlyFacing) {
      speakVoice("멍군!");
      setTutorialText("멋지게 멍군! 방어에 성공했습니다.");
    }

    if (isOpponentInCheck && !currentlyFacing) {
      speakVoice("장군!");
      setIsCheck(true);
      setTutorialText("장군!! 적의 왕이 꼼짝 못합니다!");
    } else {
      setIsCheck(false);
    }

    // 빅장 선언 (장군보다 우선순위가 낮음, 경고 메시지로 처리)
    if (currentlyFacing) {
      speakVoice("빅장!");
      setIsCheck(true); // Reuse check alert style or similar
      setTutorialText("🚨 빅장입니다! 피하지 않으면 무승부가 됩니다.");
    }

    const opponentLegalMoves = getAllLegalMoves(currentState, opponentColor);
    if (opponentLegalMoves.length === 0) {
      const winner = gameMode === 'local_pvp' ? (movedColor === 'cho' ? '초나라(초록팀)' : '한나라(빨간팀)') : (movedColor === 'cho' ? '초나라(초록팀, 마스터)' : '한나라(빨간팀, 컴퓨터)');
      setGameOver(true);
      setTutorialText(`🎉 완벽한 외통수! ${winner} 승리! 🎉`);
      setIsCheck(false);
      speakVoice("외통수! 게임이 끝났습니다.");
      setTimeout(() => {
        if (confirm(`더 이상 피할 곳이 없습니다! ${winner} 승리!\n메뉴로 돌아갈까요?`)) {
          goToMenu();
        }
      }, 600);
      return;
    }

    if (gameMode === 'local_pvp') {
      setTurn(opponentColor);
      if (!isOpponentInCheck && !currentlyFacing) {
        setTutorialText(opponentColor === 'cho' ? "초록팀 차례입니다!" : "빨간팀 차례입니다!");
      }
    } else if (gameMode === 'match') {
      if (movedColor === 'cho') {
        setTurn('han');
        if (!isOpponentInCheck && !currentlyFacing) setTutorialText("로봇이 생각 중... 🤔");
      } else {
        setTurn('cho');
        if (!isOpponentInCheck && !currentlyFacing) setTutorialText("마스터 차례! 거침없이 돌격해요!");
      }
    }
  }, [gameMode, isKingInCheck, isKingFacing, getAllLegalMoves, speakVoice, wasInCheckState, boardHistory, declareDraw, isBikjangState]);

  const executeLogic = useCallback((from: number, to: number, isPlayer: boolean, capturedTarget: PieceData | null) => {
    if (clackRef.current) {
      clackRef.current.currentTime = 0;
      clackRef.current.play().catch(() => {});
    }

    const newBoard = [...board];
    const movedColor = newBoard[from]!.color;
    const currentWasInCheck = isKingInCheck(board, movedColor);
    
    newBoard[to] = newBoard[from];
    newBoard[from] = null;
    setBoard(newBoard);
    clearSel();

    setTimeout(() => {
      setIsAnimating(false);
      setWasInCheck(currentWasInCheck);
      afterMove(isPlayer, capturedTarget, movedColor, newBoard);
    }, 350);
  }, [board, afterMove, isKingInCheck]);

  const doMove = useCallback((from: number, to: number, isPlayer: boolean) => {
    setIsAnimating(true);
    executeLogic(from, to, isPlayer, null);
  }, [executeLogic]);

  const doCapture = useCallback((from: number, to: number, isPlayer: boolean) => {
    setIsAnimating(true);
    setCapturingIdx(to);
    const capturedTarget = board[to];
    
    setTimeout(() => {
      setCapturingIdx(null);
      executeLogic(from, to, isPlayer, capturedTarget);
    }, 320);
  }, [board, executeLogic]);

  const computerMove = useCallback(() => {
    if (gameMode !== 'match' || gameOver || isAnimating) return;

    const moves = getAllLegalMoves(board, 'han');
    if (moves.length === 0) return;

    let chosen: { from: number; to: number; isCapture: boolean } | null = null;

    if (gameDiff === 'level1') {
      chosen = moves[Math.floor(Math.random() * moves.length)];
    } else if (gameDiff === 'level2') {
      const caps = moves.filter(m => m.isCapture);
      chosen = caps.length && Math.random() > 0.5 ? caps[Math.floor(Math.random() * caps.length)] : moves[Math.floor(Math.random() * moves.length)];
    } else if (gameDiff === 'level3') {
      let bestVal = -Infinity;
      for (let m of moves) {
        const sim = [...board];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        const val = evaluateBoard(sim);
        if (val > bestVal) {
          bestVal = val;
          chosen = m;
        }
      }
    } else if (gameDiff === 'level4') {
      let bestVal = -Infinity;
      for (let m of moves) {
        const sim = [...board];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        const val = minimax(sim, 1, -Infinity, Infinity, false);
        if (val > bestVal) {
          bestVal = val;
          chosen = m;
        }
      }
    } else if (gameDiff === 'level5') {
      moves.sort((a, b) => (b.isCapture ? 1 : 0) - (a.isCapture ? 1 : 0));
      let bestVal = -Infinity;
      const currentScore = evaluateBoard(board);
      
      for (let m of moves) {
        const sim = [...board];
        sim[m.to] = sim[m.from];
        sim[m.from] = null;
        let val = minimax(sim, 2, -Infinity, Infinity, false);
        
        // [패치 1.3] 빅장 전략적 채택 알고리즘
        if (isKingFacing(sim)) {
          if (currentScore > 50) { val -= 20000; } // AI가 이기고 있으면 무승부 회피
          else { val += 20000; } // AI가 지고 있으면 일부러 빅장(무승부) 유도
        }

        if (val > bestVal) {
          bestVal = val;
          chosen = m;
        }
      }
    }

    if (!chosen) {
      chosen = moves[Math.floor(Math.random() * moves.length)];
      // 하위 난이도에서도 빅장 상태에 따라 움직임을 결정
      const sim = [...board];
      sim[chosen.to] = sim[chosen.from];
      sim[chosen.from] = null;
      const currentScore = evaluateBoard(board);
      if (isKingFacing(sim) && currentScore > 50) {
        chosen = moves[Math.floor(Math.random() * moves.length)];
      }
    }

    if (chosen.isCapture) doCapture(chosen.from, chosen.to, false);
    else doMove(chosen.from, chosen.to, false);
  }, [board, gameMode, gameOver, isAnimating, gameDiff, getAllLegalMoves, evaluateBoard, minimax, doCapture, doMove]);

  useEffect(() => {
    if (turn === 'han' && !gameOver && !isAnimating) {
      const timer = setTimeout(computerMove, gameDiff === 'level5' ? 150 : 750);
      return () => clearTimeout(timer);
    }
  }, [turn, gameOver, isAnimating, computerMove, gameDiff]);

  const onSquareClick = (idx: number) => {
    if (gameOver || isAnimating) return;
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
    } else {
      if (!clicked) return;
      if (gameMode === 'match' && turn !== 'cho') return;
      if (gameMode === 'local_pvp' && clicked.color !== turn) {
        setTutorialText(turn === 'cho' ? "초록팀 차례입니다!" : "빨간팀 차례입니다!");
        return;
      }
      if (gameMode === 'match' && clicked.color !== 'cho') {
        setTutorialText("마스터 차례니까 초록 말만 지휘해주세요!");
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
      <audio ref={bgmRef} loop src="https://assets.mixkit.co/active_storage/sfx/135/135-preview.mp3"></audio>
      <audio ref={clackRef} src="https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3"></audio>

      <div className="top-bar">
        <h1 className="game-title">장기 마스터</h1>
        <div className="btn-group">
          <button id="bgm-toggle" className={`action-btn bgm-btn ${isBgmPlaying ? 'bg-red-500' : 'bg-green-500'}`} onClick={toggleBGM}>
            {isBgmPlaying ? '🔇 음악 끄기' : '🎵 음악 켜기'}
          </button>
          <button className="action-btn menu-back-btn" onClick={goToMenu}>🏠 메뉴</button>
        </div>
      </div>

      <div className="lego-board-wrapper">
        <div className="lego-board" id="board">
          <svg id="board-svg" width="100%" height="100%" viewBox="0 0 8 9" style={{ overflow: 'visible', position: 'absolute', zIndex: 1, pointerEvents: 'none' }}>
            {boardLines}
          </svg>
          
          <div id="click-layer" style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 30 }}>
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

      <p id="tutorial-box" className={`tutorial-box ${isCheck ? 'check-alert' : ''} ${isDraw ? 'draw-alert' : ''}`}>{tutorialText}</p>

      {gameMode === 'none' && !showSetupOverlay && (
        <div id="menu-overlay" className="menu-overlay">
          <div className="menu-title">어떤 모드로 해볼까?</div>
          <button className="menu-btn" onClick={() => selectMode('tutorial', '')}>1. 혼자 규칙 연습하기</button>
          <button className="menu-btn" onClick={() => setShowDiffOptions(true)}>2. 컴퓨터랑 대결하기</button>
          <button className="menu-btn" style={{ backgroundColor: '#4CAF50', color: 'white', borderColor: '#2e7d32' }} onClick={() => selectMode('local_pvp', '')}>3. 2인 대결 (패드 같이 쓰기)</button>
          
          {showDiffOptions && (
            <div id="diff-options" className="diff-container" style={{ display: 'flex' }}>
              <button className="diff-btn" style={{ backgroundColor: '#8bc34a' }} onClick={() => selectMode('match', 'level1')}>1단계: 입문 (랜덤)</button>
              <button className="diff-btn" style={{ backgroundColor: '#ffca28', color: '#333' }} onClick={() => selectMode('match', 'level2')}>2단계: 초급 (공격적)</button>
              <button className="diff-btn" style={{ backgroundColor: '#ff9800' }} onClick={() => selectMode('match', 'level3')}>3단계: 중급 (1수 앞 계산)</button>
              <button className="diff-btn" style={{ backgroundColor: '#f44336' }} onClick={() => selectMode('match', 'level4')}>4단계: 고급 (위협 회피)</button>
              <button className="diff-btn" style={{ backgroundColor: '#9c27b0' }} onClick={() => selectMode('match', 'level5')}>5단계: 마스터 (수읽기 엔진)</button>
            </div>
          )}
        </div>
      )}

      {showSetupOverlay && (
        <div id="setup-overlay" className="menu-overlay">
          <div className="menu-title">{selectingSetupFor === 'cho' ? "마스터(초록팀) 포진 선택!" : "상대방(빨간팀) 포진 선택!"}</div>
          <button className="menu-btn" style={{ backgroundColor: '#aed581' }} onClick={() => handleSetupSelection('MSSM')}>마-상-상-마 (안상, 기본)</button>
          <button className="menu-btn" style={{ backgroundColor: '#fff176' }} onClick={() => handleSetupSelection('SMMS')}>상-마-마-상 (바깥상)</button>
          <button className="menu-btn" style={{ backgroundColor: '#81d4fa' }} onClick={() => handleSetupSelection('MSMS')}>마-상-마-상 (오른상)</button>
          <button className="menu-btn" style={{ backgroundColor: '#ffb74d' }} onClick={() => handleSetupSelection('SMSM')}>상-마-상-마 (왼상)</button>
        </div>
      )}
    </div>
  );
};

export default App;
