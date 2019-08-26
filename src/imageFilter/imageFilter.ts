import { Engine } from "@babylonjs/core/Engines/engine";
import { EffectWrapper, EffectRenderer } from "@babylonjs/core/Materials/effectRenderer";
import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { Effect } from "@babylonjs/core/Materials/effect";
import { Logger } from "@babylonjs/core/Misc/logger";

import { BaseControl } from "../coreControls/baseControl";
import { elementToTexture } from "../coreControls/elementToTexture";

/**
 * Defines a set of options provided to the image filter control.
 */
export interface IImageFilterOptions {
    /**
     * Defines whether MipMaps are necessary for the filtering.
     */
    generateMipMaps?: boolean;

    /**
     * Defines whether the input image should be filtered linearly.
     */
    linearFiltering?: boolean;
}

/**
 * The image filter control can help applying effect through webGL shaders to a picture.
 * This can be the most efficient way to process images on the web.
 * Despite a 2d context being fast, applying processing in parallel on the GPU
 * is order of magnitudes faster than CPU (for a wide variety of effects).
 */
export class ImageFilter extends BaseControl {
    private readonly _options: IImageFilterOptions;
    private readonly _generateMipMaps: boolean;
    private readonly _textureFiltering: number;

    private _effectRenderer: EffectRenderer;

    /**
     * Instantiates an image filter object able to efficiently apply effects to images.
     * @param parent defines the parent of the control. It could be either:
     *   - A canvas element: the canvas we want to render the control in.
     *   - An engine instance: the Babylon.js engine to use to render the control.
     *   - Another Babylon.js control: this allows sharing the engine cross controls to mix and match them for instance.
     * @param options defines the set of options used by the control.
     */
    constructor(parent: BaseControl | Engine | HTMLCanvasElement, options?: IImageFilterOptions) {
        super(parent);

        // Default options for the timeline.
        this._options = options || { };
        if (this._options.generateMipMaps === undefined) {
            this._options.generateMipMaps = true;
        }
        if (this._options.linearFiltering === undefined) {
            this._options.linearFiltering = true;
        }

        // Initialiazes the filtering setup in ctor to allow the use of readonly variables.
        this._generateMipMaps = this._options.generateMipMaps && this.engine.webGLVersion > 1;
        if (this._options.linearFiltering) {
            this._textureFiltering = this._generateMipMaps ? Constants.TEXTURE_TRILINEAR_SAMPLINGMODE : Constants.TEXTURE_BILINEAR_SAMPLINGMODE;
        }
        else {
            this._textureFiltering = this._generateMipMaps ? Constants.TEXTURE_NEAREST_NEAREST_MIPLINEAR : Constants.TEXTURE_NEAREST_NEAREST;
        }

        // Initializes the control.
        this._initializeRenderer();
    }

    /**
     * This will resize the texture to fit in the canvas size.
     * @param input defines the picture input we want to resize. It can be the url of a texture, another canvas or a video element.
     * @param filter defines the effect to use to filter the image.
     * @returns a promise to know when the rendering is done.
     */
    public filter(textureData: BaseTexture | HTMLCanvasElement | HTMLVideoElement | string, filter: PostProcess | EffectWrapper): Promise<null> {
        // Converts the texture data to an actual babylon.js texture.
        const inputTexture = elementToTexture(this.engine, textureData, "input", this._generateMipMaps, this._textureFiltering);

        // Wraps the result in a promise to simplify usage.
        return new Promise((success, _) => {
            const checkIsReady = (() => {
                if (inputTexture.isReady()) {
                    // Stops the check
                    this.engine.stopRenderLoop(checkIsReady);

                    // Once the input is ready, Render the texture as a full target quad.
                    this._render(inputTexture, filter);

                    // Free up memory resources from the input.
                    inputTexture.dispose();

                    // Notify the promise of the overall completion.
                    success();
                }
            }).bind(this);
    
            this.engine.runRenderLoop(checkIsReady);
        });
    }

    /**
     * This will return a Babylon texture resized to a chosen size.
     * @param textureData defines the picture input we want to resize. It can be the url of a texture, another canvas or a video element.
     * @param size defines the The chosen size of the texture on GPU.
     * @param filter defines the effect to use to filter the image.
     * @returns The Babylon texture to be used in other controls for instance. Be carefull, the texture might not be ready
     * as soon as you get it.
     */
    public getFilteredTexture(textureData: BaseTexture | HTMLCanvasElement | HTMLVideoElement | string, size: { width: number, height: number }, filter: PostProcess | EffectWrapper): BaseTexture {
        // Converts the texture data to an actual babylon.js texture.
        const inputTexture = elementToTexture(this.engine, textureData, "input", this._generateMipMaps, this._textureFiltering);

        // Creates an offscreen texture to render to.
        const outputTexture = this.engine.createRenderTargetTexture(size, { 
            format: Constants.TEXTUREFORMAT_RGBA,
            generateDepthBuffer: false,
            generateMipMaps: false,
            generateStencilBuffer: false,
            samplingMode: Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
            type: Constants.TEXTURETYPE_UNSIGNED_BYTE
         });
         // Ensure it is not ready so far.
         outputTexture.isReady = false;

        // Simple render function using the effect wrapper as a simple pass through of
        // the input texture. The main difference with the previous function is that it renders
        // to an offscreen texture.
        const render = () => {
            // Sets the output texture.
            this.engine.bindFramebuffer(outputTexture);

            // Sets the viewport to the render target texture size.
            this._effectRenderer.setViewport();

            // Render the texture as a full target quad.
            this._render(inputTexture, filter);

            // Unsets the output texture.
            this.engine.unBindFramebuffer(outputTexture);

            // Resets the viewport to the canvas size.
            this._effectRenderer.setViewport();

            // Notify that the texture is ready for consumption.
            outputTexture.isReady = true;

            // Free up input and output resources.
            this.engine._releaseFramebufferObjects(outputTexture);
            inputTexture.dispose();
        }

        const checkIsReady = (() => {
            if (inputTexture.isReady()) {
                this.engine.stopRenderLoop(checkIsReady);
                render();
            }
        }).bind(this);

        this.engine.runRenderLoop(checkIsReady);

        // Wraps the lower level texture in a more friendly one.
        const texture = new BaseTexture(null);
        texture._texture = outputTexture;

        return texture;
    }

    /**
     * Resizes the timeline to adapt to the new canvas size.
     * The canvas has to be resized before hand.
     * Be carefull, the current time and visible duration might be impacted to ensure it always starts
     * at the beginning of the displayed thumbnails list.
     */
    public resize(): void {
        // Updates engine sizes.
        this.engine.resize();
        // Resets the viewport to the new canvas size.
        this._effectRenderer.setViewport();
    }

    /**
     * Dispose all the associated resources with WebGL.
     */
    public dispose(): void {
        // Clear the renderer resources.
        this._effectRenderer.dispose();

        super.dispose();
    }

    private _initializeRenderer(): void {
        // Use the smallest module to render a quad on screen (no need for a full scene)
        this._effectRenderer = new EffectRenderer(this.engine);

        // Initializes the viewport to the full canvas size.
        this._effectRenderer.setViewport();
    }

    private _render(inputTexture: BaseTexture, filter: PostProcess | EffectWrapper): void {
        if (!filter) {
            Logger.Error("Please, specify at least a post process or an effectWrapper in the options.");
            return;
        }

        let effect: Effect;
        if (filter instanceof PostProcess) {
            effect = filter.getEffect();
            this._effectRenderer.bindBuffers(effect)
            filter.apply();

        }
        else if (filter instanceof EffectWrapper) {
            effect = filter.effect;
            this._effectRenderer.applyEffectWrapper(filter);
        }

        effect.setTexture("textureSampler", inputTexture);

        this._effectRenderer.draw();
    }
}