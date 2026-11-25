/**
 * 꼬마 장기 학교 — 처음 배우는 아이용 단계별 장기 배우기 모드 (꼬마 체스 학교와 같은 구성)
 * - 말 하나씩 배우기(별 모으기) → 잡기 → 장군 피하기(멍군) → 한 수 외통수
 * - 큰 글씨, 칭찬 메시지, 힌트, 소리 내어 읽어주기(브라우저 음성 합성)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { calcPseudoMoves, isKingInCheck, PieceType, Team, BOARD_SIZE, COLS } from './janggiRules';

interface P { id: number; type: PieceType; color: Team }
type Board = (P | null)[];
type Goal = 'stars' | 'capture' | 'escape' | 'mate';

interface Level {
  pieces: string[];          // 예: 'cR 9,0' = 초록 차를 9행 0열에 ('h'는 빨간 말)
  stars?: string[];          // 예: '5,0'
  goal?: Goal;               // 기본값 'stars'
  only?: PieceType;          // 이 종류의 말만 움직일 수 있음
  hint?: [string, string];   // 정답 [출발, 도착]
  say?: string;              // 단계별 안내
}

interface Lesson {
  key: string;
  icon: PieceType;
  iconColor?: Team;
  title: string;
  intro: string;
  levels: Level[];
}

// ───────────────────────── 수업 내용 ─────────────────────────
// 좌표는 '행,열' — 0행이 맨 위(빨간팀), 9행이 맨 아래(초록팀). 궁성은 7~9행·3~5열(초록), 0~2행·3~5열(빨간)
export const LESSONS: Lesson[] = [
  {
    key: 'rook', icon: 'rook', title: '차 기차',
    intro: '차는 기차처럼 앞, 뒤, 옆으로 쭉쭉 달려요! 초록 말을 누르고 초록 점을 눌러서 별을 모두 모아 보자!',
    levels: [
      { pieces: ['cR 9,0'], stars: ['5,0', '5,6'] },
      { pieces: ['cR 6,4'], stars: ['2,4', '2,8', '9,8'] },
      { pieces: ['cR 9,3'], stars: ['7,5', '7,0', '0,0'],
        say: '궁성(X자 선이 있는 집) 안에서는 차가 대각선 줄을 따라갈 수도 있어요!' },
    ],
  },
  {
    key: 'cannon', icon: 'cannon', title: '포 점프',
    intro: '포는 꼭 다른 말 하나를 뛰어넘어서 가요! 넘을 말(다리)이 없으면 못 가요. 그리고 포끼리는 넘을 수도, 잡을 수도 없어요.',
    levels: [
      { pieces: ['cC 9,1', 'cP 6,1', 'cP 3,4'], stars: ['3,1', '3,7'], only: 'cannon',
        say: '졸을 다리 삼아 폴짝 넘어가 보자!' },
      { pieces: ['cC 9,7', 'cP 6,7', 'hE 2,7', 'cP 2,4', 'hR 2,1'], goal: 'capture', only: 'cannon', hint: ['9,7', '2,7'],
        say: '포는 넘어가서 잡아요! 초록 졸을 다리로 써서 빨간 말을 모두 잡아 보자.' },
      { pieces: ['cC 9,0', 'hC 6,0', 'cP 9,2', 'cP 5,6'], stars: ['9,6', '2,6'], only: 'cannon',
        say: '위쪽 빨간 포는 넘을 수 없어요. 옆의 졸을 다리로 써 보자!' },
    ],
  },
  {
    key: 'knight', icon: 'knight', title: '마 걸음',
    intro: '마는 한 칸 똑바로 간 다음, 한 칸 대각선으로 가요. 날 일(日) 자 모양이에요! 첫 칸이 막혀 있으면 못 가요.',
    levels: [
      { pieces: ['cN 9,1'], stars: ['7,2', '5,3', '4,5'] },
      { pieces: ['cN 9,7', 'cP 8,7'], stars: ['8,5', '6,4', '4,3'], only: 'knight',
        say: '앞이 졸에 막혀서 위로는 못 가요! 옆으로 돌아가 보자.' },
    ],
  },
  {
    key: 'elephant', icon: 'elephant', title: '상 큰걸음',
    intro: '상은 한 칸 똑바로 간 다음, 대각선으로 두 칸 가요. 마보다 한 칸 더 길게 가요! 가는 길이 하나라도 막히면 못 가요.',
    levels: [
      { pieces: ['cE 9,2'], stars: ['6,4', '3,6', '5,3'] },
      { pieces: ['cE 9,6', 'cP 8,6'], stars: ['7,3', '4,5'], only: 'elephant',
        say: '앞이 막혀서 옆으로 돌아가요!' },
    ],
  },
  {
    key: 'palace', icon: 'king', title: '궁성 지킴이',
    intro: '궁(왕)과 사는 궁성 밖으로 나갈 수 없어요! 궁성 안의 선을 따라 한 칸씩 움직여요. 궁은 제일 소중한 말이에요.',
    levels: [
      { pieces: ['cK 8,4'], stars: ['7,3', '9,5', '9,3'] },
      { pieces: ['cG 9,3'], stars: ['8,4', '7,5', '7,3'], say: '사도 궁처럼 궁성 안에서만 다녀요!' },
    ],
  },
  {
    key: 'pawn', icon: 'pawn', title: '용감한 졸',
    intro: '졸은 앞이나 옆으로 한 칸씩 가요. 뒤로는 절대 못 가요! 잡을 때도 똑같이 앞이나 옆으로 잡아요.',
    levels: [
      { pieces: ['cP 6,4'], stars: ['4,4', '4,6', '2,6'] },
      { pieces: ['cP 6,2', 'hP 5,2', 'hE 5,3', 'hN 4,3'], goal: 'capture', hint: ['6,2', '5,2'],
        say: '졸로 빨간 말 3개를 모두 잡아 보자! 앞이나 옆으로만 잡아요.' },
    ],
  },
  {
    key: 'capture', icon: 'pawn', iconColor: 'han', title: '잡기 놀이',
    intro: '상대 말이 있는 자리로 가면 그 말을 잡을 수 있어요! 빨간 동그라미를 눌러서 빨간 말을 모두 잡아 보자.',
    levels: [
      { pieces: ['cR 9,0', 'hP 3,0', 'hN 3,5', 'hE 0,5'], goal: 'capture', hint: ['9,0', '3,0'] },
      { pieces: ['cN 9,1', 'hP 7,2', 'hC 5,3', 'hR 3,4'], goal: 'capture', hint: ['9,1', '7,2'] },
      { pieces: ['cR 9,8', 'cN 9,1', 'hP 5,8', 'hP 7,2', 'hE 5,3'], goal: 'capture', hint: ['9,8', '5,8'] },
    ],
  },
  {
    key: 'check', icon: 'king', title: '장군 피하기',
    intro: '궁이 공격받는 걸 장군이라고 해요! 장군이 되면 꼭 궁을 안전한 곳으로 옮겨야 해요. 잘 피하면 멍군! 빨간 X 자리는 위험한 곳이에요.',
    levels: [
      { pieces: ['cK 8,4', 'hR 3,4'], goal: 'escape', only: 'king', hint: ['8,4', '8,3'],
        say: '빨간 차가 궁을 노려요! 초록 점으로 피하자.' },
      { pieces: ['cK 8,4', 'hR 8,0', 'hR 0,3'], goal: 'escape', only: 'king', hint: ['8,4', '7,5'],
        say: '차가 두 개예요! 두 차가 모두 못 오는 자리를 찾아봐.' },
      { pieces: ['cK 8,4', 'hR 7,4'], goal: 'escape', only: 'king', hint: ['8,4', '7,4'],
        say: '공격하는 말을 궁이 직접 잡아도 돼요!' },
    ],
  },
  {
    key: 'mate', icon: 'king', iconColor: 'han', title: '외통수!',
    intro: '궁이 피할 곳이 하나도 없는 장군을 외통수라고 해요. 외통수를 하면 이겨요! 한 번에 외통수를 만들어 보자.',
    levels: [
      { pieces: ['hK 0,4', 'cR 1,0', 'cR 9,8', 'cK 8,3'], goal: 'mate', hint: ['9,8', '0,8'],
        say: '차 두 개가 사다리처럼 차례로 막아요!' },
      { pieces: ['hK 0,3', 'hE 0,4', 'hE 1,3', 'cR 9,5', 'cK 8,4'], goal: 'mate', hint: ['9,5', '2,5'],
        say: '궁성 안에서는 차가 대각선 줄로도 공격해요! 빨간 궁은 자기 상에 막혀 있어요.' },
      { pieces: ['hK 0,4', 'hE 0,3', 'hE 0,5', 'cR 1,0', 'cN 3,5', 'cK 8,3'], goal: 'mate', hint: ['1,0', '1,4'],
        say: '차를 궁 바로 앞으로! 초록 마가 차를 지켜 줘요.' },
    ],
  },
];

const CHAR: Record<Team, Record<PieceType, string>> = {
  cho: { rook: '車', cannon: '包', knight: '馬', elephant: '象', guard: '士', king: '楚', pawn: '卒' },
  han: { rook: '車', cannon: '包', knight: '馬', elephant: '象', guard: '士', king: '漢', pawn: '兵' },
};
const NAME_TOPIC: Record<PieceType, string> = { rook: '차는', cannon: '포는', knight: '마는', elephant: '상은', guard: '사는', king: '궁은', pawn: '졸은' };
const NAME_OBJ: Record<PieceType, string> = { rook: '차를', cannon: '포를', knight: '마를', elephant: '상을', guard: '사를', king: '궁을', pawn: '졸을' };
const LETTER: Record<string, PieceType> = { R: 'rook', C: 'cannon', N: 'knight', E: 'elephant', G: 'guard', K: 'king', P: 'pawn' };
const PRAISE = ['참 잘했어요!', '최고예요!', '대단해요!', '멋져요!', '천재인데요?'];

const sq = (s: string) => { const [r, c] = s.split(',').map(Number); return r * COLS + c; };

// ───────────────────────── 규칙 도우미 ─────────────────────────
export function buildBoard(level: Level): Board {
  const b: Board = Array(BOARD_SIZE).fill(null);
  level.pieces.forEach((s, i) => {
    const [code, at] = s.split(' ');
    b[sq(at)] = { id: i + 1, color: code[0] === 'c' ? 'cho' : 'han', type: LETTER[code[1]] };
  });
  return b;
}

const pseudoMoves = (b: Board, i: number) => { const { moves, caps } = calcPseudoMoves(i, b); return [...moves, ...caps]; };

function applyMove(b: Board, from: number, to: number): Board {
  const nb = b.slice();
  nb[to] = nb[from];
  nb[from] = null;
  return nb;
}

export function legalMoves(b: Board, i: number): number[] {
  const p = b[i];
  if (!p) return [];
  return pseudoMoves(b, i).filter(to => !isKingInCheck(applyMove(b, i, to), p.color));
}

export function hasAnyLegal(b: Board, color: Team) {
  for (let i = 0; i < BOARD_SIZE; i++) if (b[i]?.color === color && legalMoves(b, i).length) return true;
  return false;
}

// ───────────────────────── 진행 기록 · 음성 ─────────────────────────
const PROGRESS_KEY = 'janggiKidsProgress';
const VOICE_KEY = 'janggiKidsVoice';

function loadProgress(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function saveProgress(p: Record<string, number>) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* 저장 불가 시 무시 */ }
}
function loadVoice(): boolean {
  try { return localStorage.getItem(VOICE_KEY) !== 'off'; } catch { return true; }
}

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
function speakText(text: string) {
  if (!canSpeak) return;
  try {
    const clean = text.replace(/\p{Extended_Pictographic}|️|\([^)]*\)/gu, '').trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ko-KR';
    u.rate = 0.95;
    u.pitch = 1.15;
    window.speechSynthesis.speak(u);
  } catch { /* 음성 미지원 시 무시 */ }
}

const KS_CSS = `
.ks-bar { display:flex; gap:1.4vmin; align-items:center; justify-content:center; width:95%; max-width:600px; margin:0.6vh 0; flex-wrap:wrap; }
.ks-label { font-weight:900; color:#1976d2; font-size:clamp(14px,3vmin,20px); }
.ks-btn { padding:1vmin 2.2vmin; font-size:clamp(13px,2.7vmin,18px); font-weight:bold; border:none; border-radius:2vmin;
  color:#fff; font-family:inherit; cursor:pointer; box-shadow:0.3vmin 0.3vmin 1vmin rgba(0,0,0,.2); transition:transform .1s; }
.ks-btn:active { transform:scale(.94); }
.tutorial-box.ks-msg { font-size:clamp(15px,3.3vmin,22px); font-weight:800; line-height:1.4; min-height:3.2em;
  display:flex; align-items:center; justify-content:center; word-break:keep-all; }
.ks-board-wrap { position:relative; }
.ks-star { position:absolute; left:50%; top:50%; font-size:calc(var(--square-size)*0.62); line-height:1;
  pointer-events:none; animation:ksBob 1s ease-in-out infinite alternate; }
.ks-x { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); color:#e53935; line-height:1;
  font-size:calc(var(--square-size)*0.6); font-weight:900; pointer-events:none; text-shadow:0 0 0.6vmin #fff; }
.intersection.ks-hint { box-shadow:0 0 0 calc(var(--square-size)*0.08) #ff4081; animation:ksHint .55s infinite alternate; }
.intersection.ks-last { background:rgba(255,235,59,.45); }
.piece-wrapper.ks-check .piece { background:#ffcdd2; }
@keyframes ksBob { from { transform:translate(-50%,-56%) scale(.95); } to { transform:translate(-50%,-44%) scale(1.05); } }
@keyframes ksHint { from { filter:brightness(1); } to { filter:brightness(1.35); } }
.ks-overlay { position:absolute; inset:0; background:rgba(255,255,255,.97); z-index:100; display:flex; flex-direction:column;
  align-items:center; padding:2.5vmin; overflow-y:auto; border-radius:1vmin; }
.ks-overlay.center { justify-content:center; text-align:center; }
.ks-title { font-size:clamp(17px,4.2vmin,28px); font-weight:900; color:#d32f2f; margin-bottom:1.5vmin; }
.ks-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5vmin; width:100%; }
.ks-card { background:#fff8e1; border:0.5vmin solid #fbc02d; border-radius:2.5vmin; padding:1vmin 0.5vmin; display:flex;
  flex-direction:column; align-items:center; font-family:inherit; cursor:pointer; color:#333; }
.ks-card.done { background:#e8f5e9; border-color:#43a047; }
.ks-card:active { transform:scale(.95); }
.ks-card .nm { font-size:clamp(11px,2.5vmin,16px); font-weight:800; }
.ks-card .pg { font-size:clamp(10px,2.2vmin,14px); letter-spacing:-0.1em; }
.ks-icon { width:calc(var(--square-size)*0.9); height:calc(var(--square-size)*0.9); filter:drop-shadow(0.2vmin 0.3vmin 0.3vmin rgba(0,0,0,0.4)); }
.ks-icon.big { width:calc(var(--square-size)*1.8); height:calc(var(--square-size)*1.8); margin-bottom:1vmin; }
.ks-icon.big .piece { font-size:calc(var(--square-size)*1.1); }
.ks-icon.cho .piece { color:#2e7d32; }
.ks-icon.han .piece { color:#d32f2f; }
.ks-text { font-size:clamp(15px,3.4vmin,23px); font-weight:700; color:#333; line-height:1.5; margin-bottom:2.5vmin; word-break:keep-all; }
.ks-win { position:absolute; inset:0; background:rgba(255,255,255,.88); z-index:90; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center; overflow:hidden; border-radius:1vmin; }
.ks-win .big { font-size:clamp(26px,7vmin,48px); font-weight:900; color:#ff6f00; animation:ksPop .5s ease-out; }
.ks-conf { position:absolute; top:-10%; font-size:calc(var(--square-size)*0.6); animation:ksFall 2.2s linear forwards; pointer-events:none; }
@keyframes ksPop { 0% { transform:scale(.3); } 70% { transform:scale(1.15); } 100% { transform:scale(1); } }
@keyframes ksFall { to { transform:translateY(calc(var(--square-size) * 12)) rotate(540deg); opacity:.2; } }
`;

function Icon({ type, color, big }: { type: PieceType; color: Team; big?: boolean }) {
  return <div className={`ks-icon ${color} ${big ? 'big' : ''}`}><div className="piece">{CHAR[color][type]}</div></div>;
}

interface Props { onExit: () => void; onLayout: () => void }

export default function KidsSchool({ onExit, onLayout }: Props) {
  const [view, setView] = useState<'list' | 'intro' | 'play'>('list');
  const [lessonIdx, setLessonIdx] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [board, setBoard] = useState<Board>(Array(BOARD_SIZE).fill(null));
  const [stars, setStars] = useState<number[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState<number[]>([]);
  const [bad, setBad] = useState<number[]>([]);
  const [hintSq, setHintSq] = useState<number[]>([]);
  const [hintStep, setHintStep] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [msg, setMsg] = useState('배우고 싶은 수업을 골라 봐!');
  const [phase, setPhase] = useState<'play' | 'won' | 'retry'>('play');
  const [praise, setPraise] = useState(PRAISE[0]);
  const [progress, setProgress] = useState<Record<string, number>>(loadProgress);
  const [voice, setVoice] = useState(loadVoice);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lesson = LESSONS[lessonIdx];
  const level = lesson.levels[levelIdx];
  const goal: Goal = level.goal ?? 'stars';

  // 화면 전환이나 안내 문장 줄 수가 바뀌면 보드 크기 다시 맞춤
  useEffect(() => { onLayout(); }, [view, msg, onLayout]);
  useEffect(() => () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    if (canSpeak) try { window.speechSynthesis.cancel(); } catch { /* 무시 */ }
  }, []);

  const say = useCallback((text: string, speakIt = true) => {
    setMsg(text);
    if (speakIt && voice) speakText(text);
  }, [voice]);

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    try { localStorage.setItem(VOICE_KEY, next ? 'on' : 'off'); } catch { /* 무시 */ }
    if (!next && canSpeak) try { window.speechSynthesis.cancel(); } catch { /* 무시 */ }
    if (next) speakText('읽어주기를 켰어요!');
  };

  const firstMessage = (lv: Level): string => {
    const g = lv.goal ?? 'stars';
    if (lv.say) return lv.say;
    if (g === 'stars') return '초록 말을 누르고, 초록 점을 눌러서 별을 모두 모아 보자!';
    if (g === 'capture') return '빨간 동그라미 자리로 가면 잡을 수 있어요. 빨간 말을 모두 잡아 보자!';
    if (g === 'escape') return '장군! 궁을 안전한 초록 점으로 옮겨 주세요.';
    return '한 번에 외통수를 만들어 보자!';
  };

  const loadLevel = useCallback((li: number, lv: number, speakIt = true) => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const L = LESSONS[li].levels[lv];
    setLessonIdx(li);
    setLevelIdx(lv);
    setBoard(buildBoard(L));
    setStars((L.stars ?? []).map(sq));
    setSel(null); setMoves([]); setBad([]); setHintSq([]); setHintStep(0);
    setLastMove(null);
    setPhase('play');
    setView('play');
    say(firstMessage(L), speakIt);
  }, [say]);

  const openLesson = (li: number) => {
    setLessonIdx(li);
    setLevelIdx(0);
    setView('intro');
    say(`${LESSONS[li].title} 수업이에요!`, false);
    if (voice) speakText(LESSONS[li].intro);
  };

  const backToList = () => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    setView('list');
    say('배우고 싶은 수업을 골라 봐!', false);
  };

  const canMove = (p: P | null) => !!p && p.color === 'cho' && (!level.only || p.type === level.only);

  const select = (i: number, speakIt = true) => {
    const p = board[i]!;
    const lm = legalMoves(board, i);
    setSel(i);
    setMoves(lm);
    setBad(goal === 'escape' && p.type === 'king' ? pseudoMoves(board, i).filter(t => !lm.includes(t)) : []);
    if (!lm.length) say(`이 ${NAME_TOPIC[p.type]} 지금 갈 수 있는 곳이 없어요. 다른 말을 눌러 봐!`, speakIt);
    else if (goal === 'escape') say('초록 점은 안전해요! 빨간 X 자리는 위험해요.', speakIt);
    else say(`${NAME_OBJ[p.type]} 골랐어요! 초록 점으로 움직여 봐.`, speakIt);
  };

  const win = (text: string) => {
    setPhase('won');
    setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    const prev = progress[lesson.key] ?? 0;
    if (levelIdx + 1 > prev) {
      const np = { ...progress, [lesson.key]: levelIdx + 1 };
      setProgress(np);
      saveProgress(np);
    }
    say(text);
  };

  const failAndRetry = (text: string) => {
    setPhase('retry');
    say(text);
    retryTimer.current = setTimeout(() => loadLevel(lessonIdx, levelIdx, false), 2600);
  };

  const doMove = (from: number, to: number) => {
    const captured = board[to];
    const nb = applyMove(board, from, to);
    setBoard(nb);
    setLastMove({ from, to });
    setSel(null); setMoves([]); setBad([]); setHintSq([]); setHintStep(0);

    if (goal === 'stars') {
      const hit = stars.includes(to);
      const left = stars.filter(s => s !== to);
      setStars(left);
      if (!left.length) return win('별을 모두 모았어요!');
      return say(`${hit ? '⭐ 별을 찾았다! ' : '좋아요! '}남은 별은 ${left.length}개!`);
    }

    if (goal === 'capture') {
      const left = nb.filter(p => p?.color === 'han').length;
      if (!left) return win('빨간 말을 모두 잡았어요!');
      if (!hasAnyLegal(nb, 'cho')) return failAndRetry('더 움직일 수 없게 됐어요. 처음부터 다시 해 보자!');
      return say(captured ? `와! 잡았다! 남은 빨간 말은 ${left}개!` : `남은 빨간 말은 ${left}개! 빨간 동그라미를 찾아봐.`);
    }

    if (goal === 'escape') {
      return win(captured ? '공격하던 말을 궁이 잡았어요! 멍군!' : '멍군! 잘 피했어요. 이제 궁이 안전해요!');
    }

    // mate
    const check = isKingInCheck(nb, 'han');
    if (check && !hasAnyLegal(nb, 'han')) return win('외통수! 빨간 궁이 피할 곳이 없어요. 이겼다!');
    if (check) return failAndRetry('장군은 했지만 빨간 궁이 피할 수 있어요. 다시 해 보자!');
    return failAndRetry('아깝다! 장군이 아니에요. 다시 해 보자!');
  };

  const onPoint = (i: number) => {
    if (view !== 'play' || phase !== 'play') return;
    const p = board[i];
    if (sel !== null) {
      if (i === sel) { setSel(null); setMoves([]); setBad([]); return; }
      if (moves.includes(i)) return doMove(sel, i);
      if (bad.includes(i)) return say('앗! 거기로 가면 궁이 또 공격받아요. 초록 점을 찾아봐!');
      if (canMove(p)) return select(i);
    }
    if (canMove(p)) return select(i);
    if (p?.color === 'cho') return say(`이번에는 ${NAME_OBJ[level.only!]} 움직여 보자!`);
    if (p?.color === 'han') return say('그건 빨간 말이에요. 초록 말을 눌러 줘!');
    if (sel !== null) return say('초록 점이 있는 자리로만 갈 수 있어요!');
    say('먼저 초록 말을 눌러 봐!');
  };

  const onHint = () => {
    if (phase !== 'play') return;
    // 정답 말이 아직 출발 자리에 있을 때만 정답 힌트, 아니면 아래의 일반 힌트
    const hintReady = !!level.hint && board[sq(level.hint[0])]?.id === buildBoard(level)[sq(level.hint[0])]?.id;
    if (level.hint && hintReady) {
      const [f, t] = level.hint.map(sq);
      if (hintStep === 0) {
        setHintStep(1); setHintSq([f]);
        return say(`반짝이는 ${NAME_OBJ[board[f]!.type]} 움직여 봐!`);
      }
      setHintSq([f, t]);
      select(f, false);
      return say('반짝이는 자리로 가 봐!');
    }
    // 일반 힌트: 별(또는 잡을 말)에 바로 갈 수 있으면 그 자리를, 아니면 말을 반짝이게
    const from = board.findIndex((p, i) => canMove(p) && legalMoves(board, i).length > 0);
    if (from === -1) return say('🔄 다시 하기를 눌러서 처음부터 해 보자!');
    const lm = legalMoves(board, from);
    const direct = goal === 'capture' ? lm.filter(t => board[t]?.color === 'han') : lm.filter(t => stars.includes(t));
    select(from, false);
    if (direct.length) {
      setHintSq([from, direct[0]]);
      return say(goal === 'capture' ? '반짝이는 자리의 빨간 말을 잡을 수 있어요!' : '반짝이는 자리에 별이 있어요!');
    }
    setHintSq([from]);
    say(goal === 'capture' ? '지금은 바로 못 잡아요. 빨간 말에 가까운 자리로 가 보자!' : '별까지 한 번에는 못 가요. 별에 가까운 자리로 먼저 가 보자!');
  };

  const nextStep = () => {
    if (levelIdx + 1 < lesson.levels.length) return loadLevel(lessonIdx, levelIdx + 1);
    if (lessonIdx + 1 < LESSONS.length) return openLesson(lessonIdx + 1);
    backToList();
    say('모든 수업을 마쳤어요! 이제 진짜 장기 마스터예요!');
  };

  const lastLevel = levelIdx + 1 >= lesson.levels.length;
  const choCheck = view === 'play' && isKingInCheck(board, 'cho');
  const hanCheck = view === 'play' && isKingInCheck(board, 'han');

  return (
    <>
      <style>{KS_CSS}</style>

      <div className="ks-bar ks-top">
        <span className="ks-label">
          🐣 꼬마 장기 학교{view === 'play' ? ` · ${lesson.title} ${levelIdx + 1}/${lesson.levels.length}` : ''}
        </span>
      </div>

      <div className="lego-board-wrapper ks-board-wrap">
        <div className="lego-board">
          <BoardLines />

          <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 30 }}>
            {Array.from({ length: BOARD_SIZE }).map((_, i) => {
              const r = Math.floor(i / COLS), c = i % COLS;
              const isMove = view === 'play' && moves.includes(i);
              const cls = [
                'intersection',
                isMove ? (board[i] ? 'capture-move' : 'valid-move') : '',
                lastMove && (lastMove.from === i || lastMove.to === i) ? 'ks-last' : '',
                hintSq.includes(i) ? 'ks-hint' : '',
              ].join(' ');
              return (
                <div key={i} className={cls} style={{ left: `calc(var(--square-size) * ${c})`, top: `calc(var(--square-size) * ${r})` }}
                  onClick={() => onPoint(i)}>
                  {view === 'play' && stars.includes(i) && !board[i] && <span className="ks-star">⭐</span>}
                  {view === 'play' && bad.includes(i) && <span className="ks-x">✖</span>}
                </div>
              );
            })}
          </div>

          {view === 'play' && board.map((p, i) => {
            if (!p) return null;
            const r = Math.floor(i / COLS), c = i % COLS;
            const inCheck = p.type === 'king' && ((p.color === 'cho' && choCheck) || (p.color === 'han' && hanCheck));
            return (
              <div key={p.id}
                className={`piece-wrapper ${p.color} ${sel === i ? 'selected' : ''} ${inCheck ? 'ks-check' : ''}`}
                style={{ transform: `translate(calc(var(--square-size) * ${c} - 50%), calc(var(--square-size) * ${r} - 50%))` }}>
                <div className="piece">{CHAR[p.color][p.type]}</div>
              </div>
            );
          })}
        </div>

        {view === 'list' && (
          <div className="ks-overlay">
            <div className="ks-title">어떤 말을 배워 볼까?</div>
            <div className="ks-grid">
              {LESSONS.map((L, li) => {
                const done = progress[L.key] ?? 0;
                return (
                  <button key={L.key} className={`ks-card ${done >= L.levels.length ? 'done' : ''}`} onClick={() => openLesson(li)}>
                    <Icon type={L.icon} color={L.iconColor ?? 'cho'} />
                    <div className="nm">{li + 1}. {L.title}</div>
                    <div className="pg">{'⭐'.repeat(Math.min(done, L.levels.length))}{'☆'.repeat(Math.max(0, L.levels.length - done))}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'intro' && (
          <div className="ks-overlay center">
            <div className="ks-title">{lessonIdx + 1}. {lesson.title}</div>
            <Icon type={lesson.icon} color={lesson.iconColor ?? 'cho'} big />
            <div className="ks-text">{lesson.intro}</div>
            <button className="ks-btn" style={{ background: '#43a047', fontSize: 'clamp(16px,3.6vmin,24px)', padding: '1.4vmin 5vmin' }}
              onClick={() => loadLevel(lessonIdx, 0)}>시작! ▶</button>
          </div>
        )}

        {view === 'play' && phase === 'won' && (
          <div className="ks-win">
            {['⭐', '🎉', '🌟', '🎈', '⭐', '🎊', '🌟', '🎉'].map((e, k) => (
              <span key={k} className="ks-conf" style={{ left: `${6 + k * 12}%`, animationDelay: `${(k % 4) * 0.18}s` }}>{e}</span>
            ))}
            <div className="big">{praise}</div>
            <div className="ks-text" style={{ marginTop: '1.5vmin' }}>
              {lastLevel ? `🏅 ${lesson.title} 수업을 모두 마쳤어요!` : `${levelIdx + 1}단계 성공!`}
            </div>
            <div style={{ display: 'flex', gap: '2vmin' }}>
              <button className="ks-btn" style={{ background: '#1976d2' }} onClick={() => loadLevel(lessonIdx, levelIdx)}>🔄 한 번 더</button>
              <button className="ks-btn" style={{ background: '#43a047' }} onClick={nextStep}>
                {!lastLevel ? '다음 단계 ▶' : lessonIdx + 1 < LESSONS.length ? '다음 수업 ▶' : '수업 목록 ▶'}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="tutorial-box ks-msg">{msg}</p>

      <div className="ks-bar ks-bottom">
        {view === 'play' && (
          <>
            <button className="ks-btn" style={{ background: '#7b1fa2' }} onClick={backToList}>📚 수업 목록</button>
            <button className="ks-btn" style={{ background: '#ff9800' }} onClick={onHint}>💡 힌트</button>
            <button className="ks-btn" style={{ background: '#1976d2' }} onClick={() => loadLevel(lessonIdx, levelIdx)}>🔄 다시 하기</button>
          </>
        )}
        {view === 'intro' && <button className="ks-btn" style={{ background: '#7b1fa2' }} onClick={backToList}>📚 수업 목록</button>}
        {view === 'list' && <button className="ks-btn" style={{ background: '#d32f2f' }} onClick={onExit}>🏠 처음 메뉴로</button>}
        {canSpeak && (
          <button className="ks-btn" style={{ background: voice ? '#43a047' : '#9e9e9e' }} onClick={toggleVoice}>
            {voice ? '🔊 읽어주기 켬' : '🔈 읽어주기 끔'}
          </button>
        )}
      </div>
    </>
  );
}

// 장기판 선 (App.tsx의 boardLines와 같은 모양)
function BoardLines() {
  const thin = '0.03', thick = '0.1';
  return (
    <svg width="100%" height="100%" viewBox="0 0 8 9" style={{ overflow: 'visible', position: 'absolute', zIndex: 1, pointerEvents: 'none' }}>
      {Array.from({ length: 10 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i} x2="8" y2={i} stroke="#000" strokeWidth={thin} />)}
      {Array.from({ length: 9 }).map((_, i) => <line key={`v${i}`} x1={i} y1="0" x2={i} y2="9" stroke="#000" strokeWidth={thin} />)}
      <line x1="3" y1="0" x2="5" y2="2" stroke="#000" strokeWidth={thin} />
      <line x1="5" y1="0" x2="3" y2="2" stroke="#000" strokeWidth={thin} />
      <line x1="3" y1="7" x2="5" y2="9" stroke="#000" strokeWidth={thin} />
      <line x1="5" y1="7" x2="3" y2="9" stroke="#000" strokeWidth={thin} />
      <rect x="3" y="0" width="2" height="2" fill="none" stroke="#000" strokeWidth={thick} />
      <rect x="3" y="7" width="2" height="2" fill="none" stroke="#000" strokeWidth={thick} />
    </svg>
  );
}
