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

    const processorBlackAndWhite = new ImageFilter(afterPicture1);
    const processorImageProcessing = new ImageFilter(afterPicture2);
    const customProcessing = new ImageFilter(afterPicture3);

    const blackAndWhite = new BlackAndWhitePostProcess("bw", 1, null, undefined, processorBlackAndWhite.engine);

    const imageProcessingConfiguration = new ImageProcessingConfiguration();
    const imageProcessing = new ImageProcessingPostProcess("ip", 1, null, undefined, processorImageProcessing.engine, undefined, undefined, imageProcessingConfiguration);
    imageProcessing.imageProcessingConfiguration.colorCurvesEnabled = true;
    imageProcessing.imageProcessingConfiguration.colorCurves.globalSaturation = 80;

    const custom = new EffectWrapper({
        name: "Custom",
        engine: customProcessing.engine,
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
        processorBlackAndWhite.filter(imageToProcess, blackAndWhite);
        processorImageProcessing.filter(imageToProcess, imageProcessing);
        customProcessing.filter(imageToProcess, custom);

        e.preventDefault();
        e.stopPropagation();
        return false;
    });
}

main();