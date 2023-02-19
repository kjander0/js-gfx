import * as gfx from "./gfx/gfx.js"
// TODO
// - check mozilla webgl best practices

window.onload = function () {
    let highlightsTex = new gfx.Texture();
    let highlightsShader = new gfx.Shader();
    let spriteShader = new gfx.Shader();
    function render() {
        gfx.pushTransform(20, 20);
        gfx.circle(10);
        gfx.render(highlightsTex);
        gfx.sprite([spriteTex, highlightsTex], shader);
        gfx.render(); // to screen
        window.requestAnimationFrame(render);
    };
    window.requestAnimationFrame(render);
};