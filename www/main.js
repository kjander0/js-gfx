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
        gfx.drawRect(-20, -20, 60, 30);
        gfx.setColor(0.6, 0.3, 0.5);
        gfx.drawRect(-100, -100, 60, 30);
        gfx.setColor(0, 0.7, 0.2);
        gfx.drawCircle(-150, -150, 60);
        gfx.drawTexture(0, 0, 100, 100, tex);

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