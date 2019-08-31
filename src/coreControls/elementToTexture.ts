import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { HtmlElementTexture } from "@babylonjs/core/Materials/Textures/htmlElementTexture";

import { Constants } from "@babylonjs/core/Engines/constants";
import { Engine } from "@babylonjs/core/Engines/engine";

/**
 * Converts heterogenous texture types to a Babylon.js usable texture.
 * @param engine defines the engine the texture will be associated with.
 * @param textureData defines the texture data as a texture, a video, a canvas or a url.
 * @param name defines the name of the texture.
 * @param generateMipMaps defines if mipmaps needs to be generated for the texture.
 * @param textureData defines the type of filtering used for the texture (Constants.TEXTURE_NEAREST_NEAREST...).
 * @param invertY defines whether the default vertical orientation shoudl be reversed.
 * @returns the Babylon.js texture.
 */
export function elementToTexture(engine: Engine,
    textureData: BaseTexture | HTMLCanvasElement | HTMLVideoElement | string, 
    name: string,
    generateMipMaps: boolean = false,
    filteringType: number = Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
    invertY = true): BaseTexture {

    let texture: BaseTexture;
    // In case of a texture do nothing.
    if (textureData instanceof BaseTexture) {
        texture = textureData;
    }
    // In case of string, load the texture from a URI.
    else if (typeof(textureData) === "string") {
        texture = new Texture(textureData, engine, !generateMipMaps, invertY, filteringType);
    }
    else {
        // Else loads the provided video or canvas element.
        const htmlElementTexture = new HtmlElementTexture(name, textureData, {
            engine: engine,
            generateMipMaps: generateMipMaps,
            samplingMode: filteringType,
            scene: null
        });
        texture = htmlElementTexture;

        const onTextureUpdated = () => {
            // Try to not release too soon, it looks like
            // it might cause glitches in older browsers.
            setTimeout(() => {
                htmlElementTexture.element = null;
            }, 500);
        }

        if (textureData instanceof HTMLVideoElement && textureData.readyState < textureData.HAVE_ENOUGH_DATA) {
            const checkIsReady = (() => {
                if ((<any>textureData).readyState < textureData.HAVE_ENOUGH_DATA) {
                    return;
                }
                engine.stopRenderLoop(checkIsReady);
                htmlElementTexture.update(!invertY);
                onTextureUpdated();
            }).bind(this);

            engine.runRenderLoop(checkIsReady);
        }
        else if (textureData instanceof HTMLVideoElement) {
            htmlElementTexture.update(!invertY);
            onTextureUpdated();
        }
        else {
            // Canvas element are considered already ready to be uploaded to GPU.
            htmlElementTexture.update(invertY);
            onTextureUpdated();
        }
    }

    // Sets common texture parameters.
    texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    texture.name = name;
    
    return texture;
}