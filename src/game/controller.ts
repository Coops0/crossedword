import { CellIndex, CellValue, Clue, Puzzle } from './provider.ts';
import { loadPuzzle, savePuzzle } from './storage.ts';
import { isSameCell, movementDirectionToGridDirection, opposingDirection } from '../util.ts';
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
    get puzzle(): Puzzle { return this._puzzle; }
    get clues(): { across: Clue[], down: Clue[] } { return { across: this._puzzle.acrossClues, down: this._puzzle.downClues }; }
    get board(): CellValue[][] { return this._board; }
    get selectedCell(): CellIndex { return this._selectedCell; }
    get direction(): GridDirection { return this._direction; }
    get status(): PuzzleStatus { return this._status; }
    // @formatter:on

    start() {
        this._status = 'in-progress';
    }

    handleKeyPress(key: String) {
        if (key === 'Backspace') {
            // Backspace we want to clear the current cell then move back
            this.updateSelectedCell('');
            this.moveCursor(this._direction === 'across' ? 'left' : 'up', 'normal');
            return;
        }

        if (key === 'Enter' || key === 'Tab') {
            // Enter or Tab we want to find the next clue forcefully, and if we are at the end of clues, then go back to the start
            const next = this.findNextClue(this._direction === 'across' ? 'right' : 'down');
            if (next) {
                this._selectedCell = next;
                return;
            }
            // At the end of this grid, go back to the start in the opposite direction
            this._direction = opposingDirection(this._direction);
            const firstClue = this.cluesForDirection(this._direction)[0];
            this._selectedCell = firstClue.cells[0];
            return;
        }

        if (key === 'ArrowLeft') {
            // Any arrow keys, if our direction doesn't match the key direction, then we just change direction and stop.
            // If it does match, then we move the cursor in that direction
            if (!this.changeDirection('across')) { this.moveCursor('left', 'force'); }
            return;
        }
        if (key === 'ArrowRight') {
            if (!this.changeDirection('across')) { this.moveCursor('right', 'force'); }
            return;
        }
        if (key === 'ArrowUp') {
            if (!this.changeDirection('down')) { this.moveCursor('up', 'force'); }
            return;
        }
        if (key === 'ArrowDown') {
            if (!this.changeDirection('down')) { this.moveCursor('down', 'force'); }
            return;
        }

        if (key === ' ') {
            // Space we want to act like we are inserting a space (but really we are just clearing the cell) then move right
            this.updateSelectedCell('');
            this.moveCursor(this.nextCellDirection, 'normal');
            return;
        }

        if (key.length === 1) {
            // Any other key is the character to insert into the cell.
            // This can be pretty much any character
            this.updateSelectedCell(key as CellValue);
            if (this._preferences.autoCheck) {
                // If auto check is enabled, then we want to skip to the next invalid or empty
                this.moveCursor(this.nextCellDirection, 'next-invalid');
                return;
            }

            const clue = this.currentClue;
            const currentCellIndex = clue.cells.findIndex(cell => isSameCell(cell, this._selectedCell));
            if (currentCellIndex !== clue.cells.length - 1) {
                // If we are at the last cell of the clue, we will stay in place. If not, then move
                this.moveCursor(this.nextCellDirection, 'next-unfilled');
            }
            return;
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

    private moveCursor(direction: MovementDirection, mode: MoveCursorMode) {
        const [row, col] = this._selectedCell;
        let newRow = row;
        let newCol = col;

        if (mode === 'force' || mode === 'normal') {
            const [rowModifier, colModifier] = directionToModifier(direction);
            newRow += rowModifier;
            newCol += colModifier;
        } else if (mode === 'next-unfilled') {
            // Ignore filled, try to jump to the next empty cell
            [newRow, newCol] = this.findNextCell(direction, this._selectedCell);
        } else {
            // next-invalid
            const clue = this.currentClue;
            const currentClueIndex = clue.cells.findIndex(cell => isSameCell(cell, this._selectedCell));
            const maybeNextClueIndex = clue.cells
                // Start off with all the cells after the current cell
                .slice(currentClueIndex + 1)
                // If none of those work, then wrap back around
                .concat(clue.cells)
                // Don't want the current cell
                .filter(c => !isSameCell(c, this._selectedCell))
                // Now find the first cell that is either empty or invalid
                .find(([r, c]) => {
                    const cell = this._board[r][c];
                    return cell === '' || cell !== this._puzzle.cells[r][c];
                });

            // If we couldn't find any cell, then just stay in place
            [newRow, newCol] = maybeNextClueIndex ?? [row, col];
        }

        if (this.isValidCell(newRow, newCol)) {
            this._selectedCell = [newRow, newCol];
        } else if (mode === 'force') {
            // Force means that if we can't move directly in the direction, then we will jump to the same directional clue on the same col/row.
            this._selectedCell = this.findNextCell(direction, this._selectedCell, cell => cell !== null, false);
        } else {
            // If it's an invalid cell and not a forceful movement, we don't move.
        }
    }

    private findNextCell(
        direction: MovementDirection,
        cell: CellIndex,
        predicate: (cell: CellValue, row: number, col: number) => boolean = cell => cell === '',
        stopOnBlank = true
    ): CellIndex {
        const [row, col] = cell;
        let newRow = row;
        let newCol = col;

        const [rowModifier, colModifier] = directionToModifier(direction);
        newRow += rowModifier;
        newCol += colModifier;

        while (true) {
            // We are out of bounds, meaning there is no next possible non-empty cell.
            if (stopOnBlank ? !this.isValidCell(newRow, newCol) : !this.isValidCellIndex(newRow, newCol)) {
                return [row, col];
            }

            if (predicate(this._board[newRow][newCol], newRow, newCol)) {
                break;
            } else {
                newRow += rowModifier;
                newCol += colModifier;
            }
        }

        return [newRow, newCol];
    }

    private isValidCellIndex(row: number, col: number): boolean {
        return row >= 0 && col >= 0 &&
            row < this._puzzle.height && col < this._puzzle.width;
    }

    private isValidCell(row: number, col: number): boolean {
        return this.isValidCellIndex(row, col) && this._puzzle.cells[row][col] !== null;
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

    // Same axis meaning same row/col (depending on the direction)
    private findNextClue(direction: MovementDirection, sameAxis = false): CellIndex | null {
        const gridDirection = movementDirectionToGridDirection(direction);
        const directionalClues = this.cluesForDirection(gridDirection);
        const clue = this.currentClue;

        if (direction === 'up' || direction === 'left') {
            // We want to search from the bottom to the top for up, and right to left for left;
            // so we get the nearest clue
            directionalClues.reverse();
        }

        const next = directionalClues
            .filter(c => {
                if (!sameAxis) {
                    return c.id > clue.id;
                }

                // If we are bound to stay in the same direction, then need to check if cell row or col is the same
                const horizontalCheck = c.cells[0][0] === clue.cells[0][0];
                const verticalCheck = c.cells[0][1] === clue.cells[0][1];

                // @formatter:off
                switch (direction) {
                    case 'right': return horizontalCheck && c.id > clue.id;
                    case 'down': return verticalCheck && c.id > clue.id;
                    case 'left': return horizontalCheck && c.id < clue.id;
                    case 'up': return verticalCheck && c.id < clue.id;
                }
            // @formatter:on
            })
            .map((c, i): [Clue, number] => {
                if (sameAxis) {
                    const distance = (clue.id - c.id);
                    return [c, distance];
                } else {
                    return [c, i];
                }
            })
            .sort(([, distance1], [, distance2]) => distance2 - distance1)
            .map(([clue]) => clue)
            ?.[0];

        if (!next) {
            return null;
        }

        if (sameAxis && (direction === 'up' || direction === 'left')) {
            // The most likely case is that we are using arrow keys to move backwards.
            // We want to be in the immediate next cell.
            return next.cells[next.cells.length - 1];
        } else {
            return next.cells[0];
        }
    }

    private changeDirection(direction: GridDirection): boolean {
        if (this._direction !== direction) {
            this._direction = direction;
            return true;
        } else {
            return false;
        }
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

    isCellCorrect(cell: CellIndex): boolean {
        // important for this to be case-insensitive
        const [row, col] = cell;
        const correctValue = this._puzzle.cells[row][col]?.toLowerCase();
        if (!correctValue) { return false; }

        return correctValue === this._board[row][col]?.toLowerCase();
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

type MoveCursorMode = 'normal' | 'force' | 'next-unfilled' | 'next-invalid';