const gridHeight = 24;
const gridWidth = 9;
const grid = {};
const domGrid = document.getElementById("grid");
const gridRows = {};

function makeGrid() {
    for (let y = gridHeight - 1; y >= 0; y -= 1) {
        const newRow = domGrid.insertRow();
        gridRows[y] = [];
        for (let x = 0; x < gridWidth; x += 1) {
            gridRows[y].push(`${x}*${y}`)
            const position = { x: x, y: y };
            grid[`${x}*${y}`] = { color: "blank", active: false, position: position };
            const newCell = newRow.insertCell();
            newCell.id = `cell*${x}*${y}`;
            const square = document.createElement("div");
            square.id = `${x}*${y}`;
            square.className = "square blank";
            square.setAttribute("data-x", x);
            square.setAttribute("data-y", y);
            newCell.append(square);
        }
    }
    // let count = 0
    // console.log(gridRows);
    // Object.keys(grid).forEach(key => {
    //     if (!('position' in grid[key])) {
    //         console.log(key)
    //         count += 1;
    //     }
    // });
    // console.log(count)
    // console.log(grid)
}


function p(x, y) {
    return {x:x, y:y}
}

function inBounds(pos) {
    return (pos.x >= 0 && pos.x < gridWidth && pos.y >= 0 && pos.y < gridHeight);
    // console.log(valid);
    // return valid;
}

function pStatus(pos) {
    if (!inBounds(pos)) { return null; }
    return grid[`${pos.x}*${pos.y}`];
}

function translate(pos, offset) {
    return p(pos.x + offset.x, pos.y + offset.y);
}

function translateAll(positions, offset) {
    let newPositions = [];
    positions.forEach(pos => {
        newPositions.push(translate(pos, offset))
    });
    return newPositions;
}

function openPosition(pos) {
    if (!inBounds(pos)) { return false; }
    const color = pStatus(pos).color;
    const active = pStatus(pos).active;
    if (color === "blank" || active === true) { return true; }
    return false;
}

function validMove(positions) {
    let valid = true;
    positions.forEach(pos => {
        if (!inBounds(pos)) { valid = false; }
        if (!openPosition(pos)) { valid = false; }
    });
    return valid;
}

function slamDown(piece) {
    let canMove = true;
    while (canMove) {
        canMove = movePiece(piece, "down");
    }
    update();
}

let inPlay = false;
let prevMove = 0;
const gracePeriod = 5;
let clearableRows = [];
let activePiece = null;

function mainLoop() {
    shiftDownByRows(clearableRows);
    if (![undefined, null].includes(activePiece)) {
        const wasMoved = movePiece(activePiece, "down");
        if (wasMoved) { prevMove = ticks;}
    }
    if (ticks - prevMove > gracePeriod && clearableRows.length <= 0) {
        activePiece = newRandomPiece();
    }
    clearableRows = findClearable();
    markCleared(clearableRows);
    // update();
}

let ticks = 0;
let updateInterval = 33; // smaller is faster
function resetGame() {
    console.log("game reset");
    ticks = 0;
    // clock
    setInterval(() => {
        if (inPlay && ticks % updateInterval === 0) {
            mainLoop();
        }
        ticks += 1;
        update();
    }, 10);
}

function initializeGame() {
    console.log("game started");
    makeGrid();
    resetGame();
}

initializeGame();

const dirs = {n: p(0,0), u: p(0,1), d: p(0,-1), l: p(-1,0), r: p(1,0), up: p(0,1), down: p(0,-1), left: p(-1,0), right: p(1,0)};

function offsetsFromRoot(root, routeString) {
    let newPositions = [];
    const routes = routeString.split(',');
    routes.forEach(route => {
        let newPos = {x: root.x, y: root.y};
        Array.from(route).forEach(ch => {
            newPos = translate(newPos, dirs[ch]);
        });
        newPositions.push(newPos);
    });
    return newPositions;
}
// ___: { up: "", down: "", left: "", right: "", color: "" }
const pieceTypes = {
    tri: { up: "n,l,u,r", down: "n,l,d,r", left: "n,u,l,d", right: "n,u,r,d", color: "blue" },
    tet: { up: "n,uu,u,d", down: "n,uu,u,d", left: "n,rr,r,l", right: "n,ll,l,r", color: "red" },
    ses: { up: "n,d,dr,drd", down: "n,d,dr,drd", left: "d,dr,r,rr", right: "d,dr,r,rr", color: "green" },
    zaz: { up: "r,rd,d,dd", down: "r,rd,d,dd", left: "n,r,rd,rdr", right: "n,r,rd,rdr", color: "yellow" },
    sqr: { up: "n,r,d,rd", down: "n,r,d,rd", left: "n,r,d,rd", right: "n,r,d,rd", color: "yellow" },
    lam: { up: "u,n,d,dr", down: "ul,u,n,d", left: "l,n,r,ru", right: "r,n,l,ld", color: "orange" }
    
}

function rotatePiece(piece, spinDir) {
    if ([undefined, null].includes(piece)) { return false; }

    const rotations = {
        CW: { up: "right", right: "down", down: "left", left: "up" },
        CCW: { up: "left", left: "down", down: "right", right: "up" }
    }
    const newDir = rotations[spinDir][piece.direction];
    const newPositions = offsetsFromRoot(piece.root, pieceTypes[piece.type][newDir]);
    if (validMove(newPositions)) {
        piece.positions = newPositions;
        piece.direction = newDir;
        prevMove = ticks;
        return true;
    }
    return false;
}

function movePiece(piece, direction) {
    if ([undefined, null].includes(piece)) { return false; }

    const newPositions = translateAll(piece.positions, dirs[direction]);
    if (validMove(newPositions)) {
        piece.positions = newPositions;
        piece.root = translate(piece.root, dirs[direction]);
        prevMove = ticks;
        return true;
    }
    return false;
}

function newPiece(type, root, direction) {
    return {
        type: type,
        color: pieceTypes[type].color,
        direction: direction,
        root: root,
        positions: offsetsFromRoot(root, pieceTypes[type][direction])
    };
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function newRandomPiece() {
    setAllInactive();
    const types = Object.keys(pieceTypes)
    const index = randomInt(0, types.length)
    return newPiece(types[index], p(4,20), "up");
}

function setP(pos, color, active) {
    if (!inBounds(pos)) { return false; }
    grid[`${pos.x}*${pos.y}`].color = color;
    grid[`${pos.x}*${pos.y}`].active = active;
    return true;
}

function setAllInactive() {
    Object.keys(grid).forEach(key => {
        grid[key].active = false;
    });
}

function clearActive() {
    Object.keys(grid).forEach(key => {
        if (grid[key].active) {
            grid[key].active = false;
            grid[key].color = "blank";
        }
    });
}

function updateGrid() {
    // return if activePiece is undefined or null
    if ([undefined, null].includes(activePiece)) { return; }
    clearActive();
    activePiece.positions.forEach(pos => {
        setP(pos, activePiece.color, true);
    });
}

function updateDom() {
    Object.keys(grid).forEach(key => {
        const square = document.getElementById(key)
        square.className = `square ${grid[key].color}`
    });
}

function update() {
    // shiftDownAfterClear();
    updateGrid();
    updateDom();
}

function cloneArray(obj) {
    return JSON.parse(JSON.stringify(obj))
}

function shiftDown(rowNumber) {
    for (let y = 0; y < gridHeight; y += 1) {
        for (let x = 0; x < gridWidth; x += 1) {
            const thisSquare = pStatus(p(x,y));
            const yPos = thisSquare.position.y;
            if (yPos >= rowNumber && !thisSquare.active) {
                const abovePos = translate(thisSquare.position, p(0,1));
                const aboveSquare = pStatus(abovePos);
                // if (aboveSquare !== null && !thisSquare.active) {
                if (aboveSquare !== null && !aboveSquare.active) {
                    thisSquare.color = aboveSquare.color;
                } else {
                    thisSquare.color = "blank";
                }
            }
        }
    }
}

function shiftDownByRows(rows2clear) {
    rows2clear = rows2clear.sort((a, b) => b - a);
    rows2clear.forEach(n => {
        shiftDown(n);
    });
    clearableRows = [];
}

function markCleared(rows2clear) {
    // Object.keys(grid)
    // ${grid[key].color}
    rows2clear.forEach(n => {
        gridRows[n].forEach(key => {
            grid[key].color = "cleared";
            grid[key].active = false;
        });
    });
}

function findClearable() {
    let rows2clear = [];
    Object.keys(gridRows).forEach(n => {
        let fullLine = true;
        gridRows[n].forEach(key => {
            const square = grid[key];
            if (["blank"].includes(square.color) || square.active) {
                fullLine = false;
            }
        });
        if (fullLine) { rows2clear.push(n) }
    });
    return rows2clear;
}

const startMessage = document.getElementById('start-message');

function onFirstInput() {
    if (inPlay) { return; }
    inPlay = true;
    startMessage.style.display = 'none';
}

document.addEventListener('keydown', (event) => {
    onFirstInput();
    if (event.key === "ArrowUp") {
        rotatePiece(activePiece, "CW");
    }
    if (event.key === "ArrowDown") {
        slamDown(activePiece, "down");
    }
    if (event.key === "ArrowLeft") {
        movePiece(activePiece, "left");
    }
    if (event.key === "ArrowRight") {
        movePiece(activePiece, "right");
    }
});