import * as gfx from "./gfx/gfx.js"
// TODO
// - consider enabling depth buffer and use z to order 2d sprites
// - check mozilla webgl best practices
// - gamma correction, but not for normal tetures
// - avoid calling useProgram if shader already bound
const canvas = document.getElementById("glcanvas");

const ATTRIB_LIGHT_POS_LOC = 3;

const lightsVertSrc = `#version 300 es
layout (location=0) in vec2 aVertexPosition;
layout (location=3) in vec2 aLightPos;

out vec2 vTexCoord;
out vec2 vLightPos;
out vec2 vPos;

uniform mat4 uProjMatrix;
uniform mat3 uCamMatrix;
uniform vec2 uScreenSize;
//uniform float uRadius;

void main() {
    vLightPos = aLightPos;
    vPos = aVertexPosition + aLightPos;
    vec2 screenPos = (uCamMatrix * vec3(vPos, 1)).xy;
    vTexCoord = screenPos / 2000.0;
    gl_Position = uProjMatrix * vec4(screenPos, 0, 1);
}`;

const lightsFragSrc = `#version 300 es
precision mediump float;

uniform sampler2D uTex0; // normals

in vec2 vTexCoord;
in vec2 vLightPos;
in vec2 vPos;
out vec4 fragColor;

void main() {
    vec3 normalSample = texture(uTex0, vTexCoord).rgb;
    vec3 normal = 2.f * normalSample - vec3(1.f);
    float alpha = step(0.5, length(normal));
    normal = normalize(normal);

    vec3 lightDir = vec3(vPos - vLightPos, 0);
    float dist = length(lightDir);
    lightDir = normalize(lightDir);

    // TODO add light falloff (radius as uniform)
    vec3 color = dot(normal, -lightDir) * vec3(1.f, 0.f, 0.f);;
    fragColor = texture(uTex0, vTexCoord);
    //fragColor = vec4(vTexCoord, 0, alpha);
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
    fragColor = texture(uTex0, vTexCoord) + texture(uTex1, vTexCoord);
}`;

function onresize () {
    // TODO: originate resize event from gfx (monitoring canvas resize)
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
        gfx.setCamera(camX, camY); // TODO: this function should inverse to get the camera transform
        
        // TODO: draw normal/albedo offscreen textures with the same shader!!!

        // Draw normals to offscreen texture
        gfx.drawTexture(0, 0, 100, 100, shipNormalTex);
        gfx.gl.clearColor(0.5, 0.5, 0.5, 1.0);
        gfx.render(normalTex);

        // Draw albedo to offscreen texture
        gfx.drawTexture(0, 0, 100, 100, shipAlbedoTex);
        gfx.gl.clearColor(0, 0, 0, 1.0);
        gfx.render(albedoTex);

        let posData = [60, 60];
        let lightsMesh = new gfx.Mesh(gfx.ATTRIB_POS);
        const lightRadius = 150;
        // const s0 = (lightX - lightRadius) / gfx.gl.drawingBufferWidth;
        // const t0 = (lightY - lightRadius) / gfx.gl.drawingBufferHeight;
        // const s1 = (lightX + lightRadius) / gfx.gl.drawingBufferWidth;
        // const t1 = (lightY + lightRadius) / gfx.gl.drawingBufferHeight;
        lightsMesh.addCircle(0, 0, lightRadius);

        let lightPosAttrib = new gfx.VertexAttrib(ATTRIB_LIGHT_POS_LOC, 2, gfx.gl.FLOAT, 1);
        lightPosAttrib.data = posData;

        //lightsShader.setUniform("uScreenSize", [gfx.gl.drawingBufferWidth, gfx.gl.drawingBufferHeight]);
        //lightsShader.setUniform("uRadius", lightRadius);

        let lightsModel = new gfx.Model(
            lightsMesh,
            gfx.gl.TRIANGLES,
            lightsShader,
            [normalTex],
            [lightPosAttrib],
            1,
        );

        gfx.drawModel(lightsModel);
        gfx.render(highlightTex);
        
        gfx.setCamera(gfx.gl.drawingBufferWidth/2.0, gfx.gl.drawingBufferHeight/2.0);
        gfx.drawTexture(0, 0, gfx.gl.drawingBufferWidth, gfx.gl.drawingBufferHeight, highlightTex);

        // let shipMesh = new gfx.Mesh(gfx.ATTRIB_POS | gfx.ATTRIB_TEX);
        // shipMesh.addRect(0, 0, gfx.gl.drawingBufferWidth, gfx.gl.drawingBufferHeight);
        // let shipModel = new gfx.Model(
        //     shipMesh,
        //     gfx.gl.TRIANGLES,
        //     spriteShader,
        //     [albedoTex, highlightTex]
        // );
        // gfx.drawModel(shipModel);
        
        gfx.render();


        window.requestAnimationFrame(render);
    };
    window.requestAnimationFrame(render);
};