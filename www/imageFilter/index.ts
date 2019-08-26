import { ImageFilter } from "../../src/imageFilter";

import { BlackAndWhitePostProcess } from "@babylonjs/core/PostProcesses/blackAndWhitePostProcess";

import { ImageProcessingPostProcess } from "@babylonjs/core/PostProcesses/imageProcessingPostProcess";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";

import { EffectWrapper } from "@babylonjs/core/Materials/effectRenderer";

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
            
            void main(void) 
            {
                gl_FragColor = texture2D(textureSampler, vUV);

                // Swizzle channels
                float r = gl_FragColor.r;
                gl_FragColor.r = gl_FragColor.b;
                gl_FragColor.b = r;
            }
        `,
        samplerNames: ["textureSampler"]
    });

    startProcessingButton.addEventListener("click", function(e) {
        backAndWhiteFilter.filter(imageToProcess, blackAndWhitePostProcess);
        imageProcessingFilter.filter(imageToProcess, imageProcessingPostProcess);
        customFilter.filter(imageToProcess, customEffectWrapper);

        e.preventDefault();
        e.stopPropagation();
        return false;
    });
}

main();