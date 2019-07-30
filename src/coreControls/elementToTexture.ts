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
 * @returns the Babylon.js texture.
 */
export function elementToTexture(engine: Engine,
    textureData: BaseTexture | HTMLCanvasElement | HTMLVideoElement | string, 
    name: string,
    generateMipMaps: boolean = false,
    filteringType: number = Constants.TEXTURE_NEAREST_NEAREST): BaseTexture {

    let texture: BaseTexture;
    // In case of a texture do nothing.
    if (textureData instanceof BaseTexture) {
        texture = textureData;
    }
    // In case of string, load the texture from a URI.
    else if (typeof(textureData) === "string") {
        texture = new Texture(textureData, engine, true, true, filteringType);
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

        const onload = () => {
            htmlElementTexture.update(false);
            htmlElementTexture.element = null;
        };

        if (textureData instanceof HTMLVideoElement) {
            if (textureData.readyState < textureData.HAVE_CURRENT_DATA) {
                // Seek to 0 does not raise by default.
                // Use loadedData instead
                const eventName = textureData.currentTime == 0 ? "loadeddata" : "seeked";
                textureData.addEventListener(eventName, () => { onload(); });
            }
            else {
                // Video Element is ready to be uploaded to GPU.
                onload();
            }
        }
        else {
            // Canvas element are considered already ready to be uploaded to GPU.
            onload();
        }
    }

    // Sets common texture parameters.
    texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    texture.name = name;
    
    return texture;
}