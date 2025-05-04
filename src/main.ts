import './style.css';
import { Controller, GridDirection } from './game/controller.ts';
import { CellIndex, puzzle } from './game/provider.ts';
import { Renderer } from './renderer';

const app = document.getElementById('app')!;
const controller = new Controller(puzzle);
const renderer = new Renderer(controller);

if (controller.status === 'not-started') {
    controller.start();
}

const refresh = () => {
    app.replaceChildren(renderer.render());
    controller.save();
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