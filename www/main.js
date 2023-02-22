import * as gfx from "./gfx/gfx.js"
// TODO
// - check mozilla webgl best practices
const canvas = document.getElementById("glcanvas");

function onresize () {
    gfx.resize(canvas.clientWidth, canvas.clientHeight);
}

window.onload = function () {
    gfx.init(canvas);

    let tex = gfx.Texture.fromUrl("assets/ship.png");

    window.onresize = onresize;

    //let highlightsTex = new gfx.Texture();
    //let highlightsShader = new gfx.Shader();
    //let spriteShader = new gfx.Shader();
    function render() {
        gfx.pushTransform(gfx.Transform.translation(-10, -10));
        gfx.rect(60, 30);
        gfx.pushTransform(gfx.Transform.translation(-100, -100));
        gfx.rect(60, 30);
        gfx.pushTransform(gfx.Transform.translation(-150, -150));
        gfx.circle(60);

        gfx.pushTransform(gfx.Transform.translation(100, 100));
        gfx.sprite(tex);

        gfx.render();


        //gfx.pushTransform(20, 20);
        //gfx.circle(10);
        //gfx.render(highlightsTex);
        //gfx.sprite([spriteTex, highlightsTex], shader);
        //gfx.render(); // to screen
        window.requestAnimationFrame(render);
    };
    window.requestAnimationFrame(render);
};