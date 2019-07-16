
// We are rendering a serie of Quad (one per thumbnail) already in UV space to simplify the shader.
//
// We therefore need to scale and offset the rendering for each thumbnail and then project in Clip space (-1 to 1)
//   1. glPosition = (position * scale + offset) * 2. - 1.;
//
// and to optimize at most we would like only one madd so:
//   2. glPosition = position * shaderScale + shaderOffset;
//
// We can then developped 1. to:
//   3. glPosition = position * scale * 2. + offset * 2. - 1.;
//
// and finally infer from 2. and 3. that:
// 
// -------------------------------------
// |                                   |
// |  shaderScale = scale * 2.;        |
// |  shaderOffset = offset * 2. - 1.; |
// |                                   |
// -------------------------------------

const vertexShader = `
    attribute vec2 position;

    uniform vec2 scale;
    uniform vec2 offset;

    varying vec2 uv;

    void main(void) {
        uv = position;

        vec2 canvasPosition = position * scale + offset;

        gl_Position = vec4(canvasPosition, 0.0, 1.0);
    }
`;

const fragmentShader = `
    varying vec2 uv;

    uniform sampler2D thumbnail;

    void main(void) {
        vec3 color = texture2D(thumbnail, uv).rgb;

        gl_FragColor = vec4(color, 1.);
    }
`;

export const ShaderConfiguration = {
    name: "timeline",
    vertexShader,
    fragmentShader,
    attributeNames: ["position"],
    uniformNames: ["scale", "offset"],
    samplerNames: ["thumbnail"],
}