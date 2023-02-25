import * as gfx from "./gfx/gfx.js"
// TODO
// - check mozilla webgl best practices
const canvas = document.getElementById("glcanvas");

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
    fragColor = dot(normal, lightDir) * vec4(1.1, 0.f, 0.f, 1.f);
}`;

function onresize () {
    gfx.resize(canvas.clientWidth, canvas.clientHeight);
}

window.onload = function () {
    gfx.init(canvas);

    const lightsShader = new gfx.Shader(lightsVertSrc, lightsFragSrc);

    let shipAlbedoTex = gfx.Texture.fromUrl("assets/ship.png");
    let shipNormalTex = gfx.Texture.fromUrl("assets/ship_normal.png");

    let highlightTex = gfx.Texture.fromSize(
        gfx.gl.drawingBufferWidth,
        gfx.gl.drawingBufferHeight
    );
    let normalTex = gfx.Texture.fromSize(
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

        // Draw highlights for each light
        function drawLight(x, y, radius, mesh) {
            const resolution = 16;
            const rads = 2 * Math.PI / resolution;
            const screenWidth = gfx.gl.drawingBufferWidth;
            const screenHeight = gfx.gl.drawingBufferHeight;

            function addPoint(x, y) {
                // TODO Use matrix inverse via to get tex coords
                let offsetX = gfx.getTransform().mat[6];
                let offsetY = gfx.getTransform().mat[7];
                mesh.add(x, y, (x + offsetX) / screenWidth, (y + offsetY) / screenHeight);
            }

            for (let i = 0; i < resolution; i++) {
                let rad0 = i * rads;
                let rad1 = (i+1) * rads;
                addPoint(x, y);
                addPoint(x+radius * Math.cos(rad0), y+radius * Math.sin(rad0));
                addPoint(x+radius * Math.cos(rad1), y+radius * Math.sin(rad1));
            }
        }
        let lightsMesh = new gfx.Mesh(gfx.ATTRIB_POS | gfx.ATTRIB_TEX);
        lightsMesh.setTransform(gfx.getTransform());
        drawLight(0, 0, 150, lightsMesh);
        let lightsModel = new gfx.Model(lightsMesh, gfx.gl.TRIANGLES, lightsShader, [normalTex]);
        gfx.drawModel(lightsModel);
        gfx.render(highlightTex);

        gfx.popTransform();
        gfx.drawTexture(0, 0, gfx.gl.drawingBufferWidth, gfx.gl.drawingBufferHeight, highlightTex);
        //gfx.drawTexture(0, 0, 100, 100, shipAlbedoTex);
        gfx.render();


        window.requestAnimationFrame(render);
    };
    window.requestAnimationFrame(render);
};