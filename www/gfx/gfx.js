// TODO: delete vbo, vao, texture, framebuffer, renderbuffer after use

class Texture {
    glTexture;
    s0 = 0;
    s1 = 1;
    t0 = 0;
    t1 = 1;

    width;
    height;

    static fromSize(width, height) {
        let tex = new Texture();
        tex.width = width;
        tex.height = height;
        tex.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, tex.width, tex.height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    static fromUrl(url) {
        let tex = new Texture();
        tex.glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);

        tex.width = 1;
        tex.height = 1;
    
        // TODO: best to preload textures (currently storing 1 blue pixel in texure while it downloads)
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            tex.width,
            tex.height,
            border,
            srcFormat,
            srcType,
            pixel
        );
    
        const image = new Image();
        image.onload = () => {
            tex.width = image.naturalWidth;
            tex.height = image.naturalHeight;

            gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
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
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);	
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        };
        image.src = url;
        
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

class DrawParams {
    drawMode;
    shader;
    textures = [];
    color = [1.0, 0.8, 0.5];
    
    consructor(drawMode, shader) {
        this.drawMode = drawMode;
        this.shader = shader;
    }
}

class Model {
    vao;
    vbo;
    numElements;
    attribs;
    drawMode;
    shader;
    textures;

    constructor(mesh, drawMode, shader, textures=null) {
        this.drawMode = drawMode;
        this.shader = shader;
        this.textures = textures;
        this.attribs = mesh.attribs;

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
        this.identity();
    }

    identity() {
        this.mat[0] = 1; this.mat[3] = 0; this.mat[6] = 0;
        this.mat[1] = 0; this.mat[4] = 1; this.mat[7] = 0;
        this.mat[2] = 0; this.mat[5] = 0; this.mat[8] = 1;
    }

    mulXY(x, y) {
        let newX = x * this.mat[0] + y * this.mat[3] + this.mat[6];
        let newY = x * this.mat[1] + y * this.mat[4] + this.mat[7];
        return [newX, newY];
    }

    combine(other) {
        let c = new Transform();
        c.mat[0] = this.mat[0] * other.mat[0] + this.mat[3] * other.mat[1] + this.mat[6] * other.mat[2];
        c.mat[1] = this.mat[1] * other.mat[0] + this.mat[4] * other.mat[1] + this.mat[7] * other.mat[2];
        c.mat[2] = this.mat[2] * other.mat[0] + this.mat[5] * other.mat[1] + this.mat[8] * other.mat[2];

        c.mat[3] = this.mat[0] * other.mat[3] + this.mat[3] * other.mat[4] + this.mat[6] * other.mat[5];
        c.mat[4] = this.mat[1] * other.mat[3] + this.mat[4] * other.mat[4] + this.mat[7] * other.mat[5];
        c.mat[5] = this.mat[2] * other.mat[3] + this.mat[5] * other.mat[4] + this.mat[8] * other.mat[5];

        c.mat[6] = this.mat[0] * other.mat[6] + this.mat[3] * other.mat[7] + this.mat[6] * other.mat[8];
        c.mat[7] = this.mat[1] * other.mat[6] + this.mat[4] * other.mat[7] + this.mat[7] * other.mat[8];
        c.mat[8] = this.mat[2] * other.mat[6] + this.mat[5] * other.mat[7] + this.mat[8] * other.mat[8];
        return c;
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

let transformStack = [new Transform()];
let projMatrix;

let drawParams;
let currentMesh = null;
let models = [];

let shapeShader, texShader;

let fbo;

const shapeVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=1) in vec3 aColor;

out vec4 vColor;
uniform mat4 uProjMatrix;
void main() {
    vColor = vec4(aColor, 1);
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uProjMatrix * pos;
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
uniform mat4 uProjMatrix;

void main() {
    vTexCoord = aTexCoord;
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uProjMatrix * pos;
}`;

const texFragSrc = `#version 300 es
precision mediump float;

uniform sampler2D uTex0;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    fragColor = texture(uTex0, vTexCoord);
}`;

function init(targetCanvas) {
    canvas = targetCanvas;
    gl = canvas.getContext("webgl2", {
        alpha: false,
        depth: false,
        stencil: false,
        // TODO: try enable antialias
    });

    if (gl === null) {
        throw "could not get webgl2 context";
    }

    // TODO: do not get context with depth buffer if we don't need it
    gl.disable(gl.DEPTH_TEST);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    shapeShader = new Shader(shapeVertSrc, shapeFragSrc);
    texShader = new Shader(texVertSrc, texFragSrc);

    shapeMesh = new Mesh(ATTRIB_POS | ATTRIB_COLOR);

    _resize(canvas.clientWidth, canvas.clientHeight); // initial resize

    fbo = gl.createFramebuffer();
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

    projMatrix = [
        scaleX, 0, 0, 0,
        0, scaleY, 0, 0,
        0, 0, -1, 0,
        -1, -1, 0, 1,
      ];
}

function pushTransform(t) {
    transformStack.push(transformStack[transformStack.length-1].combine(t));
}

function popTransform() {
    if (transformStack.length < 2) {
        return;
    }
    transformStack.pop();
}

function getTransform() {
    return transformStack[transformStack.length-1];
}

function setDrawParams(params) {
    SIMPLIFY
    addRect
    addSphere can be mesh functions
    list of models that get rendered
    uniforms get set to shader
    light fadeoff can be done in color attribute

    drawRect, drawCircle (shapes) can stay as useful debug draw functions

    if (currentMesh !== null) {
        models.push(new Model(currentMesh, drawParams.drawMode, drawParams.shader, drawParams.textures));
    }
    drawParams = params;
    let attribs = ATTRIB_POS;
    if (drawParams.textures.length > 0) {
        attribs |= ATTRIB_TEX;
    } else {
        attribs |= ATTRIB_COLOR;
    }
    currentMesh = new Mesh(attribs);
}

function drawRect(x, y, width, height, s0=0, s1=1, t0=0, t1=1) {
    shapeMesh.setTransform(transformStack[transformStack.length-1]);
    mesh.add(x, y, s0, t0);
    mesh.add(x+width, y, s1, t0);
    mesh.add(x+width, y+height, s1, t1);
    mesh.add(x, y, s0, t0);
    mesh.add(x+width, y+height, s1, t1);
    mesh.add(x, y+height, s0, t1);
}

function drawCircle(x, y, radius, s0=0, s1=1, t0=0, t1=1) {
    shapeMesh.setTransform(transformStack[transformStack.length-1]);
    const resolution = 36;
    const rads = 2 * Math.PI / resolution;
    for (let i = 0; i < resolution; i++) {
        let rad0 = i * rads;
        let rad1 = (i+1) * rads;
        shapeMesh.add(x, y, 0.5, 0.5);
        shapeMesh.add(
            x+radius * Math.cos(rad0),
            y+radius * Math.sin(rad0),
            0.5 + Math.cos(rad0),
            0.5 + Math.sin(rad0),
        );
        shapeMesh.add(
            x+radius * Math.cos(rad1),
            y+radius * Math.sin(rad1),
            0.5 + Math.cos(rad1),
            0.5 + Math.sin(rad1),
        );
    }
}

function drawModel(model) {
    models.push(model);
}

function render(targetTexture=null) {
    if (targetTexture !== null) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture.glTexture, 0);
        console.assert(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE);
    } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clear(gl.COLOR_BUFFER_BIT);


    models.push(new Model(shapeMesh, gl.TRIANGLES, shapeShader));
    shapeMesh.clear();

    texMeshMap.forEach((mesh, texture) => {
        models.push(new Model(mesh, gl.TRIANGLES, texShader, [texture]));
        mesh.clear();
    });

    for (let model of models) {
        _renderModel(model);
    }
    models = [];
}

function _renderModel(model) {
    if (model.numElements === 0) {
        return;
    }

    let prog = model.shader.prog;
    gl.useProgram(prog);


    let uProjMatrixLoc = gl.getUniformLocation(prog, "uProjMatrix");
    gl.uniformMatrix4fv(uProjMatrixLoc, false, projMatrix);

    if ((model.attribs & ATTRIB_TEX) === ATTRIB_TEX) {
        for (let i = 0; i < model.textures.length; i++) {
            let tex = model.textures[i];
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, tex.glTexture);
            let uTexLoc = gl.getUniformLocation(prog, "uTex"+i);
            gl.uniform1i(uTexLoc, i);
        }
    }

    gl.bindVertexArray(model.vao);

    gl.drawArrays(model.drawMode, 0, model.numElements);
}

export {
    Shader,
    Transform,
    Texture,
    Mesh,
    Model,
    init,
    resize,
    pushTransform,
    popTransform,
    getTransform,
    setDrawParams,
    drawRect,
    drawCircle,
    drawTexture,
    drawModel,
    render,
    gl,
    ATTRIB_POS,
    ATTRIB_COLOR,
    ATTRIB_TEX,
};