const ATTRIB_POS = 1;
const ATTRIB_COLOR = 2;

const ATTRIB_POS_LOC = 0;
const ATTRIB_COLOR_LOC = 1;

let canvas;
let gl;
let camMatrix;

let testShader;
let uProjectionMatrixLoc;
let uModelViewMatrixLoc;

let shapeMesh;

const vertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=1) in vec2 aColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
void main() {
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uProjectionMatrix * uModelViewMatrix * pos;
}`;

const fragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
    fragColor = vec4(1.0, 0.2, 0.2, 1.0);
}`;

class Shader {
    prog;

    constructor(vertSrc, fragSrc) {
        const vertShader = gl.createShader(gl.VERTEX_SHADER);
        const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(vertShader, vertSrc);
        gl.shaderSource(fragShader, fragSrc);

        this.prog = gl.createProgram();
        gl.attachShader(this.prog, vertShader);
        gl.attachShader(this.prog, fragShader);

        gl.compileShader(vertShader);
        gl.compileShader(fragShader);
        gl.linkProgram(this.prog);

        if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
            console.error(`Link failed: ${gl.getProgramInfoLog(this.prog)}`);
            console.error(`vs info-log: ${gl.getShaderInfoLog(vertShader)}`);
            console.error(`fs info-log: ${gl.getShaderInfoLog(fragShader)}`);
            // TODO: delete shaders
        }
    }
};

class Mesh {
    attribs;
    color = [1.0, 0.8, 0.5];
    data = [];

    constructor(attribs) {
        this.attribs = attribs;
    }

    color(r, g, b) {
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
    }

    add(x, y) {
        this.data.push(x, y);
        if ((this.attribs & ATTRIB_COLOR) === ATTRIB_COLOR) {
            this.data.concat(this.color);
        }
    }
};

class Model {
    vao;
    vbo;

    constructor(mesh) {
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        console.log("new model: ", this.vao, this.vbo);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.data), gl.STATIC_DRAW);

        const floatBytes = Float32Array.BYTES_PER_ELEMENT;
        let elementSize = 2;
        let colorOffset = 2 * floatBytes;
        if ((mesh.attribs & ATTRIB_COLOR) === ATTRIB_COLOR) {
            elementSize += 3;
            colorOffset = 3 * floatBytes;
        }
        let stride = elementSize * floatBytes;

        gl.vertexAttribPointer(ATTRIB_POS_LOC, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(ATTRIB_POS_LOC);

        gl.vertexAttribPointer(ATTRIB_COLOR_LOC, 3, gl.FLOAT, false, stride, colorOffset);
        gl.enableVertexAttribArray(ATTRIB_COLOR_LOC);
    }
}

function init(targetCanvas) {
    canvas = targetCanvas;
    console.log("init", targetCanvas);
    gl = canvas.getContext("webgl2");
    if (gl === null) {
        throw "could not get webgl2 context";
    }
    gl.disable(gl.DEPTH_TEST);

    testShader = new Shader(vertSrc, fragSrc);
    uProjectionMatrixLoc = gl.getUniformLocation(testShader.prog, "uProjectionMatrix");
    uModelViewMatrixLoc = gl.getUniformLocation(testShader.prog, "uModelViewMatrix");

    shapeMesh = new Mesh(ATTRIB_POS)

    updateCam();
}

function resize(width, height) {
    if (canvas.width === width && canvas.height === height) {
      return;
    }
    canvas.width = width;
    canvas.height = height;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    updateCam();
}

function updateCam() {
    camMatrix = [
        2 / gl.drawingBufferWidth, 0, 0, 0,
        0, 2 / gl.drawingBufferHeight, 0, 0,
        0, 0, -1, 0,
        -1, -1, 0, 1,
      ];
}

function rect(width, height) {
    shapeMesh.add(0, 0);
    shapeMesh.add(width, 0);
    shapeMesh.add(0, height);
    shapeMesh.add(width, height);
}

function render() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clear(gl.COLOR_BUFFER_BIT);

    const identMatrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];

    gl.useProgram(testShader.prog);

    gl.uniformMatrix4fv(uProjectionMatrixLoc, false, camMatrix);
    gl.uniformMatrix4fv(uModelViewMatrixLoc, false, identMatrix);

    let shapeModel = new Model(shapeMesh);
    DONT CREATE NEW VBO/VAO EVERY FRAME!
    gl.bindVertexArray(shapeModel.vao);

    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
}

export {Shader, init, resize, rect, render};