import { Controller, GridDirection } from '../game/controller.ts';
import { isSameCell } from '../util.ts';
import { Clue } from '../game/provider.ts';

// TODO clean this up where we are only exposing like render both lists to self, we don't need to have full nested rendering methods in this
export class Renderer {
    private _controller: Controller;

    constructor(controller: Controller) {
        // Technically a reference
        this._controller = controller;
    }

    private renderCell(row: number, col: number): HTMLDivElement {
        const cell = this._controller.board[row][col];
        const { clues } = this._controller;

        const cellElement = document.createElement('div');
        cellElement.innerText = cell || '';
        cellElement.classList.add('cell');

        if (cell === null) {
            cellElement.classList.add('blacked-out');
        } else {
            cellElement.classList.add('normal');
        }

        if (isSameCell(this._controller.selectedCell, [row, col])) {
            cellElement.classList.add('cell-selected');
        } else if (this._controller.currentClue.cells.some(cell => isSameCell(cell, [row, col]))) {
            cellElement.classList.add('group-selected');
        }

        for (const clue of clues.down.concat(clues.across)) {
            if (isSameCell(clue.cells[0], [row, col])) {
                const clueIdElement = document.createElement('span');
                clueIdElement.classList.add('clue-id');
                clueIdElement.innerText = clue.id.toString();
                cellElement.appendChild(clueIdElement);
            }
        }

        cellElement.dataset['cell'] = `${row},${col}`;

        return cellElement;
    }

    private renderGrid(): HTMLDivElement {
        const grid = document.createElement('div');
        grid.classList.add('grid');

        for (let row = 0; row < this._controller.puzzle.height; row++) {
            const gridRow = document.createElement('div');
            gridRow.classList.add('row');

            for (let col = 0; col < this._controller.puzzle.width; col++) {
                const cellElement = this.renderCell(row, col);
                gridRow.appendChild(cellElement);
            }

            grid.appendChild(gridRow);
        }

        return grid;
    }

    private renderClue(clue: Clue, direction: GridDirection): HTMLDivElement {
        const clueElement = document.createElement('div');
        clueElement.classList.add('clue');

        const clueIdElement = document.createElement('span');
        clueIdElement.classList.add('id');
        clueIdElement.innerText = clue.id.toString();
        clueElement.appendChild(clueIdElement);

        const clueTextElement = document.createElement('span');
        clueTextElement.classList.add('text');
        clueTextElement.innerText = clue.text;
        clueElement.appendChild(clueTextElement);

        if (clue.id === this._controller.currentClue.id && direction === this._controller.direction) {
            clueElement.classList.add('selected');
        } else if (clue.cells.some(cell => isSameCell(cell, this._controller.selectedCell))) {
            clueElement.classList.add('inverse-selected');
        }

        if (this._controller.isClueFilled(clue.id, direction)) {
            clueElement.classList.add('filled');
        }

        clueElement.dataset['id'] = clue.id.toString();
        clueElement.dataset['direction'] = direction;
        return clueElement;
    }

    private renderClueList(direction: GridDirection): HTMLDivElement {
        const clueList = document.createElement('div');
        clueList.classList.add('clue-list');

        const clues = this._controller.cluesForDirection(direction);
        for (const clue of clues) {
            const clueElement = this.renderClue(clue, direction);
            clueList.appendChild(clueElement);
        }

        return clueList;
    }

    private renderClueLists(): HTMLDivElement {
        const clueLists = document.createElement('div');
        clueLists.classList.add('clue-lists');

        const acrossClueList = this.renderClueList('across');
        const downClueList = this.renderClueList('down');

        clueLists.appendChild(acrossClueList);
        clueLists.appendChild(downClueList);

        return clueLists;
    }

    render(): HTMLDivElement {
        const container = document.createElement('div');
        container.classList.add('puzzle-container');

        // todo status

        const grid = this.renderGrid();
        const clueLists = this.renderClueLists();

        container.appendChild(grid);
        container.appendChild(clueLists);

        return container;
    }
}