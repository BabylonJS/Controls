import { ThinEngine } from "@babylonjs/core/Engines/thinEngine";
import { EffectWrapper, EffectRenderer } from "@babylonjs/core/Materials/effectRenderer";
import { Constants } from "@babylonjs/core/Engines/constants";
import { ThinTexture } from "@babylonjs/core/Materials/Textures/thinTexture";
import { ThinRenderTargetTexture } from "@babylonjs/core/Materials/Textures/thinRenderTargetTexture";

import { ShaderConfiguration } from "./shader";

import { BaseControl } from "../coreControls/baseControl";
import { elementToTexture } from "../coreControls/elementToTexture";

import "@babylonjs/core/Engines/Extensions/engine.renderTarget";

/**
 * Represents a resizer control leveraging WebGL to speed up resizing images.
 * 
 * One of the biggest advantage is that the output can directly be used as a 
 * Babylon.js Texture so that if you need to resize thumbnails,
 * they do not need any extra copies a canvas2D would have.
 */
export class Resizer extends BaseControl {
    private readonly _generateMipMaps: boolean;
    private readonly _textureFiltering: number;
    private _effectRenderer: EffectRenderer;
    private _effectWrapper: EffectWrapper;

    /**
     * Instantiates a resizer object able to efficiently resize a picture on the GPU.
     * @param parent defines the parent of the control. It could be either:
     *   - A canvas element: the canvas we want to render the control in.
     *   - An engine instance: the Babylon.js engine to use to render the control.
     *   - Another Babylon.js control: this allows sharing the engine cross controls to mix and match them for instance.
     */
    constructor(parent: BaseControl | ThinEngine | HTMLCanvasElement) {
        super(parent);

        this._generateMipMaps = this.engine.webGLVersion > 1;
        this._textureFiltering = this._generateMipMaps ? Constants.TEXTURE_TRILINEAR_SAMPLINGMODE : Constants.TEXTURE_BILINEAR_SAMPLINGMODE;

        // Initializes the resizer control.
        this._initializeRenderer();
    }

    /**
     * Dispose all the associated resources with WebGL.
     */
    public dispose(): void {
        // Clear the renderer resources.
        this._effectWrapper.dispose();
        this._effectRenderer.dispose();

        super.dispose();
    }

    /**
     * This will resize the texture to fit in the canvas size.
     * @param input defines the picture input we want to resize. It can be the url of a texture, another canvas or a video element.
     * @returns a promise to know when the rendering is done.
     */
    public resize(textureData: ThinTexture | HTMLCanvasElement | HTMLVideoElement | string): Promise<void> {
        // Converts the texture data to an actual babylon.js texture.
        const inputTexture = elementToTexture(this.engine, textureData, "input", this._generateMipMaps, this._textureFiltering, false);

        // Wraps the result in a promise to simplify usage.
        return new Promise((success, _) => {
            const checkIsReady = (() => {
                if (inputTexture.isReady()) {
                    // Stops the check
                    this.engine.stopRenderLoop(checkIsReady);

                    // Once the input is ready, Render the texture as a full target quad.
                    this._render(inputTexture);

                    // Only dispose if needed
                    if (!(textureData instanceof ThinTexture)) {
                        // Free up memory resources from the input.
                        inputTexture.dispose();
                    }

                    // Notify the promise of the overall completion.
                    success();
                }
            }).bind(this);
    
            this.engine.runRenderLoop(checkIsReady);
        });
    }

    /**
     * Creates an offscreen texture if the chosen size to render to.
     * @param size defines the The chosen size of the texture on GPU.
     * @returns The Babylon texture to be used in other controls for instance. Be carefull, the texture might not be ready
     * as soon as you get it.
     */
    public createOffscreenTexture(size: { width: number, height: number }, samplingMode = Constants.TEXTURE_BILINEAR_SAMPLINGMODE): ThinRenderTargetTexture {
        // Creates an offscreen texture to render to.
        const outputTexture = new ThinRenderTargetTexture(this.engine, size, { 
            format: Constants.TEXTUREFORMAT_RGBA,
            generateDepthBuffer: false,
            generateMipMaps: false,
            generateStencilBuffer: false,
            samplingMode,
            type: Constants.TEXTURETYPE_UNSIGNED_BYTE
        });
        outputTexture._texture.isReady = false;
        outputTexture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        outputTexture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;

        return outputTexture;
    }

    /**
     * Resizes an input babylon texture into a texture created with the createOffscreenTexture function.
     * This is helpfull in realtime use cases. The content of the outputTexture will be updated.
     * @param inputTexture defines the Base texture to resize.
     * @param outputTexture defines the Babylon texture to resize into.
     */
    public resizeToTexture(inputTexture: ThinTexture, outputTexture: ThinRenderTargetTexture): void {
        // Sets the output texture.
        this.engine.bindFramebuffer(outputTexture.renderTarget);

        // Sets the viewport to the render target texture size.
        this._effectRenderer.setViewport();

        // Render the texture as a full target quad.
        this._render(inputTexture);

        // Unsets the output texture.
        this.engine.unBindFramebuffer(outputTexture.renderTarget);

        // Resets the viewport to the canvas size.
        this._effectRenderer.setViewport();

        // Notify that the texture is ready for consumption.
        outputTexture._texture.isReady = true;
    }

    /**
     * This will return a Babylon texture resized to a chosen size.
     * @param textureData defines the picture input we want to resize. It can be the url of a texture, another canvas or a video element.
     * @param size defines the The chosen size of the texture on GPU.
     * @returns The Babylon texture to be used in other controls for instance. Be carefull, the texture might not be ready
     * as soon as you get it.
     */
    public getResizedTexture(textureData: ThinTexture | HTMLCanvasElement | HTMLVideoElement | string, size: { width: number, height: number }): ThinTexture {
        // Converts the texture data to an actual babylon.js texture.
        const inputTexture = elementToTexture(this.engine, textureData, "input", this._generateMipMaps, this._textureFiltering, false);

        // Creates an offscreen texture to render to.
        const outputTexture = this.createOffscreenTexture(size);

        // Simple render function using the effect wrapper as a simple pass through of
        // the input texture. The main difference with the previous function is that it renders
        // to an offscreen texture.
        const render = () => {
            // Renders to the texture.
            this.resizeToTexture(inputTexture, outputTexture);

            // Free up input and output resources.
            outputTexture.dispose(true);
            inputTexture.dispose();
        }

        const checkIsReady = (() => {
            if (inputTexture.isReady()) {
                this.engine.stopRenderLoop(checkIsReady);
                render();
            }
        }).bind(this);

        this.engine.runRenderLoop(checkIsReady);

        return outputTexture;
    }

    private _render(inputTexture: ThinTexture): void {
        this._effectRenderer.applyEffectWrapper(this._effectWrapper);
        this._effectWrapper.effect.setTexture("toResize", inputTexture);
        this._effectRenderer.draw();
    }

    private _initializeRenderer(): void {
        // Use the smallest module to render a quad on screen (no need for a full scene)
        this._effectRenderer = new EffectRenderer(this.engine);

        // Wraps a shader in a structure known to the Effect Renderer.
        this._effectWrapper = new EffectWrapper({
            engine: this.engine,
            ...ShaderConfiguration
        });

        // Initializes the viewport to the full canvas size.
        this._effectRenderer.setViewport();
    }
}