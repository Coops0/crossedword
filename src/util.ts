import { CellIndex } from './game/provider.ts';
import { GridDirection, MovementDirection } from './game/controller.ts';

export function isSameCell(cell1: CellIndex, cell2: CellIndex): boolean {
    return cell1[0] === cell2[0] && cell1[1] === cell2[1];
}

export function opposingDirection(direction: GridDirection): GridDirection {
    return direction === 'across' ? 'down' : 'across';
}

export function movementDirectionToGridDirection(direction: MovementDirection): GridDirection {
    // @formatter:off
    switch (direction) {
        case 'right': return 'across';
        case 'down': return 'down';
        case 'left': return 'across';
        case 'up': return 'down';
    }
    // @formatter:on
}