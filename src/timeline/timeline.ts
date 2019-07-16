import { Engine } from "@babylonjs/core/Engines/engine";
import { EffectWrapper, EffectRenderer } from "@babylonjs/core/Materials/effectRenderer";

import { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { HtmlElementTexture } from "@babylonjs/core/Materials/Textures/htmlElementTexture";

import { Constants } from "@babylonjs/core/Engines/constants";

import { Logger } from "@babylonjs/core/Misc/logger";
import { Scalar } from "@babylonjs/core/Maths/math.scalar";

import { ShaderConfiguration } from "./shader";

/**
 * Defines a set of options provided to the timeline.
 */
export interface ITimelineOptions {
    /**
     * Defines the total length of the video. This helps computing where we are in the video.
     */
    totalDuration: number;
    /**
     * The width of the thumbnails.
     */
    thumbnailWidth: number;
    /**
     * The height of the thumbnails.
     */
    thumbnailHeight: number;
    /**
     * Defines the URI of loding texture used to replace thumbnail during loading.
     */
    loadingTextureURI: string;
    /**
     * Callback to implement to provide back the required picture info.
     * 
     * This will be regularly called for each needed thumbnail by specifying the time
     * of the required picture. It can return either a video, a canvas or a url.
     */
    getThumbnailCallback: (time: number) => HTMLCanvasElement | HTMLVideoElement | string;
}

/**
 * Represents a timeline: a list of thumbnails for a video.
 * The thumbnails are evenly distributed along the visible duration from the video
 * The smallest granularity is the second to ensure that 128 width thumbnails would fit
 * in memory for a 1 hour long video.
 * 
 * Thumbnail generation is out of scope of the control. They are the responsibility of the client code
 * which can dynamically generate or pre generate them on a server.
 */
export class Timeline {
    private readonly _options: ITimelineOptions;
    private readonly _canvas: HTMLCanvasElement;
    private readonly _engine: Engine;

    private _effectRenderer: EffectRenderer;
    private _effectWrapper: EffectWrapper;
    private _loadingThumbnail: Texture;
    private _thumbnails: { [timespan: number]: BaseTexture };

    private _totalThumbnails: number;
    private _visibleThumbnails: number;

    private _totalDuration: number;
    private _visibleDuration: number;
    private _currentTime: number;
    private _intervalDuration: number;

    private _widthScale: number;
    private _heightScale: number;
    private _heightOffset: number;

    private _shouldRender: boolean;

    /**
     * Gets the total duration of the video the canvas has been configured to 
     * represent.
     */
    public get totalDuration(): number {
        return this._totalDuration;
    }

    /**
     * Gets the visible duration the timeline canvas can display without scrolling.
     * It depends on the total number of thumbnails configured.
     */
    public get visibleDuration(): number {
        return this._visibleDuration;
    }

    /**
     * Gets the max value that can be set as currentTime.
     */
    public get maxSettableTime(): number {
        return this._totalDuration - this._visibleDuration;
    }

    /**
     * Gets the current start time of the visible part of the timeline.
     */
    public get currentTime(): number {
        return this._currentTime;
    }

    /**
     * Gets the current end time of the visible part of the timeline.
     */
    public get endVisibleTime(): number {
        return this._currentTime + this._visibleDuration;
    }

    /**
     * Gets the current duration of the interval between two consecutive thumbnails.
     */
    public get intervalDuration(): number {
        return this._intervalDuration;
    }

    /**
     * Gets the total number of thumbnails the timeline has been set to display.
     * It depends mainly of the zoom level and the size of the canvas + desired thumbnail one.
     */
    public get totalThumbnails(): number {
        return this._totalThumbnails;
    }

    /**
     * Gets the number of thumbnails visible in the canvas without scrolling.
     * This is the ideal number when the start time is exactly equivalent to the 
     * start of a thumbnail.
     */
    public get visibleThumbnails(): number {
        return this._visibleThumbnails;
    }

    /**
     * Instantiates a timeline object able to display efficiently a video timeline.
     * @param canvas defines the canvas the timeline should be drawn in.
     * @param options defines the set of options used by the timeline control.
     */
    constructor(canvas: HTMLCanvasElement, options: ITimelineOptions) {
        this._options = options;
        this._canvas = canvas;
        this._engine = new Engine(this._canvas, false);

        // Initializes all our
        this._initializeDurations();
        this._initializeTextures();
        this._initializeRenderer();
    }

    /**
     * Starts rendering the timeline in the canvas.
     * @param callback defines an optional callback that would be run during the RAF.
     */
    public runRenderLoop(callback?: () => void): void {
        this._shouldRender = true;

        this._engine.runRenderLoop(() => {
            this.render(callback);
        });
    }

    /**
     * Stops rendering the timeline in the canvas.
     */
    public stopRenderLoop(): void {
        this._engine.stopRenderLoop();
    }

    /**
     * Renders the current state of the timeline to the canvas.
     * @param callback defines an optional callback that would be run during the RAF.
     */
    public render(callback?: () => void): void {
        callback && callback();

        // Prevents useless use of GPU improving efficiency.
        if (!this._shouldRender) {
            return;
        }

        // Only renders once the loading texture is ready.
        if (!this._loadingThumbnail.isReady()) {
            return;
        }

        // And the shader has been compiled.
        if (!this._effectWrapper.effect.isReady()) {
            return;
        }

        // Prevents rendering again if nothing happens.
        this._shouldRender = false;

        // Set the current shader for rendering.
        this._effectRenderer.applyEffectWrapper(this._effectWrapper);

        // Computes which thumbnail should be drawn first on screen.
        const thumbnailIndex = this._currentTime / this._intervalDuration;
        const startTime = Math.floor(thumbnailIndex) * this._intervalDuration;

        // Renders all the visible thumbnails in the timeline.
        for (let i = 0; i < this._visibleThumbnails + 1; i++) {
            const time = startTime + this._intervalDuration * i;

            // Set the texture corresponding to the current time.
            const texture = this._getTexture(Math.floor(time));
            this._effectWrapper.effect.setTexture("thumbnail", texture);

            // Computes the horizontal offset of the thumbnail dynamically by respecting
            // The shader optim defined at the top of the file: 
            // shaderOffset = offset * 2. - 1.;
            const widthOffset = (time - this._currentTime) / this._visibleDuration * 2 - 1;
            this._effectWrapper.effect.setFloat2("offset", widthOffset, this._heightOffset);
            this._effectWrapper.effect.setFloat2("scale", this._widthScale, this._heightScale);

            // Draws the current thumbnail in the canvas as a quad.
            this._effectRenderer.draw();
        }
    }

    /**
     * Sets the current time to display the timeline from.
     * @param time defines the desired time to start from.
     * @returns the clamped current time computed to ensure it fits in the available time range.
     */
    public setCurrentTime(time: number): void {
        // We need to ensure the time respects some boundaries the start of the video
        // and the max settable time to not display empty space on the right.
        this._currentTime = Scalar.Clamp(time, 0, this.maxSettableTime);
        // Re render on next RAF.
        this._shouldRender = true;
    }

    /**
     * Sets the amount of thumbnails the timeline should contain. It is all of them including the invisible ones due to scrolling.
     * Be carefull, the current time might be impacted to ensure it always starts
     * at the beginning of the displayed thumbnails list.
     * @param totalThumbnails defines the desired number of thumbnails desired.
     * @returns the clamped total thumbnails computed to ensure it fits in the available time range.
     */
    public setTotalThumbnails(totalThumbnails: number): number {
        // We need a round number to not see half a thumbnail on the latest one.
        this._totalThumbnails = Math.floor(totalThumbnails);
        // We also need to ensure it respects some boundaries regarding the min number of thumbnail and the max (equal to the total duration).
        this._totalThumbnails = Scalar.Clamp(this._totalThumbnails, this._visibleThumbnails, this._totalDuration);

        // We can now compute back the interval of time between thumbnails and the total visible time
        // on screen without scrolling.
        this._intervalDuration = this._totalDuration / this._totalThumbnails;
        this._visibleDuration = this._intervalDuration * this._visibleThumbnails;

        // Ensures the current time is within the new defined boundaries.
        this.setCurrentTime(this._currentTime);

        return this._totalThumbnails;
    }

    /**
     * Sets the amount of time we should see in the timeline as a zoom level in percentage.
     * Be carefull, the current time might be impacted to ensure it always starts
     * at the beginning of the displayed thumbnails list.
     * @param percent defines the desired level of zoom 0% means the entire video is visible without scrolling and 100% the smallest granularity.
     * @returns the clamped total thumbnails computed to ensure it fits in the available time range.
     */
    public setVisibleDurationZoom(percent: number): number {
        // Interpolate the number of thumbnails between the min number and the max
        // based on the given percentage.
        let totalThumbnail = this._visibleThumbnails + (this._totalDuration - this._visibleThumbnails) * percent / 100;
        return this.setTotalThumbnails(totalThumbnail);
    }

    /**
     * Resizes the timeline to adapt to the new canvas size.
     * The canvas has to be resized before hand.
     * Be carefull, the current time and visible duration might be impacted to ensure it always starts
     * at the beginning of the displayed thumbnails list.
     */
    public resize(): void {
        // Updates engine sizes.
        this._engine.resize();
        // Resets the viewport to the new canvas size.
        this._effectRenderer.setViewport();
        // Initializes the rest of the durations impacted by the canvas size.
        this._initializeCanvasRelativeDurations();
    }

    /**
     * Dispose all the associated resources with WebGL.
     */
    public dispose(): void {
        // Clear Thumbnails.
        for (let thumbnailIndex in this._thumbnails) {
            if (this._thumbnails.hasOwnProperty(thumbnailIndex)) {
                this._thumbnails[thumbnailIndex].dispose();
            }
        }

        // Clear the renderer resources.
        this._loadingThumbnail.dispose();
        this._effectWrapper.dispose();
        this._effectRenderer.dispose();
        this._engine.dispose();
    }

    private _initializeDurations(): void {
        // Start at 0.
        this._currentTime = 0;

        // Ensures the provided total duration is meaningful.
        this._totalDuration = Math.max(0, this._options.totalDuration);
        if (this._totalDuration === 0) {
            Logger.Error("The total duration can not be 0. Nothing would be displayed.");
            return;
        }

        // Initializes the rest of the durations.
        this._initializeCanvasRelativeDurations();
    }

    private _initializeCanvasRelativeDurations(): void {
        // Compute the max number of thumbnails we can see in the canvas without scrolling.
        // It needs to be an integer for "UX purpose".
        this._visibleThumbnails = Math.ceil(this._canvas.clientWidth / this._options.thumbnailWidth);

        // Compute the scale to apply in the shader for each quads to ensure the
        // number of thumbnails fit in the canvas.
        // Due to shader optim detailled around the vertex shader code, 
        // shaderScale = scale * 2.;
        this._widthScale = 1 / this._visibleThumbnails * 2;

        // Compute the height scale to apply on a thumbnail in the shader
        // in order to respect the provided sizes.
        const ratio = this._options.thumbnailHeight / this._options.thumbnailWidth;
        const effectiveWidth = this._canvas.width / this._visibleThumbnails;
        const effectiveHeight = effectiveWidth * ratio;
        // Due to shader optim detailled around the vertex shader code, 
        // shaderScale = scale * 2.;
        this._heightScale = effectiveHeight / this._canvas.height * 2;

        // Compute a small offset for the height to center the thumbnail in the canvas
        // vertically.
        // The computation should be: (canvasH - effectiveH) / canvasH / 2
        // But due to shader optim detailled around the vertex shader code, 
        // shaderOffset = offset * 2. - 1.;
        // shaderOffset = (canvasH - effectiveH) / canvasH - 1
        this._heightOffset = (this._canvas.height - effectiveHeight) / this._canvas.height - 1;

        // Reinitializes the total number of thumbnails as it might be impacted
        // during a resize.
        this.setTotalThumbnails(this._totalThumbnails || this._visibleThumbnails);
    }

    private _initializeTextures(): void {
        // Prepares the loading thumbnail.
        this._loadingThumbnail = new Texture(this._options.loadingTextureURI, this._engine, true, true, Constants.TEXTURE_NEAREST_NEAREST);
        // And the thumbnails cache.
        this._thumbnails = { };
    }

    private _initializeRenderer(): void {
        // Use the smallest module to render a quad on screen (no need for a full scene)
        this._effectRenderer = new EffectRenderer(this._engine, {
            positions: [1, 1, 0, 1, 0, 0, 1, 0],
            indices: [0, 1, 2, 0, 2, 3]
        });

        // Wraps a shader in a structure known to the Effect Renderer.
        this._effectWrapper = new EffectWrapper({
            engine: this._engine,
            ...ShaderConfiguration
        });

        // Initializes the viewport to the full canvas size.
        this._effectRenderer.setViewport();
    }

    private _getTexture(time: number): BaseTexture {
        // Only gets rounded time close to the granularity.
        time = Math.floor(time);

        // Try grabbing the thumbnail from the cache.
        let thumbnail = this._thumbnails[time];
        if (!thumbnail) {
            // If not creates it from the given callback.
            const textureData = this._options.getThumbnailCallback(time);

            // In case of string, load the texture from a URI.
            if (typeof(textureData) === "string") {
                thumbnail = new Texture(textureData, this._engine, true, true, Constants.TEXTURE_NEAREST_NEAREST);
            }
            else {
                // Else loads the provided video or canvas element.
                const htmlElementTexture = new HtmlElementTexture("" + time, textureData, {
                    engine: this._engine,
                    generateMipMaps: false,
                    samplingMode: Constants.TEXTURE_NEAREST_NEAREST,
                    scene: null
                });
                thumbnail = htmlElementTexture;

                const onload = () => {
                    htmlElementTexture.update(false);
                    htmlElementTexture.element = null;
                };

                if (textureData instanceof HTMLVideoElement) {
                    // Seek to 0 does not raise by default.
                    // Use loadedData instead
                    const eventName = time == 0 ? "loadeddata" : "seeked";
                    textureData.addEventListener(eventName, () => { onload(); });
                }
                else {
                    // Canvas element are considered already ready to be uploaded to GPU.
                    onload();
                }
            }

            // Sets common texture parameters.
            thumbnail.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
            thumbnail.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;

            // Store in cache.
            this._thumbnails[time] = thumbnail;
        }

        // Returns the thumbnail texture only if ready.
        if (thumbnail.isReady()) {
            return thumbnail;
        }

        // Else return the loading picture to not block the UI.
        // Render till ready to replace the loading textures by the loaded ones.
        this._shouldRender = true;

        return this._loadingThumbnail;
    }
}