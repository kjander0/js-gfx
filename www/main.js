import * as gfx from "./gfx/gfx.js"
// TODO
// - consider enabling depth buffer and use z to order 2d sprites
// - check mozilla webgl best practices
const canvas = document.getElementById("glcanvas");

const ATTRIB_LIGHT_POS_LOC = 3;

const lightsVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=2) in vec2 aTexCoord;

out vec2 vTexCoord;
uniform mat4 uProjMatrix;


void main() {
    vTexCoord = aTexCoord;
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uProjMatrix * pos;
}`;

const lightsFragSrc = `#version 300 es
precision mediump float;

uniform sampler2D uTex0; // normals

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    vec3 normalSample = texture(uTex0, vTexCoord).rgb;
    vec3 normal = 2.f * normalSample - vec3(1.f);
    vec3 lightDir = normalize(vec3(1, 1, 1));
    //fragColor = texture(uTex0, vTexCoord);
    //fragColor = vec4(vTexCoord, 0, 1);
    fragColor = dot(normal, lightDir) * vec4(1.1, 0.f, 0.f, 1.f);
}`;

const spriteVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=2) in vec2 aTexCoord;
layout (location=3) in vec2 aLightPos;

out vec2 vTexCoord;
out vec2 vLightPos;
uniform mat4 uProjMatrix;


void main() {
    vTexCoord = aTexCoord;
    vLightPos = aLightPos;
    vec4 pos = vec4(aVertexPosition, 0, 1);
    gl_Position = uProjMatrix * pos;
}`;

const spriteFragSrc = `#version 300 es
precision mediump float;

uniform sampler2D uTex0; // albedo
uniform sampler2D uTex1; // highlights

in vec2 vTexCoord;
in vec2 vLightPos;
out vec4 fragColor;

void main() {
    fragColor = texture(uTex0, vTexCoord) + texture(uTex1, vTexCoord);
}`;

function onresize () {
    gfx.resize(canvas.clientWidth, canvas.clientHeight);
}

window.onload = function () {
    gfx.init(canvas);

    const lightsShader = new gfx.Shader(lightsVertSrc, lightsFragSrc);
    const spriteShader = new gfx.Shader(spriteVertSrc, spriteFragSrc);


    let shipAlbedoTex = gfx.Texture.fromUrl("assets/ship.png");
    let shipNormalTex = gfx.Texture.fromUrl("assets/ship_normal.png");

    let albedoTex = gfx.Texture.fromSize(
        gfx.gl.drawingBufferWidth,
        gfx.gl.drawingBufferHeight
    );
    let normalTex = gfx.Texture.fromSize(
        gfx.gl.drawingBufferWidth,
        gfx.gl.drawingBufferHeight
    );
    let highlightTex = gfx.Texture.fromSize(
        gfx.gl.drawingBufferWidth,
        gfx.gl.drawingBufferHeight
    );

    window.onresize = onresize;

    function render() {
        let camX = 0;
        let camY = 0;
        let camTransform = gfx.Transform.translation(gfx.gl.drawingBufferWidth/2 - camX, gfx.gl.drawingBufferHeight/2 -camY);
        
        gfx.pushTransform(camTransform);

        // Draw normals to offscreen texture
        gfx.drawTexture(0, 0, 100, 100, shipNormalTex);
        gfx.render(normalTex);

        // Draw albedo to offscreen texture
        gfx.drawTexture(0, 0, 100, 100, shipAlbedoTex);
        gfx.render(albedoTex);

        gfx.popTransform();

        let lightsMesh = new gfx.Mesh(gfx.ATTRIB_POS | gfx.ATTRIB_TEX);

        //lights = [[], [], [], []];
        const [lightX, lightY] = camTransform.mulXY(0, 0);
        const lightRadius = 150;
        const s0 = (lightX - lightRadius) / gfx.gl.drawingBufferWidth;
        const t0 = (lightY - lightRadius) / gfx.gl.drawingBufferHeight;
        const s1 = (lightX + lightRadius) / gfx.gl.drawingBufferWidth;
        const t1 = (lightY + lightRadius) / gfx.gl.drawingBufferHeight;
        lightsMesh.addCircle(lightX, lightY, lightRadius, s0, t0, s1, t1);
        lightsMesh.data.push(lightX, lightY);
        let lightPosAttrib = new gfx.VertexAttrib(ATTRIB_LIGHT_POS_LOC, 2, gfx.gl.FLOAT, 1);
        let lightsModel = new gfx.Model(
            lightsMesh,
            gfx.gl.TRIANGLES,
            lightsShader,
            [normalTex],
            [lightPosAttrib],
            1
        );
        gfx.drawModel(lightsModel);
        gfx.render(highlightTex);

        let shipMesh = new gfx.Mesh(gfx.ATTRIB_POS | gfx.ATTRIB_TEX);
        shipMesh.addRect(0, 0, gfx.gl.drawingBufferWidth, gfx.gl.drawingBufferHeight);
        let shipModel = new gfx.Model(
            shipMesh,
            gfx.gl.TRIANGLES,
            spriteShader,
            [albedoTex, highlightTex]
        );
        gfx.drawModel(shipModel);
        gfx.render();


        window.requestAnimationFrame(render);
    };
    window.requestAnimationFrame(render);
};