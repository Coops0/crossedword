import './style.css';
import { Controller, GridDirection } from './game/controller.ts';
import { CellIndex, Clue, puzzle } from './game/provider.ts';
import { Renderer } from './renderer';
import { opposingDirection } from './util.ts';

const app = document.getElementById('app')!;
const controller = new Controller(puzzle);
const renderer = new Renderer(controller);

if (controller.status === 'not-started') {
    controller.start();
}

const scrollToClue = (clue: Clue, direction: GridDirection) => {
    const clueElement = document.querySelector(`.clue[data-id="${clue.id}"][data-direction="${direction}"]`) as HTMLElement;
    clueElement.scrollIntoView({
        behavior: 'instant',
        block: 'start',
    });
};

const refresh = () => {
    app.replaceChildren(renderer.render());
    controller.save();

    scrollToClue(controller.currentClue, controller.direction);
    scrollToClue(controller.inverseCurrentClue, opposingDirection(controller.direction));
};

refresh();

document.addEventListener('keydown', event => {
    if (controller.status === 'not-started' || controller.status === 'completed') {
        return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
    }

    event.preventDefault();

    controller.handleKeyPress(event.key);
    refresh();
});

document.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    if (!target) return;

    const cellElement = target.closest('.cell') as HTMLElement | null;
    if (cellElement) {
        const cell = cellElement.dataset['cell']!.split(',').map(Number) as CellIndex;
        controller.handleClickCell(cell);
        refresh();
        return;
    }

    const clueElement = target.closest('.clue') as HTMLElement | null;
    if (clueElement) {
        const clueId = +clueElement.dataset['id']!;
        const direction = clueElement.dataset['direction'] as GridDirection;
        controller.jumpToClue(clueId, direction);
        refresh();
    }
});