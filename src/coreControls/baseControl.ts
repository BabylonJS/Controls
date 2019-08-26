import { Engine } from "@babylonjs/core/Engines/engine";

/**
 * Represents a the base class of any Babylon.js controls.
 * It helps ensuring they can all be initialized the same way and share
 * one Babylon.js instance if wished.
 */
export abstract class BaseControl {
    private readonly _canvas: HTMLCanvasElement;
    private readonly _engine: Engine;

    /**
     * Gets the current Babylon.js engine used by the control.
     */
    public get engine(): Engine {
        return this._engine;
    }

    /**
     * Gets the current Babylon.js engine used by the control.
     */
    public get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    /**
     * Instantiates a baseControl babylon.js object.
     * @param parent defines the parent of the control. It could be either:
     *   - A canvas element: the canvas we want to render the control in.
     *   - An engine instance: the Babylon.js engine to use to render the control.
     *   - Another Babylon.js control: this allows sharing the engine cross controls to mix and match them for instance.
     */
    constructor(parent: BaseControl | Engine | HTMLCanvasElement) {
        if (parent instanceof HTMLCanvasElement) {
            this._canvas = parent;
            this._engine = new Engine(this._canvas, false);
        }
        else if (parent instanceof Engine) {
            this._canvas = parent.getRenderingCanvas();
            this._engine = parent;
        }
        else {
            this._canvas = parent.canvas;
            this._engine = parent.engine;
        }
        // Parallel Shader Compile turned off at the moment.
        this._engine.getCaps().parallelShaderCompile = null;
    }

    /**
     * Dispose all the associated resources with WebGL.
     */
    public dispose(): void {
        // Clear the renderer resources.
        this.engine.dispose();
    }
}