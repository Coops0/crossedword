import { CellIndex, CellValue } from './provider.ts';
import { GridDirection, PuzzleStatus } from './controller.ts';

export interface PuzzleSession {
    id: number;
    board: CellValue[][];
    selectedCell: CellIndex;
    direction: GridDirection;
    status: PuzzleStatus;
}

export function loadPuzzle(puzzleId: number): PuzzleSession | null {
    try {
        const puzzles = JSON.parse(localStorage.getItem('puzzles') || '[]') as PuzzleSession[];
        return puzzles.find((puzzle: PuzzleSession) => puzzle.id === puzzleId) ?? null;
    } catch {
        return null;
    }
}

export function savePuzzle(puzzleId: number, board: CellValue[][], selectedCell: CellIndex, direction: GridDirection, status: PuzzleStatus): void {
    let puzzles: PuzzleSession[] = [];
    try {
        puzzles = JSON.parse(localStorage.getItem('puzzles') || '[]') as PuzzleSession[];
    } catch {
        /* ignored */
    }

    const existingPuzzleIndex = puzzles.findIndex((puzzle: PuzzleSession) => puzzle.id === puzzleId);
    if (existingPuzzleIndex !== -1) {
        puzzles[existingPuzzleIndex] = { id: puzzleId, board, selectedCell, direction, status };
    } else {
        puzzles.push({ id: puzzleId, board, selectedCell, direction, status });
    }

    localStorage.setItem('puzzles', JSON.stringify(puzzles));
}