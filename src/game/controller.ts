import { CellIndex, CellValue, Clue, Puzzle } from './provider.ts';
import { loadPuzzle, savePuzzle } from './storage.ts';
import { isSameCell, opposingDirection } from '../util.ts';
import { Preferences } from './preferences.ts';

export type GridDirection = 'across' | 'down';
export type PuzzleStatus = 'in-progress' | 'filled' | 'completed' | 'not-started';
export type MovementDirection = 'left' | 'right' | 'up' | 'down';

export class Controller {
    private readonly _puzzle: Puzzle;
    private readonly _preferences: Preferences;
    private readonly _board: CellValue[][];
    private _selectedCell: CellIndex;
    private _direction: 'across' | 'down';
    private _status: PuzzleStatus;

    constructor(puzzle: Puzzle, preferences: Preferences) {
        this._puzzle = puzzle;
        const session = loadPuzzle(puzzle.id) ?? {
            id: puzzle.id,
            board: puzzleToBoard(puzzle),
            selectedCell: [0, 0],
            direction: 'across',
            status: 'not-started'
        };
        this._preferences = preferences;

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
            this.moveCursor(this._direction === 'across' ? 'left' : 'up', false, true);
        } else if (key === 'Enter' || key === 'Tab') {
            // Enter or Tab we want to find the next clue forcefully, and if we are at the end of clues, then go back to the start
            const next = this.findNextClue(this._direction);
            if (next) {
                this._selectedCell = next;
            } else {
                // At the end of this grid, go back to the start in the opposite direction
                this._direction = opposingDirection(this._direction);
                const firstClue = this.cluesForDirection(this._direction)[0];
                this._selectedCell = firstClue.cells[0];
            }
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
            this.moveCursor(this.nextCellDirection);
        } else if (key.length === 1) {
            // Any other key is the character to insert into the cell.
            // This can be pretty much any character
            this.updateSelectedCell(key as CellValue);
            const clue = this.currentClue;
            const currentCellIndex = clue.cells.findIndex(cell => isSameCell(cell, this._selectedCell));
            if (this._preferences.autoCheck) {
                this.moveCursor(this.nextCellDirection);
            }
            // If we are at the last cell of the clue, we will stay in place. If not, then move
            if (currentCellIndex !== clue.cells.length - 1) {
                this.moveCursor(this.nextCellDirection);
            }
        }
    }

    private get nextCellDirection(): MovementDirection {
        return this._direction === 'across' ? 'right' : 'down';
    }

    handleClickCell(cell: CellIndex) {
        if (isSameCell(cell, this._selectedCell)) {
            // If we click the same cell, we want to change the direction
            this._direction = opposingDirection(this._direction);
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

    // Force meaning to continue moving past any blanked out cells
    // Respect filled meaning to try to jump past any filled cells
    private moveCursor(direction: MovementDirection, force = false, respectFilled = false) {
        const [row, col] = this._selectedCell;
        let newRow = row;
        let newCol = col;

        if (force || respectFilled) {
            const [rowModifier, colModifier] = directionToModifier(direction);
            newRow += rowModifier;
            newCol += colModifier;
        } else {
            // Ignore filled, try to jump to the next empty cell
            [newRow, newCol] = this.findNextEmptyCell(direction, this._selectedCell);
        }

        if (this.isValidCell(newRow, newCol)) {
            this._selectedCell = [newRow, newCol];
        } else if (force) {
            const nextClue = this.findNextClue(this._direction, true);
            if (nextClue) {
                this._selectedCell = nextClue;
            }
        } else {
            // If it's an invalid cell and not a forceful movement, we don't move.
        }
    }

    private findNextEmptyCell(direction: MovementDirection, cell: CellIndex): CellIndex {
        const [row, col] = cell;
        let newRow = row;
        let newCol = col;

        const [rowModifier, colModifier] = directionToModifier(direction);
        newRow += rowModifier;
        newCol += colModifier;

        while (true) {
            // We are out of bounds, meaning there is no next possible non-empty cell.
            // So move into the direct next cell.
            if (!this.isValidCell(newRow, newCol)) {
                return [row + rowModifier, col + colModifier];
            }

            if (this._board[newRow][newCol] === '') {
                break;
            } else {
                newRow += rowModifier;
                newCol += colModifier;
            }
        }

        return [newRow, newCol];
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

        const directionalClues = this.cluesForDirection(this._direction);
        const clue = directionalClues.find(clue => isSameCell([row, col], clue.cells[0]));

        if (!clue) {
            console.error(`Could not find clue at ${row}, ${col}, direction: ${this._direction}`);
            return directionalClues[0];
        }

        return clue;
    }

    get inverseCurrentClue(): Clue {
        const oppositeDirectionalClues = this.cluesForDirection(opposingDirection(this._direction));
        return oppositeDirectionalClues.find(clue => clue.cells.some(cell => isSameCell(cell, this._selectedCell)))!;
    }

    isClueFilled(clueId: number, direction: GridDirection): boolean {
        const clue = this.cluesForDirection(direction).find(clue => clue.id === clueId)!;
        return clue.cells.every(([row, col]) => this._board[row][col] !== '');
    }

    private findNextClue(direction: GridDirection, sameAxis = false): CellIndex | null {
        const directionalClues = this.cluesForDirection(direction);
        const clue = this.currentClue;

        const next = directionalClues.find(c => {
            // If we are bound to stay to the same axis as the direction
            if (sameAxis) {
                if (direction === 'across' && c.cells[0][0] != clue.cells[0][0]) {
                    return false;
                } else if (direction === 'down' && c.cells[0][1] != clue.cells[0][1]) {
                    return false;
                }
            }

            return c.id > clue.id;
        });

        if (next) {
            return next.cells[0];
        }

        return null;
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

function directionToModifier(direction: MovementDirection): [number, number] {
    if (direction === 'left') { return [0, -1]; }
    if (direction === 'right') { return [0, 1]; }
    if (direction === 'up') { return [-1, 0]; }
    if (direction === 'down') { return [1, 0]; }
    throw new Error('Unreachable');
}