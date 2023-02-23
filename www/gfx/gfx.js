class Texture {
    glTexture;
    s0 = 0;
    s1 = 1;
    t0 = 0;
    t1 = 1;

    static fromUrl(url) {
        const glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
    
        // TODO: best to preload textures (currently storing 1 blue pixel in texure while it downloads)
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
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
    color;
    transform;
    data;

    constructor(attribs) {
        this.attribs = attribs;
        this.clear(); //initialize

    }

    clear() {
        this.color = [1.0, 0.8, 0.5];
        this.transform = new Transform();
        this.data = [];
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
            this.data.push(this.color[0], this.color[1], this.color[2]);
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
    shader;
    numElements;
    attribs;
    glTexture;

    constructor(mesh, drawMode, shader, glTexture) {
        this.drawMode = drawMode;
        this.shader = shader;
        this.attribs = mesh.attribs;
        this.glTexture = glTexture;

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.data), gl.STATIC_DRAW);

        const floatBytes = Float32Array.BYTES_PER_ELEMENT;
        let elementSize = 2;
        let colorOffset = 2 * floatBytes;
        let texOffset = 2 * floatBytes;
        if ((mesh.attribs & ATTRIB_COLOR) === ATTRIB_COLOR) {
            elementSize += 3;
            texOffset += 3 * floatBytes;
        }
        if ((mesh.attribs & ATTRIB_TEX) === ATTRIB_TEX) {
            elementSize += 2;
        }
        let stride = elementSize * floatBytes;
        this.numElements = mesh.data.length / elementSize;

        gl.vertexAttribPointer(ATTRIB_POS_LOC, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(ATTRIB_POS_LOC);

        if ((mesh.attribs & ATTRIB_COLOR) === ATTRIB_COLOR) {
            gl.vertexAttribPointer(ATTRIB_COLOR_LOC, 3, gl.FLOAT, false, stride, colorOffset);
            gl.enableVertexAttribArray(ATTRIB_COLOR_LOC);
        }

        if ((mesh.attribs & ATTRIB_TEX) === ATTRIB_TEX) {
            gl.vertexAttribPointer(ATTRIB_TEX_LOC, 2, gl.FLOAT, false, stride, texOffset);
            gl.enableVertexAttribArray(ATTRIB_TEX_LOC);
        }
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
let texMesh;

let globalTexture;

let shapeShader, texShader;

const shapeVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=1) in vec3 aColor;

out vec4 vColor;
uniform mat4 uCamMatrix;
void main() {
    vColor = vec4(aColor, 1);
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uCamMatrix * pos;
}`;

const shapeFragSrc = `#version 300 es
precision mediump float;
out vec4 fragColor;
in vec4 vColor;
void main() {
    fragColor = vColor;
}`;

const texVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=2) in vec2 aTexCoord;

out vec2 vTexCoord;
uniform mat4 uCamMatrix;


void main() {
    vTexCoord = aTexCoord;
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uCamMatrix * pos;
}`;

const texFragSrc = `#version 300 es
precision mediump float;
uniform sampler2D uTex;
in vec2 vTexCoord;
out vec4 fragColor;
void main() {
    fragColor = texture(uTex, vTexCoord);
}`;

function init(targetCanvas) {
    canvas = targetCanvas;
    // TODO: do not get context with depth buffer if we don't need it
    gl = canvas.getContext("webgl2");
    if (gl === null) {
        throw "could not get webgl2 context";
    }
    gl.disable(gl.DEPTH_TEST);

    shapeShader = new Shader(shapeVertSrc, shapeFragSrc);
    texShader = new Shader(texVertSrc, texFragSrc);

    shapeMesh = new Mesh(ATTRIB_POS | ATTRIB_COLOR);
    texMesh = new Mesh(ATTRIB_POS | ATTRIB_TEX);

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

function setColor(r, g, b) {
    shapeMesh.setColor(r, g, b);
}

function pushTransform(t) {
    transform = t;
}

function drawRect(x, y, width, height) {
    shapeMesh.setTransform(transform);
    shapeMesh.add(x, y);
    shapeMesh.add(x+width, y);
    shapeMesh.add(x+width, y+height);
    shapeMesh.add(x, y);
    shapeMesh.add(x+width, y+height);
    shapeMesh.add(x, y+height);
}

function drawCircle(x, y, radius) {
    shapeMesh.setTransform(transform);
    const resolution = 36;
    const rads = 2 * Math.PI / resolution;
    for (let i = 0; i < resolution; i++) {
        let rad0 = i * rads;
        let rad1 = (i+1) * rads;
        shapeMesh.add(x, y);
        shapeMesh.add(x+radius * Math.cos(rad0), y+radius * Math.sin(rad0));
        shapeMesh.add(x+radius * Math.cos(rad1), y+radius * Math.sin(rad1));
    }
}

function drawTexture(x, y, width, height, texture) {
    globalTexture = texture;
    texMesh.setTransform(transform);
    texMesh.add(x, y, texture.s0, texture.t0);
    texMesh.add(x+width, y, texture.s1, texture.t0);
    texMesh.add(x+width, y+height, texture.s1, texture.t1);
    texMesh.add(x, y, texture.s0, texture.t0);
    texMesh.add(x+width, y+height, texture.s1, texture.t1);
    texMesh.add(x, y+height, texture.s0, texture.t1);
}

function render() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clear(gl.COLOR_BUFFER_BIT);


    let models = [
        new Model(shapeMesh, gl.TRIANGLES, shapeShader),
        new Model(texMesh, gl.TRIANGLES, texShader, globalTexture.glTexture),
    ]

    for (let model of models) {
        _drawModel(model);
    }

    shapeMesh.clear();
    texMesh.clear();
}

function _drawModel(model) {
    if (model.numElements === 0) {
        return;
    }

    let prog = model.shader.prog;
    gl.useProgram(prog);


    let uCamMatrixLoc = gl.getUniformLocation(prog, "uCamMatrix");
    gl.uniformMatrix4fv(uCamMatrixLoc, false, camMatrix);

    if ((model.attribs & ATTRIB_TEX) === ATTRIB_TEX) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, model.glTexture);
        let uTexLoc = gl.getUniformLocation(prog, "uTex");
        gl.uniform1i(uTexLoc, 0); // Texture unit 0
    }

    gl.bindVertexArray(model.vao);

    gl.drawArrays(model.drawMode, 0, model.numElements);
}

export {Shader, Transform, Texture, init, resize, setColor, pushTransform, drawRect, drawCircle, drawTexture, render};