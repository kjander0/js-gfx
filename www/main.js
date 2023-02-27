import * as gfx from "./gfx/gfx.js"
// TODO
// - consider enabling depth buffer and use z to order 2d sprites
// - check mozilla webgl best practices
// - gamma correction, but not for normal tetures, check light falloff for gamma correction!
// - avoid calling useProgram if shader already bound
const canvas = document.getElementById("glcanvas");

const ATTRIB_LIGHT_POS_LOC = 3;

const lightsVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=2) in vec2 aTexCoord;
layout (location=3) in vec2 aLightPos;

out vec2 vTexCoord;
out vec2 vLightPos;
out vec2 vPos;

uniform mat4 uProjMatrix;
uniform mat3 uCamMatrix;
uniform vec2 uScreenSize;

void main() {
    vLightPos = aLightPos;
    vPos = aVertexPosition + aLightPos;
    vec2 screenPos = (uCamMatrix * vec3(vPos, 1)).xy;
    //vTexCoord = aTexCoord;
    vTexCoord = screenPos / uScreenSize;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}`;

const lightsFragSrc = `#version 300 es
precision mediump float;

uniform sampler2D uTex0; // normals
uniform float uRadius;

in vec2 vTexCoord;
in vec2 vLightPos;
in vec2 vPos;
out vec4 fragColor;

void main() {
    vec4 normalSample = texture(uTex0, vTexCoord);
    vec3 normal = normalize(2.f * normalSample.rgb - vec3(1.f));

    vec3 lightDir = vec3(vPos - vLightPos, 0.01f); // small z component to allow normalize (div by zero)
    float dist = length(lightDir);
    lightDir = normalize(lightDir);

    //float quadFalloff = max(1.f - dist * dist / (uRadius * uRadius), 0.f);
    float falloff = max(1.f - dist/uRadius, 0.f);

    vec3 color = falloff * dot(normal, -lightDir) * vec3(1.f, 0.1f, 0.1f);
    fragColor = vec4(color, normalSample.a);
    //fragColor = falloff * vec4(1.f, 0.f, 0.f, 1.f);

    TODO: gamma correct all shaders, and use SRGB textures
}`;

const spriteVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=2) in vec2 aTexCoord;

out vec2 vTexCoord;
uniform mat3 uCamMatrix;
uniform mat4 uProjMatrix;

void main() {
    vTexCoord = aTexCoord;
    vec2 screenPos = (uCamMatrix * vec3(aVertexPosition, 1)).xy;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}`;

const spriteFragSrc = `#version 300 es
precision mediump float;

uniform sampler2D uTex0; // albedo
uniform sampler2D uTex1; // highlights

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    // TODO tone mapping
    fragColor = texture(uTex0, vTexCoord) + texture(uTex1, vTexCoord);
}`;

let albedoTex = null, normalTex = null, highlightTex = null;

function onresize (bufWidth, bufHeight) {
    if (albedoTex !== null) {
        albedoTex.dispose();
        normalTex.dispose();
        highlightTex.dispose();
    }

    // TODO: consider using smaller offscreen textures (requires adjusting glViewPort())
    albedoTex = gfx.Texture.fromSize(
        bufWidth,
        bufHeight
    );
    normalTex = gfx.Texture.fromSize(
        bufWidth,
        bufHeight
    );
    highlightTex = gfx.Texture.fromSize(
        bufWidth,
        bufHeight
    );
}

window.onload = function () {
    gfx.setResizeCb(onresize); // set first so we get initial resize
    gfx.init(canvas);

    const lightsShader = new gfx.Shader(lightsVertSrc, lightsFragSrc);
    const spriteShader = new gfx.Shader(spriteVertSrc, spriteFragSrc);

    let shipAlbedoTex = gfx.Texture.fromUrl("assets/ship.png");
    let shipNormalTex = gfx.Texture.fromUrl("assets/ship_normal.png");

    const positions = [];
    for (let i = 0; i < 200; i++) {
        positions.push([(Math.random() - 0.5) * 1500, (Math.random() - 0.5) * 700]);
    }

    function render() {
        let camX = 0;
        let camY = 0;
        gfx.setCamera(camX, camY); // TODO: this function should inverse to get the camera transform
        
        // TODO: draw normal/albedo offscreen textures with the same shader!!!

        // Draw normals to offscreen texture
        gfx.gl.clearColor(0.0, 0.0, 1.0, 0.0);
        for (let shipPos of positions) {
            gfx.drawTexture(shipPos[0], shipPos[1], 100, 100, shipNormalTex);
        }
        gfx.render(normalTex);

        // Draw albedo to offscreen texture
        gfx.gl.clearColor(0, 0, 0, 1.0);
        for (let shipPos of positions) {
            gfx.drawTexture(shipPos[0], shipPos[1], 100, 100, shipAlbedoTex);
        }
        gfx.render(albedoTex);

        let posData = [130, 130, -90, -40, -100, 90, -500, -300, 500, -10, -550, 74];
        let lightsMesh = new gfx.Mesh(gfx.ATTRIB_POS);
        const lightRadius = 150;
        lightsMesh.addCircle(0, 0, lightRadius);

        let lightPosAttrib = new gfx.VertexAttrib(ATTRIB_LIGHT_POS_LOC, 2, gfx.gl.FLOAT, 1);
        lightPosAttrib.data = posData;

        lightsShader.setUniform("uScreenSize", [gfx.gl.drawingBufferWidth, gfx.gl.drawingBufferHeight]);
        lightsShader.setUniform("uRadius", lightRadius);

        let lightsModel = new gfx.Model(
            lightsMesh,
            gfx.gl.TRIANGLES,
            lightsShader,
            [normalTex],
            [lightPosAttrib],
            posData.length/2,
        );
        gfx.drawModel(lightsModel);
        gfx.gl.blendFunc(gfx.gl.SRC_ALPHA, gfx.gl.DST_ALPHA); // combine lights equally
        gfx.render(highlightTex);
        gfx.gl.blendFunc(gfx.gl.SRC_ALPHA, gfx.gl.ONE_MINUS_SRC_ALPHA);
        
        gfx.setCamera(gfx.gl.drawingBufferWidth/2.0, gfx.gl.drawingBufferHeight/2.0);
        //gfx.drawTexture(0, 0, gfx.gl.drawingBufferWidth, gfx.gl.drawingBufferHeight, highlightTex);

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