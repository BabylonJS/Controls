import { ImageFilter } from "../../src/imageFilter";

import { BlackAndWhitePostProcess } from "@babylonjs/core/PostProcesses/blackAndWhitePostProcess";

import { ImageProcessingPostProcess } from "@babylonjs/core/PostProcesses/imageProcessingPostProcess";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";

import { EffectWrapper } from "@babylonjs/core/Materials/effectRenderer";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

const beforePicture1 = document.getElementById("beforePicture1") as HTMLImageElement;
const beforePicture2 = document.getElementById("beforePicture2") as HTMLImageElement;
const beforePicture3 = document.getElementById("beforePicture3") as HTMLImageElement;
const afterPicture1 = document.getElementById("afterPicture1") as HTMLCanvasElement;
const afterPicture2 = document.getElementById("afterPicture2") as HTMLCanvasElement;
const afterPicture3 = document.getElementById("afterPicture3") as HTMLCanvasElement;
const startProcessingButton = document.getElementById("startProcessingButton");

const imageToProcess = "../assets/logo.png";

function main() {
    beforePicture1.src = imageToProcess;
    beforePicture2.src = imageToProcess;
    beforePicture3.src = imageToProcess;

    const backAndWhiteFilter = new ImageFilter(afterPicture1);
    const imageProcessingFilter = new ImageFilter(afterPicture2);
    const customFilter = new ImageFilter(afterPicture3);

    const blackAndWhitePostProcess = new BlackAndWhitePostProcess("bw", 1, null, undefined, backAndWhiteFilter.engine);

    const imageProcessingConfiguration = new ImageProcessingConfiguration();
    imageProcessingConfiguration.colorCurvesEnabled = true;
    imageProcessingConfiguration.colorCurves.globalSaturation = 80;
    const imageProcessingPostProcess = new ImageProcessingPostProcess("ip", 1, null, undefined, imageProcessingFilter.engine, undefined, undefined, imageProcessingConfiguration);

    const customEffectWrapper = new EffectWrapper({
        name: "Custom",
        engine: customFilter.engine,
        fragmentShader: `
            // Samplers
            varying vec2 vUV;
            uniform sampler2D textureSampler;

            uniform sampler2D otherTexture;
            uniform vec3 colorOffset;

            const vec2 scale = vec2(0.25, 1.);

            void main(void) 
            {
                gl_FragColor = texture2D(textureSampler, vUV);

                // Swizzle channels
                float r = gl_FragColor.r;
                gl_FragColor.r = gl_FragColor.b;
                gl_FragColor.b = r;
                gl_FragColor.rgb += clamp(colorOffset, 0., 1.);

                gl_FragColor.rgb *= texture2D(otherTexture, vUV * scale).rgb;
            }
        `,
        // Defines the list of existing samplers.
        samplerNames: ["textureSampler", "otherTexture"],
        // Defines the list of existing uniform to be bound.
        uniformNames: ["colorOffset"],
    });

    var time = 0;
    var otherTexture = new Texture("../assets/timeline.png", customFilter.engine);

    // Demos a dynamic way of using the effect over time.
    customFilter.engine.runRenderLoop(() => {
        // Only render if the texture is ready
        if (!otherTexture.isReady()) {
            return;
        }

        // Sets custom values.
        time += customFilter.engine.getDeltaTime() / 1000;
        customEffectWrapper.effect.setTexture("otherTexture", otherTexture);
        customEffectWrapper.effect.setFloat3("colorOffset", Math.cos(time) * 0.5 + 0.5, 0, Math.sin(time) * 0.5 + 0.5);

        // Render.
        customFilter.filter(imageToProcess, customEffectWrapper);
    });

    startProcessingButton.addEventListener("click", function(e) {
        backAndWhiteFilter.filter(imageToProcess, blackAndWhitePostProcess);
        imageProcessingFilter.filter(imageToProcess, imageProcessingPostProcess);

        e.preventDefault();
        e.stopPropagation();
        return false;
    });
}

main();