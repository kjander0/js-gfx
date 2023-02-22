class Texture {
    glTexture;
    width;
    height;

    static fromUrl(url) {
        const glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
    
        // Because images have to be downloaded over the internet
        // they might take a moment until they are ready.
        // Until then put a single pixel in the texture so we can
        // use it immediately. When the image has finished downloading
        // we'll update the texture with the contents of the image.
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            width,
            height,
            border,
            srcFormat,
            srcType,
            pixel
        );
    
        const image = new Image();
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, glTexture);
            gl.texImage2D(
                gl.TEXTURE_2D,
                level,
                internalFormat,
                srcFormat,
                srcType,
                image
            );
        
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        };
        image.src = url;
        
        let tex = new Texture();
        tex.glTexture = glTexture;
        return tex;
    }
}

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
    transform = new Transform();
    data = [];

    constructor(attribs) {
        this.attribs = attribs;
    }

    setTransform(t) {
        this.transform = t;
    }

    setColor(r, g, b) {
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
    }

    add(x, y, s, t) {
        [x, y] = this.transform.mulXY(x, y);
        this.data.push(x, y);
        if ((this.attribs & ATTRIB_COLOR) === ATTRIB_COLOR) {
            this.data.concat(this.color);
        }

        if ((this.attribs & ATTRIB_TEX) === ATTRIB_TEX) {
            console.assert(s !== undefined && t !== undefined);
            this.data.push(s, t);
        }
    }
};

class Model {
    vao;
    vbo;
    drawMode;
    numElements;

    constructor(mesh, drawMode) {
        this.drawMode = drawMode;
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.data), gl.STATIC_DRAW);

        const floatBytes = Float32Array.BYTES_PER_ELEMENT;
        let elementSize = 2;
        let colorOffset = 2 * floatBytes;
        if ((mesh.attribs & ATTRIB_COLOR) === ATTRIB_COLOR) {
            elementSize += 3;
            colorOffset = 3 * floatBytes;
        }
        let stride = elementSize * floatBytes;
        this.numElements = mesh.data.length / elementSize;

        gl.vertexAttribPointer(ATTRIB_POS_LOC, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(ATTRIB_POS_LOC);

        gl.vertexAttribPointer(ATTRIB_COLOR_LOC, 3, gl.FLOAT, false, stride, colorOffset);
        gl.enableVertexAttribArray(ATTRIB_COLOR_LOC);
    }
}

class Transform {
    mat = new Float32Array(9);

    constructor() {
        this.mat[0] = 1; this.mat[3] = 0; this.mat[6] = 0;
        this.mat[1] = 0; this.mat[4] = 1; this.mat[7] = 0;
        this.mat[2] = 0; this.mat[5] = 0; this.mat[8] = 1;
    }

    mulXY(x, y) {
        let newX = x * this.mat[0] + y * this.mat[3] + this.mat[6];
        let newY = x * this.mat[1] + y * this.mat[4] + this.mat[7];
        return [newX, newY];
    }

    static translation(x, y) {
        let t = new Transform();
        t.mat[6] = x;
        t.mat[7] = y;
        return t;
    }
}

const ATTRIB_POS = 1;
const ATTRIB_COLOR = 2;
const ATTRIB_TEX = 4;


const ATTRIB_POS_LOC = 0;
const ATTRIB_COLOR_LOC = 1;
const ATTRIB_TEX_LOC = 2;

let canvas;
let gl;

let transform;
let camMatrix;
let camX = 0, camY = 0;

let shapeMesh;
let spriteMesh;

let shapeShader, spriteShader;

const shapeVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=1) in vec2 aColor;

uniform mat4 uCamMatrix;
void main() {
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uCamMatrix * pos;
}`;

const shapeFragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
    fragColor = vec4(1.0, 0.2, 0.2, 1.0);
}`;

const spriteVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=2) in vec2 aTexCoords;

uniform mat4 uCamMatrix;

void main() {
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uCamMatrix * pos;
}`;

const spriteFragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;
void main() {
    fragColor = vec4(1.0, 0.2, 0.2, 1.0);
}`;

function init(targetCanvas) {
    canvas = targetCanvas;
    console.log("init", targetCanvas);
    gl = canvas.getContext("webgl2");
    if (gl === null) {
        throw "could not get webgl2 context";
    }
    gl.disable(gl.DEPTH_TEST);

    shapeShader = new Shader(shapeVertSrc, shapeFragSrc);
    spriteShader = new Shader(spriteVertSrc, spriteFragSrc);

    shapeMesh = new Mesh(ATTRIB_POS);

    transform = new Transform();

    _resize(canvas.clientWidth, canvas.clientHeight); // initial resize
}

function _resize(width, height) {
    canvas.width = width;
    canvas.height = height;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    updateCam();
}

function resize(width, height) {
    if (canvas.width === width && canvas.height === height) {
      return;
    }
    _resize(width, height);
}

function updateCam() {
    const scaleX = 2 / gl.drawingBufferWidth;
    const scaleY = 2 / gl.drawingBufferHeight;

    camMatrix = [
        scaleX, 0, 0, 0,
        0, scaleY, 0, 0,
        0, 0, -1, 0,
        -scaleX * camX, -scaleY * camY, 0, 1,
      ];
}

function pushTransform(t) {
    transform = t;
}

function rect(width, height) {
    shapeMesh.setTransform(transform);
    shapeMesh.add(0, 0);
    shapeMesh.add(width, 0);
    shapeMesh.add(width, height);
    shapeMesh.add(0, 0);
    shapeMesh.add(width, height);
    shapeMesh.add(0, height);
}

function circle(radius) {
    shapeMesh.setTransform(transform);
    const resolution = 36;
    const rads = 2 * Math.PI / resolution;
    for (let i = 0; i < resolution; i++) {
        let rad0 = i * rads;
        let rad1 = (i+1) * rads;
        shapeMesh.add(0, 0);
        shapeMesh.add(radius * Math.cos(rad0), radius * Math.sin(rad0));
        shapeMesh.add(radius * Math.cos(rad1), radius * Math.sin(rad1));
    }
}

function sprite(texture) {
    spriteMesh.setTransform(transform);
    spriteMesh.add(0, 0, 0, 0);
    spriteMesh.add(width, 0, 1, 0);
    spriteMesh.add(width, height, 1, 1);
    spriteMesh.add(0, 0, 0, 0);
    spriteMesh.add(width, height, 1, 1);
    spriteMesh.add(0, height, 0, 1);
}

function render() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(shapeShader.prog);
    
    let uCamMatrixLoc = gl.getUniformLocation(shapeShader.prog, "uCamMatrix");
    gl.uniformMatrix4fv(uCamMatrixLoc, false, camMatrix);

    let shapeModel = new Model(shapeMesh, gl.TRIANGLES);
    gl.bindVertexArray(shapeModel.vao);

    gl.drawArrays(shapeModel.drawMode, 0, shapeModel.numElements);
}

export {Shader, Transform, Texture, init, resize, pushTransform, rect, circle, render};