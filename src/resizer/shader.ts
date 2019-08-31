
// We are rendering only one picture fullscreen or on the full offscreen texture.

const vertexShader = `
    attribute vec2 position;

    varying vec2 uv;

    const vec2 scale = vec2(0.5, -0.5);

    void main(void) {
        uv = position * scale + 0.5;

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
    vertexShader: vertexShader,
    fragmentShader,
    attributeNames: ["position"],
    samplerNames: ["toResize"],
}