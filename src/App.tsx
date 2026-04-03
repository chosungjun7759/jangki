/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

// --- Types ---
type Team = 'cho' | 'han';
type PieceType = 'cha' | 'ma' | 'sang' | 'sa' | 'king' | 'po' | 'zol' | 'bing';

interface PieceData {
  id: string;
  text: string;
  team: Team;
  type: PieceType;
  desc: string;
}

type BoardState = (PieceData | null)[];

// --- Constants ---
const ROWS = 10;
const COLS = 9;
const BOARD_SIZE = ROWS * COLS;

const INITIAL_SETUP: { [key: number]: Omit<PieceData, 'id'> } = {
  // Cho (Blue) - Top
  0: { text: '車', team: 'cho', type: 'cha', desc: "초 '차(車)': 직선으로 끝까지 달려요!" },
  1: { text: '馬', team: 'cho', type: 'ma', desc: "초 '마(馬)': 직선 1칸 후 대각 1칸!" },
  2: { text: '象', team: 'cho', type: 'sang', desc: "초 '상(象)': 직선 1칸 후 대각 2칸!" },
  3: { text: '士', team: 'cho', type: 'sa', desc: "초 '사(士)': 궁성 안에서만 움직여요." },
  5: { text: '士', team: 'cho', type: 'sa', desc: "초 '사(士)': 궁성 안에서만 움직여요." },
  6: { text: '象', team: 'cho', type: 'sang', desc: "초 '상(象)': 직선 1칸 후 대각 2칸!" },
  7: { text: '馬', team: 'cho', type: 'ma', desc: "초 '마(馬)': 직선 1칸 후 대각 1칸!" },
  8: { text: '車', team: 'cho', type: 'cha', desc: "초 '차(車)': 직선으로 끝까지 달려요!" },
  13: { text: '楚', team: 'cho', type: 'king', desc: "초나라 대장 '초(楚)': 궁성 안에서만!" }, 
  19: { text: '包', team: 'cho', type: 'po', desc: "초 '포(包)': 기물 1개를 넘어서 공격!" },
  25: { text: '包', team: 'cho', type: 'po', desc: "초 '포(包)': 기물 1개를 넘어서 공격!" },
  27: { text: '卒', team: 'cho', type: 'zol', desc: "초 '졸(卒)': 앞 또는 옆으로 1칸!" },
  29: { text: '卒', team: 'cho', type: 'zol', desc: "초 '졸(卒)': 앞 또는 옆으로 1칸!" },
  31: { text: '卒', team: 'cho', type: 'zol', desc: "초 '졸(卒)': 앞 또는 옆으로 1칸!" },
  33: { text: '卒', team: 'cho', type: 'zol', desc: "초 '졸(卒)': 앞 또는 옆으로 1칸!" },
  35: { text: '卒', team: 'cho', type: 'zol', desc: "초 '졸(卒)': 앞 또는 옆으로 1칸!" },

  // Han (Red) - Bottom
  54: { text: '兵', team: 'han', type: 'bing', desc: "한 '병(兵)': 앞 또는 옆으로 1칸!" },
  56: { text: '兵', team: 'han', type: 'bing', desc: "한 '병(兵)': 앞 또는 옆으로 1칸!" },
  58: { text: '兵', team: 'han', type: 'bing', desc: "한 '병(兵)': 앞 또는 옆으로 1칸!" },
  60: { text: '兵', team: 'han', type: 'bing', desc: "한 '병(兵)': 앞 또는 옆으로 1칸!" },
  62: { text: '兵', team: 'han', type: 'bing', desc: "한 '병(兵)': 앞 또는 옆으로 1칸!" },
  64: { text: '包', team: 'han', type: 'po', desc: "한 '포(包)': 기물 1개를 넘어서 공격!" },
  70: { text: '包', team: 'han', type: 'po', desc: "한 '포(包)': 기물 1개를 넘어서 공격!" },
  76: { text: '漢', team: 'han', type: 'king', desc: "한나라 대장 '한(漢)': 궁성 안에서만!" }, 
  81: { text: '車', team: 'han', type: 'cha', desc: "한 '차(車)': 직선으로 끝까지 달려요!" },
  82: { text: '馬', team: 'han', type: 'ma', desc: "한 '마(馬)': 직선 1칸 후 대각 1칸!" },
  83: { text: '象', team: 'han', type: 'sang', desc: "한 '상(象)': 직선 1칸 후 대각 2칸!" },
  84: { text: '士', team: 'han', type: 'sa', desc: "한 '사(士)': 궁성 안에서만 움직여요." },
  86: { text: '士', team: 'han', type: 'sa', desc: "한 '사(士)': 궁성 안에서만 움직여요." },
  87: { text: '象', team: 'han', type: 'sang', desc: "한 '상(象)': 직선 1칸 후 대각 2칸!" },
  88: { text: '馬', team: 'han', type: 'ma', desc: "한 '마(馬)': 직선 1칸 후 대각 1칸!" },
  89: { text: '車', team: 'han', type: 'cha', desc: "한 '차(車)': 직선으로 끝까지 달려요!" },
};

const DIAG_SET = new Set(['0,3','1,4','2,5','0,5','2,3','7,3','8,4','9,5','7,5','9,3']);

export default function App() {
  const [board, setBoard] = useState<BoardState>(() => {
    const initialBoard = Array(BOARD_SIZE).fill(null);
    Object.entries(INITIAL_SETUP).forEach(([index, data]) => {
      initialBoard[parseInt(index)] = { ...data, id: `piece-${index}-${Math.random()}` };
    });
    return initialBoard;
  });

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [moveCells, setMoveCells] = useState<number[]>([]);
  const [capCells, setCapCells] = useState<number[]>([]);
  const [tutorialText, setTutorialText] = useState("안녕! 장기말을 터치해서 어디로 갈 수 있는지 알아봐! 🎉");
  const [isPlayingBgm, setIsPlayingBgm] = useState(false);
  const [cellSize, setCellSize] = useState(60);
  const [capturedPiece, setCapturedPiece] = useState<{ piece: PieceData, index: number } | null>(null);

  const playerRef = useRef<any>(null);
  const captureSoundRef = useRef<HTMLAudioElement | null>(null);
  const topUiRef = useRef<HTMLDivElement>(null);
  const tutorialBoxRef = useRef<HTMLDivElement>(null);

  // --- Dynamic Resizing ---
  const fitBoard = useCallback(() => {
    const topUiHeight = topUiRef.current?.offsetHeight || 0;
    const tutorialBoxHeight = tutorialBoxRef.current?.offsetHeight || 0;
    const uiH = topUiHeight + tutorialBoxHeight + 32; 
    const availH = window.innerHeight - uiH;
    const availW = window.innerWidth * 0.97;
    const cell = Math.floor(Math.min(availW / 9, availH / 10));
    setCellSize(cell);
    document.documentElement.style.setProperty('--cell-size', `${cell}px`);
  }, []);

  useEffect(() => {
    fitBoard();
    window.addEventListener('resize', fitBoard);
    return () => window.removeEventListener('resize', fitBoard);
  }, [fitBoard]);

  // --- YouTube API ---
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        height: '0', width: '0', videoId: 'iQIkgz9P-nM',
        host: 'https://www.youtube-nocookie.com',
        playerVars: { 'autoplay': 0, 'loop': 1, 'playlist': 'iQIkgz9P-nM' }
      });
    };
  }, []);

  const toggleBgm = () => {
    if (captureSoundRef.current) captureSoundRef.current.load();
    if (!playerRef.current) return;
    if (isPlayingBgm) {
      playerRef.current.pauseVideo();
      setIsPlayingBgm(false);
    } else {
      playerRef.current.playVideo();
      setIsPlayingBgm(true);
    }
  };

  // --- Move Logic ---
  const ok = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
  const toI = (r: number, c: number) => r * COLS + c;
  const inTopP = (r: number, c: number) => r >= 0 && r <= 2 && c >= 3 && c <= 5;
  const inBotP = (r: number, c: number) => r >= 7 && r <= 9 && c >= 3 && c <= 5;
  const canDiag = (r1: number, c1: number, r2: number, c2: number) =>
    DIAG_SET.has(`${r1},${c1}`) && DIAG_SET.has(`${r2},${c2}`);

  const calcMoves = useCallback((idx: number, type: PieceType, team: Team) => {
    const moves: number[] = [], caps: number[] = [];
    const r = Math.floor(idx / COLS), c = idx % COLS;
    const enemy = team === 'cho' ? 'han' : 'cho';

    const reg = (nr: number, nc: number) => {
      if (!ok(nr, nc)) return;
      const t = board[toI(nr, nc)];
      if (!t) moves.push(toI(nr, nc));
      else if (t.team === enemy) caps.push(toI(nr, nc));
    };

    if (type === 'cha') {
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        for (let i = 1; i < 10; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (!ok(nr, nc)) break;
          const t = board[toI(nr, nc)];
          if (!t) { moves.push(toI(nr, nc)); continue; }
          if (t.team === enemy) caps.push(toI(nr, nc));
          break;
        }
      });
    } else if (type === 'ma') {
      [{ d1: [-1, 0], d2: [[-2, -1], [-2, 1]] }, { d1: [1, 0], d2: [[2, -1], [2, 1]] },
       { d1: [0, -1], d2: [[-1, -2], [1, -2]] }, { d1: [0, 1], d2: [[-1, 2], [1, 2]] }
      ].forEach(({ d1, d2 }) => {
        const ri = r + d1[0], ci = c + d1[1];
        if (!ok(ri, ci) || board[toI(ri, ci)]) return;
        d2.forEach(([dr, dc]) => reg(r + dr, c + dc));
      });
    } else if (type === 'sang') {
      [{ d1: [-1, 0], d2: [[-1, -1], [-1, 1]] }, { d1: [1, 0], d2: [[1, -1], [1, 1]] },
       { d1: [0, -1], d2: [[-1, -1], [1, -1]] }, { d1: [0, 1], d2: [[-1, 1], [1, 1]] }
      ].forEach(({ d1, d2 }) => {
        const r1 = r + d1[0], c1 = c + d1[1];
        if (!ok(r1, c1) || board[toI(r1, c1)]) return;
        d2.forEach(([dr, dc]) => {
          const r2 = r1 + dr, c2 = c1 + dc;
          if (!ok(r2, c2) || board[toI(r2, c2)]) return;
          reg(r2 + dr, c2 + dc);
        });
      });
    } else if (type === 'sa' || type === 'king') {
      const inP = inTopP(r, c) ? inTopP : inBotP;
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        if (inP(r + dr, c + dc)) reg(r + dr, c + dc);
      });
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
        if (inP(r + dr, c + dc) && canDiag(r, c, r + dr, c + dc)) reg(r + dr, c + dc);
      });
    } else if (type === 'po') {
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        let jumped = false;
        for (let i = 1; i < 10; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (!ok(nr, nc)) break;
          const t = board[toI(nr, nc)];
          if (!jumped) {
            if (t) { if (t.type === 'po') break; jumped = true; }
          } else {
            if (t) { if (t.team === enemy && t.type !== 'po') caps.push(toI(nr, nc)); break; }
            moves.push(toI(nr, nc));
          }
        }
      });
    } else if (type === 'zol') {
      [[1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => reg(r + dr, c + dc));
    } else if (type === 'bing') {
      [[-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => reg(r + dr, c + dc));
    }

    return { moves, caps };
  }, [board]);

  const handleSquareClick = (index: number) => {
    const clickedPiece = board[index];

    if (selectedIdx !== null) {
      if (index === selectedIdx) {
        setSelectedIdx(null);
        setMoveCells([]);
        setCapCells([]);
        setTutorialText('다른 장기 친구를 선택해 보세요!');
        return;
      }

      if (moveCells.includes(index)) {
        setTutorialText('스르륵~ 이동 완료! ✨');
        executeMove(selectedIdx, index, false);
        return;
      }

      if (capCells.includes(index)) {
        const target = board[index];
        if (target) {
          setTutorialText(`얍! 적군 ${target.text}을(를) 물리쳤어요! 🎉`);
          setCapturedPiece({ piece: target, index });
          if (captureSoundRef.current) {
            captureSoundRef.current.currentTime = 0;
            captureSoundRef.current.play().catch(() => {});
          }
          if (navigator.vibrate) navigator.vibrate(200);
        }
        executeMove(selectedIdx, index, true);
        return;
      }

      setTutorialText('거기는 갈 수 없어! 초록 불빛을 따라가봐! 🟢');
    } else {
      if (clickedPiece) {
        setSelectedIdx(index);
        const { moves, caps } = calcMoves(index, clickedPiece.type, clickedPiece.team);
        setMoveCells(moves);
        setCapCells(caps);
        setTutorialText(clickedPiece.desc);
      }
    }
  };

  const executeMove = (from: number, to: number, isCapture: boolean) => {
    const movingPiece = board[from];
    const targetPiece = board[to];

    const newBoard = [...board];
    newBoard[to] = movingPiece;
    newBoard[from] = null;

    setBoard(newBoard);
    setSelectedIdx(null);
    setMoveCells([]);
    setCapCells([]);

    if (isCapture && targetPiece?.type === 'king') {
      const winner = movingPiece?.team === 'cho' ? '초나라(파란색)' : '한나라(빨간색)';
      setTimeout(() => {
        setTutorialText(`🎉 ${winner} 팀 승리! 🎉`);
        alert(`외통수! ${winner}의 승리!`);
      }, 400);
    }

    if (isCapture) {
      setTimeout(() => setCapturedPiece(null), 400);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen select-none overflow-hidden">
      <div ref={topUiRef} className="flex flex-col items-center gap-2 mb-2">
        <h1 className="text-3xl font-black text-[#3a1a00] tracking-tight drop-shadow-sm">🀄 레고 장기 교실</h1>
        <button 
          onClick={toggleBgm}
          className={`px-6 py-1.5 rounded-2xl text-white font-bold shadow-md transition-all active:scale-95 ${
            isPlayingBgm ? 'bg-green-600' : 'bg-[#c0392b]'
          }`}
        >
          {isPlayingBgm ? '🔇 구구단송 끄기' : '🎵 구구단송 켜기'}
        </button>
      </div>

      <div id="youtube-player" className="hidden"></div>
      <audio ref={captureSoundRef} src="https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3" preload="auto" />

      <div className="janggi-board-refined">
        {/* SVG Background */}
        <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" viewBox="0 0 900 1000" preserveAspectRatio="none">
          <g stroke="#5c3a21" strokeWidth="1.8">
            <line x1="50" y1="50"  x2="850" y2="50"/>
            <line x1="50" y1="150" x2="850" y2="150"/>
            <line x1="50" y1="250" x2="850" y2="250"/>
            <line x1="50" y1="350" x2="850" y2="350"/>
            <line x1="50" y1="450" x2="850" y2="450"/>
            <line x1="50" y1="550" x2="850" y2="550"/>
            <line x1="50" y1="650" x2="850" y2="650"/>
            <line x1="50" y1="750" x2="850" y2="750"/>
            <line x1="50" y1="850" x2="850" y2="850"/>
            <line x1="50" y1="950" x2="850" y2="950"/>
          </g>
          <g stroke="#5c3a21" strokeWidth="1.8">
            <line x1="50"  y1="50" x2="50"  y2="950"/>
            <line x1="150" y1="50" x2="150" y2="950"/>
            <line x1="250" y1="50" x2="250" y2="950"/>
            <line x1="350" y1="50" x2="350" y2="950"/>
            <line x1="450" y1="50" x2="450" y2="950"/>
            <line x1="550" y1="50" x2="550" y2="950"/>
            <line x1="650" y1="50" x2="650" y2="950"/>
            <line x1="750" y1="50" x2="750" y2="950"/>
            <line x1="850" y1="50" x2="850" y2="950"/>
          </g>
          <rect x="350" y="50" width="200" height="200" fill="none" stroke="#4060a0" strokeWidth="2.5" strokeDasharray="8,4" opacity="0.6"/>
          <line x1="350" y1="50"  x2="550" y2="250" stroke="#4060a0" strokeWidth="2" opacity="0.8"/>
          <line x1="550" y1="50"  x2="350" y2="250" stroke="#4060a0" strokeWidth="2" opacity="0.8"/>
          <rect x="350" y="50" width="200" height="200" fill="rgba(100,140,220,0.08)" stroke="none"/>
          <rect x="350" y="750" width="200" height="200" fill="none" stroke="#a04040" strokeWidth="2.5" strokeDasharray="8,4" opacity="0.6"/>
          <line x1="350" y1="750" x2="550" y2="950" stroke="#a04040" strokeWidth="2" opacity="0.8"/>
          <line x1="550" y1="750" x2="350" y2="950" stroke="#a04040" strokeWidth="2" opacity="0.8"/>
          <rect x="350" y="750" width="200" height="200" fill="rgba(220,100,100,0.08)" stroke="none"/>
          <rect x="52" y="452" width="796" height="96" fill="rgba(100,160,220,0.10)" stroke="none"/>
          <line x1="50" y1="500" x2="850" y2="500" stroke="#4a90c4" strokeWidth="1.2" strokeDasharray="12,8" opacity="0.5"/>
          <text x="230" y="508" fontSize="28" fill="#2255aa" opacity="0.55" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fontFamily="serif">楚　河</text>
          <text x="670" y="508" fontSize="28" fill="#aa2222" opacity="0.55" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fontFamily="serif">漢　界</text>
        </svg>

        {/* Click Grid */}
        <div className="grid grid-cols-9 grid-rows-10 absolute inset-0 z-20">
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <div 
              key={i}
              onClick={() => handleSquareClick(i)}
              className={`relative cursor-pointer transition-colors duration-200 ${
                moveCells.includes(i) ? 'valid-move-indicator-refined' : ''
              } ${capCells.includes(i) ? 'capture-target-indicator' : ''}`}
            />
          ))}
        </div>

        {/* Pieces Layer */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <AnimatePresence>
            {board.map((piece, i) => {
              if (!piece) return null;
              const r = Math.floor(i / COLS), c = i % COLS;
              const isSelected = selectedIdx === i;

              return (
                <motion.div
                  key={piece.id}
                  layoutId={piece.id}
                  initial={false}
                  animate={{
                    x: `calc(${c} * var(--cell-size) + var(--piece-offset))`,
                    y: `calc(${r} * var(--cell-size) + var(--piece-offset))`,
                    scale: isSelected ? 1.15 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  className={`piece-refined ${piece.team} ${piece.type === 'king' ? 'king' : ''} ${isSelected ? 'selected' : ''}`}
                >
                  {piece.text}
                </motion.div>
              );
            })}
            {capturedPiece && (
              <motion.div
                key={`cap-${capturedPiece.piece.id}`}
                initial={{ opacity: 1, scale: 1, rotate: 0 }}
                animate={{ opacity: 0, scale: 0, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className={`piece-refined ${capturedPiece.piece.team} ${capturedPiece.piece.type === 'king' ? 'king' : ''} z-30`}
                style={{
                  left: `calc(${capturedPiece.index % COLS} * var(--cell-size) + var(--piece-offset))`,
                  top: `calc(${Math.floor(capturedPiece.index / COLS)} * var(--cell-size) + var(--piece-offset))`,
                }}
              >
                {capturedPiece.piece.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div 
        ref={tutorialBoxRef}
        key={tutorialText}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 p-3 bg-gradient-to-br from-[#fffde7] to-[#fff9c4] border-2 border-dashed border-[#f0a000] rounded-2xl text-lg text-center shadow-md flex items-center justify-center gap-2 text-gray-800"
        style={{ width: `calc(${cellSize} * 9)` }}
      >
        <Info className="text-[#f0a000]" size={20} />
        {tutorialText}
      </motion.div>
    </div>
  );
}
