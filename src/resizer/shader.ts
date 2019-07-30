
// We are rendering only one picture fullscreen or on the full offscreen texture.

const vertexShader = `
    attribute vec2 position;

    varying vec2 uv;

    void main(void) {
        uv = position * 0.5 + 0.5;

        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 uv;

    uniform sampler2D toResize;

    void main(void) {
        gl_FragColor = texture2D(toResize, uv);
    }
`;

export const ShaderConfiguration = {
    name: "resizer",
    // Use the Babylon.js post process one by default.
    // TODO. Fix upstream control.
    vertexShader: vertexShader,
    fragmentShader,
    attributeNames: ["position"],
    samplerNames: ["toResize"],
}