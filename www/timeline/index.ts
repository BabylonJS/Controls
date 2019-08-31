import { Timeline } from "../../src/timeline";
import { Resizer } from "../../src/resizer";

const mainVideo = document.getElementById("mainVideo") as HTMLVideoElement;
const timelineCanvas = document.getElementById("timelineCanvas") as HTMLCanvasElement;
const startTimeElement = document.getElementById("startTime");
const endTimeElement = document.getElementById("endTime");
const sliderTime = document.getElementById("sliderTime") as any;
const sliderZoom = document.getElementById("sliderZoom") as any;

const getTimeString = function(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time) % 60;
    return `${("0" + minutes).slice(-2)}:${("0" + seconds).slice(-2)}`
}

const setTimes = function(timeline) {
    startTimeElement.innerText = getTimeString(timeline.currentTime);
    endTimeElement.innerText = getTimeString(timeline.currentTime + timeline.visibleDuration);

    sliderTime.min = 0;
    sliderTime.max = Math.ceil(timeline.maxSettableTime);
}

const initSliders = function() {
    sliderTime.value = 0;
    sliderTime.steps = "any";

    sliderZoom.min = 0;
    sliderZoom.max = 1000;
    sliderZoom.value = 0;
    sliderZoom.steps = "any";
}

function main() {
    initSliders();

    const resizer = new Resizer(timelineCanvas);
    const timeline = new Timeline(resizer, {
        totalDuration: 60,
        thumbnailWidth: 128,
        thumbnailHeight: 120,
        loadingTextureURI: "./assets/loading.png",
        getThumbnailCallback: (time: number, done: (element: any) => void) => {
            // This is strictly for demo purpose and should not be used in prod as it creates as many videos
            // as there are thumbnails all over the timeline.
            const hiddenVideo = document.createElement("video");
            document.body.append(hiddenVideo);
            hiddenVideo.style.display = "none";

            hiddenVideo.setAttribute("playsinline", "");
            hiddenVideo.muted = true;
            hiddenVideo.autoplay = navigator.userAgent.indexOf("Edge") > 0 ? false : true;
            hiddenVideo.loop = false;

            hiddenVideo.onloadeddata = () => {
                if (time === 0) {
                    done(resizer.getResizedTexture(hiddenVideo, { width: 128, height: 100 }));
                }
                else {
                    hiddenVideo.onseeked = () => {
                        done(resizer.getResizedTexture(hiddenVideo, { width: 128, height: 100 }));
                    }
                    hiddenVideo.currentTime = time;
                }
            }

            hiddenVideo.src = "./assets/test.mp4?" + time;
            hiddenVideo.load();

            // done(hiddenVideo);

            // done("./assets/loading.png");
        }
    });

    setTimes(timeline);

    timeline.runRenderLoop(() => {
        if (!mainVideo.paused) {
            timeline.setCurrentTime(mainVideo.currentTime);
        }
    });

    sliderTime.addEventListener("input", function() {
        if (!mainVideo.paused) {
            mainVideo.pause();
        }
        var value = parseFloat(this.value);
        timeline.setCurrentTime(value);
        setTimes(timeline);
    });
    
    sliderZoom.addEventListener("input", function() {
        if (!mainVideo.paused) {
            mainVideo.pause();
        }
        var value = parseFloat(this.value) / 10;
        timeline.setVisibleDurationZoom(value);
        setTimes(timeline);

        sliderTime.value = 0;
    });
}

main();