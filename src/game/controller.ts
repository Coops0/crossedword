import { CellIndex, CellValue, Clue, Puzzle } from './provider.ts';
import { loadPuzzle } from './storage.ts';

export type GridDirection = 'across' | 'down';
export type PuzzleStatus = 'in-progress' | 'filled' | 'not-started';
export type MovementDirection = 'left' | 'right' | 'up' | 'down';

export class Controller {
    private readonly _puzzle: Puzzle;
    private readonly _board: CellValue[][];
    private _selectedCell: CellIndex;
    private _direction: 'across' | 'down';
    private _status: PuzzleStatus;

    constructor(puzzle: Puzzle) {
        this._puzzle = puzzle;
        const session = loadPuzzle(puzzle.id) ?? {
            id: puzzle.id,
            board: puzzleToBoard(puzzle),
            selectedCell: [0, 0],
            direction: 'across',
            status: 'not-started'
        };

        this._board = session.board;
        this._selectedCell = session.selectedCell;
        this._direction = session.direction;
        this._status = session.status;
    }

    // @formatter:off
    get clues(): { across: Clue[], down: Clue[] } {
        return {
            across: this._puzzle.acrossClues,
            down: this._puzzle.downClues
        };
    }
    get board(): CellValue[][] {
        return this._board;
    }
    get selectedCell(): CellIndex | null {
        return this._selectedCell;
    }
    get direction(): GridDirection {
        return this._direction;
    }
    get status(): PuzzleStatus {
        return this._status;
    }
    // @formatter:on

    handleKeyPress(key: String) {
        const caseInsensitiveKey = key.toLowerCase();
        if (caseInsensitiveKey === 'backspace') {
            // Backspace we want to clear the current cell then move back
            this.updateSelectedCell('');
            this.moveCursor('left');
        } else if (caseInsensitiveKey === 'enter' || caseInsensitiveKey === 'tab') {
            // Enter or Tab we want to find the next clue forcefully, and if we are at the end of clues, then go back to the start
            this.moveCursor('right', true);
        } else if (caseInsensitiveKey === 'left') {
            // Any arrow keys, if our direction doesn't match the key direction, then we just change direction and stop.
            // If it does match, then we move the cursor in that direction forcefully
            if (this.changeDirection('across')) return;
            this.moveCursor('left', true);
        } else if (caseInsensitiveKey === 'right') {
            if (this.changeDirection('across')) return;
            this.moveCursor('right', true);
        } else if (caseInsensitiveKey === 'up') {
            if (this.changeDirection('down')) return;
            this.moveCursor('up', true);
        } else if (caseInsensitiveKey === 'down') {
            if (this.changeDirection('down')) return;
            this.moveCursor('down', true);
        } else if (caseInsensitiveKey === 'space') {
            // Space we want to act like we are inserting a space (but really we are just clearing the cell) then move right
            this.updateSelectedCell('');
            this.moveCursor('right');
        } else if (key.length === 1) {
            // Any other key is the character to insert into the cell.
            // This can be pretty much any ASCII character
            this.updateSelectedCell(key as CellValue);
            this.moveCursor('right');
        }
    }

    private updateSelectedCell(value: CellValue) {
        const [row, col] = this._selectedCell;
        this._board[row][col] = value;
    }

    private moveCursor(direction: MovementDirection, force = false) {
        const [row, col] = this._selectedCell;
        let newRow = row;
        let newCol = col;

        // @formatter:off
        if (direction === 'left') { newCol--; }
        else if (direction === 'right') { newCol++;}
        else if (direction === 'up') { newRow--; }
        else if (direction === 'down') { newRow++; }
        // @formatter:on

        if (this.isValidCell(newRow, newCol)) {
            this._selectedCell = [newRow, newCol];
        } else if (force) {
            this._selectedCell = this.findNextClue(this._direction);
        } else {
            // If it's an invalid cell and not a forceful movement, we don't move.
        }
    }

    private isValidCell(row: number, col: number): boolean {
        return row >= 0 && col >= 0 &&
            row < this._puzzle.height && col < this._puzzle.width &&
            this._puzzle.cells[row][col] !== null;
    }

    cluesForDirection(direction: GridDirection): Clue[] {
        return direction === 'across' ? this._puzzle.acrossClues : this._puzzle.downClues;
    }

    get currentClue(): Clue {
        let [row, col] = this._selectedCell;
        if (this._direction === 'across') {
            while (this.isValidCell(row, col)) { col--; }
            // Move forward one, since we navigate to the first invalid cell
            col++;
        } else {
            while (this.isValidCell(row, col)) { row--; }
            row++;
        }

        const clues = this.cluesForDirection(this._direction);
        const clue = clues.find(clue => {
            const [r, c] = clue.cells[0];
            return r === row && c === col;
        });

        if (!clue) {
            console.error(`Could not find clue at ${row}, ${col}, direction: ${this._direction}`);
            return clues[0];
        }

        return clue;
    }

    get isClueFilled(): boolean {
        const clue = this.currentClue;
        return clue.cells.every(([row, col]) => this._board[row][col] !== '');
    }

    private findNextClue(direction: GridDirection): CellIndex {
        const clues = this.cluesForDirection(direction);
        const currentClue = this.currentClue;

        return (clues.find(clue => clue.id > currentClue.id) || clues[0]).cells[0];
    }

    private changeDirection(direction: GridDirection): boolean {
        if (this._direction !== direction) {
            this._direction = direction;
            return true;
        }
        return false;
    }

    get isFullyFilledCorrectly(): boolean {
        return this._puzzle.cells.every((row, rowIndex) => {
            return row.every((cell, colIndex) => {
                const cellValue = this._board[rowIndex][colIndex];
                return cell === null || cellValue === cell;
            });
        });
    }
}

function puzzleToBoard(puzzle: Puzzle): CellValue[][] {
    return puzzle.cells.map(row => row.map(cell => cell === null ? null : ''));
}