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

document.addEventListener('keydown', (event) => {
    event.preventDefault();
    if (controller.status === 'not-started' || controller.status === 'completed') {
        return;
    }

    controller.handleKeyPress(event.key);
    refresh();
});

document.addEventListener('click', (event) => {
    event.preventDefault();
    const target = event.target as HTMLElement;

    if (target.classList.contains('cell')) {
        const cell = target.dataset['cell']!.split(',').map(Number) as CellIndex;
        controller.handleClickCell(cell);
    } else if (target.classList.contains('clue')) {
        const clueId = +target.dataset['id']!;
        const direction = target.dataset['direction'] as GridDirection;
        controller.jumpToClue(clueId, direction);
    } else {
        return;
    }

    refresh();
});