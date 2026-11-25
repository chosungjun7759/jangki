// 장기 말 이동 규칙 (App.tsx에서 분리 — 본게임과 꼬마 장기 학교가 같은 규칙을 씀)

export type Team = 'cho' | 'han';
export type PieceType = 'rook' | 'knight' | 'elephant' | 'cannon' | 'guard' | 'king' | 'pawn';

export interface JPiece { type: PieceType; color: Team }
type State = (JPiece | null)[];

export const ROWS = 10;
export const COLS = 9;
export const BOARD_SIZE = ROWS * COLS;

// 잡기·이동 가능한 칸 (자기 왕이 잡히는지는 따지지 않음)
export function calcPseudoMoves(idx: number, state: State): { moves: number[]; caps: number[] } {
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
}

export function isKingInCheck(state: State, targetColor: Team): boolean {
  let kingIdx = -1;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const p = state[i];
    if (p && p.color === targetColor && p.type === 'king') { kingIdx = i; break; }
  }
  if (kingIdx === -1) return false;
  const opponent: Team = targetColor === 'cho' ? 'han' : 'cho';
  for (let i = 0; i < BOARD_SIZE; i++) {
    const p = state[i];
    if (p && p.color === opponent && calcPseudoMoves(i, state).caps.includes(kingIdx)) return true;
  }
  return false;
}
