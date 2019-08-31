import { Resizer } from "../../src/resizer";
import { HtmlElementTexture } from "@babylonjs/core/Materials/Textures/htmlElementTexture";
import { Constants } from "@babylonjs/core/Engines/constants";

const thumbnailsCanvas = document.getElementById("thumbnailsCanvas") as HTMLCanvasElement;

const startButton = document.getElementById("startButton");

// Generate thumbnails from a video element inside a VideoJS control
// This works even on Safari \o/
function generateThumbnails(ampVideo: HTMLVideoElement) {
    // Create a resizer control wrapping our destination canvas.
    const resizer = new Resizer(thumbnailsCanvas);

    const seek = (time) => {
        // Stop at 2 minutes.
        if (time > 120) {
            return;
        }

        // Else seek
        ampVideo.currentTime = time;
    }

    ampVideo.addEventListener("seeked", () => {
        // You think it is ready, but we were having black frames on Safari...
        // This did the trick.
        setTimeout(async () => {
            // Render the thumbnail.
            await resizer.resize(ampVideo);

            // You could here manipulate the thumbnailsCanvas to extract and deal with the thumbnails.

            // Seek to the next thumbnail.
            seek(ampVideo.currentTime + 1);
        }, 60);
    })

    // Start seeking on click
    startButton.addEventListener("click", function() {
        // Seeking to 0 is know to have issue on some browsers
        // So stick with 0.01 instead
        seek(0.01);
    });
}

// Generate thumbnails from a video element inside a VideoJS control
// This works even on Safari \o/
//
// This is a bit more complex but reduces the overall memory usage by reusing the 
// Same VideoTexture.
function generateThumbnailsOptim(ampVideo: HTMLVideoElement) {
    // Create a resizer control wrapping our destination canvas.
    const resizer = new Resizer(thumbnailsCanvas);
    const generateMipMaps = resizer.engine.webGLVersion > 1;
    const textureFiltering = generateMipMaps ? Constants.TEXTURE_TRILINEAR_SAMPLINGMODE : Constants.TEXTURE_BILINEAR_SAMPLINGMODE;
    const videoTexture = new HtmlElementTexture("vid", ampVideo, {
        engine: resizer.engine,
        generateMipMaps: generateMipMaps,
        samplingMode: textureFiltering,
        scene: null
    });

    const seek = (time) => {
        // Stop at 2 minutes.
        if (time > 120) {
            return;
        }

        // Else seek
        ampVideo.currentTime = time;
    }

    ampVideo.addEventListener("seeked", () => {
        // You think it is ready, but we were having black frames on Safari...
        // This did the trick.
        setTimeout(async () => {
            // As we are using a texture, manually update to the current video frame.
            videoTexture.update(true);

            // Render the thumbnail.
            await resizer.resize(videoTexture);

            // You could here manipulate the thumbnailsCanvas to extract and deal with the thumbnails.

            // Seek to the next thumbnail.
            seek(ampVideo.currentTime + 1);
        }, 60);
    })

    // Start seeking on click
    startButton.addEventListener("click", function() {
        // Seeking to 0 is know to have issue on some browsers
        // So stick with 0.01 instead
        seek(0.01);
    });
}

// I know, I know... ;-) but not the point of this demo.
declare const amp: any;

function main() {
    const myPlayer = amp('beforePicture', {
        "nativeControlsForTouch": false,
        autoplay: false,
        controls: true,
        width: "512",
        height: "512",
        poster: "",
        techOrder: ["azureHtml5JS", "html5"],
    }, function() {
        console.log('Ready to generate !');

        const ampVideo = document.querySelector("video");
        generateThumbnails(ampVideo);
        generateThumbnailsOptim(ampVideo);
    });

    myPlayer.src([{
        src: "//willzhanmswest.streaming.mediaservices.windows.net/1f2dd2dd-ee99-40be-aae9-d0c2209982eb/DroneFlightOverLasVegasStripH3Pro7.ism/Manifest",
        type: "application/vnd.ms-sstr+xml"
    }]);
}

main();