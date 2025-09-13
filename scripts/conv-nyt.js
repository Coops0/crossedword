const fs = require('fs');
const nyt = require('./nyt.json');

const body = nyt.body[0];

function cellIdToRowCol(cellId) {
	const row = Math.floor(cellId / body.dimensions.width);
	const col = cellId % body.dimensions.width;
	return [row, col];
}

const cells = [];
for (let i = 0; i < body.cells.length; i++) {
	const cell = body.cells[i];
	const [row, col] = cellIdToRowCol(i);

	cells[row] = cells[row] || [];


	if (Object.keys(cell).length === 0) {
		cells[row][col] = null;
	} else {
		cells[row][col] = cell.answer;
	}
}

const acrossClues = [];
const downClues = [];

for (const clue of body.clues) {
	const c = {
		id: +clue.label,
		text: clue.text[0].plain,
		cells: clue.cells.map(c => cellIdToRowCol(c))
	};
	if (clue.direction === 'Across') {
		acrossClues.push(c);
	} else {
		downClues.push(c);
	}
}

const out = {
	id: nyt.id,
	width: body.dimensions.width,
	height: body.dimensions.height,
	cells,
	acrossClues,
	downClues
};

fs.writeFileSync('nyt-out.json', JSON.stringify(out, null, 2));