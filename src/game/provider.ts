/// Character | null
/// Null = blacked out cell
export type CellValue = string | null;
export type CellIndex = [number, number];

export interface Clue {
    /// ID for the ROW OR COL. There may be an ID 1 for both across and down.
    id: number;
    text: string;
    cells: CellIndex[];
}

export interface Puzzle {
    id: number;
    width: number;
    height: number;
    cells: CellValue[][];
    acrossClues: Clue[];
    downClues: Clue[];
}

export const puzzle: Puzzle = {
    id: 1,
    width: 6,
    height: 5,
    cells: [
        ['C', 'A', 'B', 'S', null, null],
        ['A', 'T', 'O', 'N', 'C', 'E'],
        ['P', 'U', 'P', 'I', 'L', 'S'],
        ['S', 'L', 'I', 'P', 'U', 'P'],
        [null, null, 'T', 'E', 'E', 'N']
    ],
    acrossClues: [
        {
            id: 1,
            text: 'Wines that Napa Valley is renowned for, informally',
            cells: [
                [0, 0],
                [1, 0],
                [2, 0],
                [3, 0]
            ]
        },
        {
            id: 5,
            text: '"Right away!"',
            cells: [
                [1, 0],
                [1, 1],
                [1, 2],
                [1, 3],
                [1, 4],
                [1, 5]
            ]
        },
        {
            id: 8,
            text: "School students",
            cells: [
                [2, 0],
                [2, 1],
                [2, 2],
                [2, 3],
                [2, 4],
                [2, 5]
            ]
        },
        {
            id: 9,
            text: 'Make a mistake ... or maybe 8-Across backward',
            cells: [
                [3, 0],
                [3, 1],
                [3, 2],
                [3, 3],
                [3, 4],
                [3, 5]
            ]
        },
        {
            id: 10,
            text: 'Many a new driver',
            cells: [
                [4, 2],
                [4, 3],
                [4, 4],
                [4, 5]
            ]
        }
    ],
    downClues: [
        {
            id: 1,
            text: 'Items of clothing that may be worn backwards',
            cells: [
                [0, 0],
                [0, 1],
                [0, 2],
                [0, 3]
            ]
        },
        {
            id: 2,
            text: '___ Gawande, surgeon with the #1 New York Times best seller "Being Mortal"',
            cells: [
                [0, 1],
                [1, 1],
                [2, 1],
                [3, 1]
            ]
        },
        {
            id: 3,
            text: 'Hasbro toy with a pull handle and twistable crank',
            cells: [
                [0, 2],
                [1, 2],
                [2, 2],
                [3, 2],
                [4, 2]
            ]
        },
        {
            id: 4,
            text: 'Criticize snarkily, with "at"',
            cells: [
                [0, 3],
                [1, 3],
                [2, 3],
                [3, 3],
                [4, 3]
            ]
        },
        {
            id: 6,
            text: 'You\'re reading it',
            cells: [
                [1, 4],
                [2, 4],
                [3, 4],
                [4, 4]
            ]
        },
        {
            id: 7,
            text: 'Channel with "2" and "U" spinoffs',
            cells: [
                [1, 5],
                [2, 5],
                [3, 5],
                [4, 5]
            ]
        }
    ]
};
