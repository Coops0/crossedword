import { CellIndex, CellValue, Clue, Puzzle } from './provider.ts';
import { loadPuzzle, savePuzzle } from './storage.ts';
import { isSameCell } from '../util.ts';

export type GridDirection = 'across' | 'down';
export type PuzzleStatus = 'in-progress' | 'filled' | 'completed' | 'not-started';
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
    get puzzle(): Puzzle {
        return this._puzzle;
    }
    get clues(): { across: Clue[], down: Clue[] } {
        return {
            across: this._puzzle.acrossClues,
            down: this._puzzle.downClues
        };
    }
    get board(): CellValue[][] {
        return this._board;
    }
    get selectedCell(): CellIndex {
        return this._selectedCell;
    }
    get direction(): GridDirection {
        return this._direction;
    }
    get status(): PuzzleStatus {
        return this._status;
    }
    // @formatter:on

    start() {
        this._status = 'in-progress';
    }

    handleKeyPress(key: String) {
        if (key === 'Backspace') {
            // Backspace we want to clear the current cell then move back
            this.updateSelectedCell('');
            this.moveCursor('left');
        } else if (key === 'Enter' || key === 'Tab') {
            // Enter or Tab we want to find the next clue forcefully, and if we are at the end of clues, then go back to the start
            this.moveCursor('right', true);
        } else if (key === 'ArrowLeft') {
            // Any arrow keys, if our direction doesn't match the key direction, then we just change direction and stop.
            // If it does match, then we move the cursor in that direction forcefully
            if (this.changeDirection('across')) return;
            this.moveCursor('left', true);
        } else if (key === 'ArrowRight') {
            if (this.changeDirection('across')) return;
            this.moveCursor('right', true);
        } else if (key === 'ArrowUp') {
            if (this.changeDirection('down')) return;
            this.moveCursor('up', true);
        } else if (key === 'ArrowDown') {
            if (this.changeDirection('down')) return;
            this.moveCursor('down', true);
        } else if (key === ' ') {
            // Space we want to act like we are inserting a space (but really we are just clearing the cell) then move right
            this.updateSelectedCell('');
            this.moveCursor('right');
        } else if (key.length === 1) {
            // Any other key is the character to insert into the cell.
            // This can be pretty much any character
            this.updateSelectedCell(key as CellValue);
            this.moveCursor('right');
        }
    }

    handleClickCell(cell: CellIndex) {
        if (isSameCell(cell, this._selectedCell)) {
            // If we click the same cell, we want to change the direction
            this._direction = this._direction === 'across' ? 'down' : 'across';
        } else if (this.isValidCell(cell[0], cell[1])) {
            this._selectedCell = cell;
        }
    }

    private updateFilledStatus() {
        if (this.isFilledCorrectly) {
            this._status = 'completed';
        } else if (this.isFilled) {
            this._status = 'filled';
        }
    }

    private updateSelectedCell(value: CellValue) {
        const [row, col] = this._selectedCell;
        this._board[row][col] = value;

        this.updateFilledStatus();
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
        const clue = clues.find(clue => isSameCell([row, col], clue.cells[0]));

        if (!clue) {
            console.error(`Could not find clue at ${row}, ${col}, direction: ${this._direction}`);
            return clues[0];
        }

        return clue;
    }

    isClueFilled(clueId: number, direction: GridDirection): boolean {
        const clue = this.cluesForDirection(direction).find(clue => clue.id === clueId)!;
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

    get isFilled(): boolean {
        return this._board.every(row => row.every(cell => cell !== ''));
    }

    get isFilledCorrectly(): boolean {
        return this._board.every((row, rowIndex) => {
            return row.every((cell, colIndex) => this._puzzle.cells[rowIndex][colIndex] === cell);
        });
    }

    jumpToClue(clueIndex: number, direction: GridDirection) {
        const clue = this.cluesForDirection(direction).find(clue => clue.id === clueIndex);
        if (clue) {
            this._direction = direction;
            this._selectedCell = clue.cells[0];
        } else {
            console.error(`Could not find clue with ID ${clueIndex}`);
        }
    }

    save() {
        savePuzzle(this._puzzle.id, this._board, this._selectedCell, this._direction, this._status);
    }
}

function puzzleToBoard(puzzle: Puzzle): CellValue[][] {
    return puzzle.cells.map(row => row.map(cell => cell === null ? null : ''));
}