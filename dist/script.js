"use strict";
// Marching Squares algorithm adapted from:
// http://www.tomgibara.com/computer-vision/marching-squares
console.clear();
let frame = 0;
const WIDTH = 24;
const HEIGHT = 24;
const canvas = document.querySelector('canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
const ctx = canvas.getContext('2d');
const imageData = ctx.createImageData(canvas.width, canvas.height);
const svg = document.querySelector('svg');
function leaNoise(x, y, z) {
    const { sin, cos } = Math;
    const mixVal = .4 + sin(x * 35 + sin(z * .1)) * sin(y * 25 + sin(z * .1)) * .15;
    return mix(sin(z + x * 20. + cos(y * 20. - z)) *
        cos(y * 10. + z + cos(y * 20. + z)), sin(2. + x * 16. - z) * cos(2. + y * 17. + z + cos(x * 20. + z)), mixVal);
}
// lea noise normalized :D
function LNN(x, y, z) {
    return Math.round((.5 + .5 * leaNoise(x * .2 / imageData.width, y * .2 / imageData.height, z)) * 255);
}
const getVal = ({ x, y }) => {
    if (x < 0 || y < 0 || x > WIDTH || y > HEIGHT) {
        return 0;
    }
    return LNN(x, y, frame);
};
// Directions
const E = { x: 1, y: 0 };
const NE = { x: 1, y: -1 };
const N = { x: 0, y: -1 };
const NW = { x: -1, y: -1 };
const W = { x: -1, y: 0 };
const SW = { x: -1, y: 1 };
const S = { x: 0, y: 1 };
const SE = { x: 1, y: 1 };
// Utils
const length2 = ({ x, y }) => Math.hypot(x, y);
const add2 = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mix = (x, y, a) => (1 - a) * x + a * y;
const clamp = (x, minVal, maxVal) => Math.min(Math.max(x, minVal), maxVal);
const clamp2 = (p, minVal, maxVal) => ({ x: clamp(p.x, minVal.x, maxVal.x), y: clamp(p.y, minVal.y, maxVal.y) });
const inBounds = (p, minVal, maxVal) => p.x >= minVal.x && p.x <= maxVal.x && p.y >= minVal.y && p.y <= maxVal.y;
const eq2 = (a, b) => a.x === b.x && a.y === b.y;
const step = (edge, x) => x < edge ? 0 : 1;
class Path {
    constructor(origin, directions) {
        this.origin = { x: 0, y: 0 };
        this.directions = [];
        this.origin = origin;
        this.directions = directions;
    }
    toString() {
        const { origin, directions } = this;
        return `M${origin.x} ${origin.y}l` + directions.map(p => `${p.x} ${p.y}`).join(' ');
    }
}
function identifyPerimeter(origin, stepVal = 128) {
    const TOP_LEFT = { x: -1, y: -1 };
    const BOTTOM_RIGHT = { x: WIDTH, y: HEIGHT };
    origin = clamp2(origin, TOP_LEFT, BOTTOM_RIGHT);
    const isSet = (p) => step(stepVal, getVal(p));
    const value = (p) => inBounds(p, TOP_LEFT, BOTTOM_RIGHT) ? (isSet(p) + isSet(add2(p, E)) * 2 + isSet(add2(p, S)) * 4 + isSet(add2(p, SE)) * 8) : 0;
    const initialValue = value(origin);
    if (initialValue === 0 || initialValue === 15) {
        return null;
    }
    const currentPos = Object.assign({}, origin);
    let direction = null, prevDir = null;
    const directions = [];
    let count = 0;
    do {
        let v = value(currentPos);
        switch (v) {
            case 1:
                direction = N;
                break;
            case 2:
                direction = E;
                break;
            case 3:
                direction = E;
                break;
            case 4:
                direction = W;
                break;
            case 5:
                direction = N;
                break;
            case 6:
                direction = prevDir && eq2(prevDir, N) ? W : E;
                break;
            case 7:
                direction = E;
                break;
            case 8:
                direction = S;
                break;
            case 9:
                direction = prevDir && eq2(prevDir, E) ? N : S;
                break;
            case 10:
                direction = S;
                break;
            case 11:
                direction = S;
                break;
            case 12:
                direction = W;
                break;
            case 13:
                direction = N;
                break;
            case 14:
                direction = W;
                break;
            default: return null;
        }
        directions.push(direction);
        count++;
        currentPos.x += direction.x;
        currentPos.y += direction.y;
        prevDir = direction;
        if (count > 1000) {
            throw "loop";
            break;
        }
    } while (!eq2(origin, currentPos));
    return new Path(origin, directions);
}
function marchSquares(imageData, stepVal = 128) {
    const paths = [];
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const val = step(stepVal, getVal({ x, y }));
            if (val === 1) {
                const result = identifyPerimeter({ x, y }, stepVal);
                if (result !== null)
                    paths.push(result);
            }
        }
    }
    return paths;
}
svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
const svgPaths = document.querySelectorAll('path');
function drawFrame(z = 0) {
    let minVal = 256;
    let maxVal = -1;
    for (let i = 0; i < (canvas.width * canvas.height); i++) {
        const x = i % imageData.width;
        const y = (i / imageData.width) | 0;
        const n = getVal({ x, y });
        const TAU = 2 * Math.PI / 255;
        imageData.data[i * 4 + 0] = (.5 + .5 * Math.cos(n * TAU)) * 255;
        imageData.data[i * 4 + 1] = (.5 + .5 * Math.cos(1 + n * TAU)) * 255;
        imageData.data[i * 4 + 2] = (.5 + .5 * Math.cos(2 + n * TAU)) * 255;
        imageData.data[i * 4 + 3] = 180 + (n >> 2);
        minVal = Math.min(minVal, n);
        maxVal = Math.max(maxVal, n);
    }
    for (let i = 0; i < 7; i++) {
        const p = marchSquares(imageData, 90 + i * 24);
        if (p) {
            const pathDef = p.map(p => p.toString()).join('');
            svgPaths[i].setAttribute('d', pathDef);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}
const loop = () => {
    drawFrame(frame);
    frame += .005;
    setTimeout(() => requestAnimationFrame(loop), 100);
};
loop();