import { Timeline } from "../../../src/timeline";

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

    const timeline = new Timeline(timelineCanvas, {
        totalDuration: 60,
        thumbnailWidth: 128,
        thumbnailHeight: 120,
        loadingTextureURI: "/assets/timeline/loading.png",
        getThumbnailCallback: (time: number) => {
            const hiddenVideo = document.createElement("video");
            hiddenVideo.src = "/assets/timeline/test.mp4";

            hiddenVideo.setAttribute("muted", "true");
            hiddenVideo.setAttribute("autoplay", "true");
            hiddenVideo.setAttribute("playsinline", "");
            hiddenVideo.muted = true;
            hiddenVideo.autoplay = true;

            hiddenVideo.currentTime = time;
            return hiddenVideo;

            //return "/assets/loading.png";
        }
    });

    setTimes(timeline);

    timeline.runRenderLoop(() => {
        if (!mainVideo.paused) {
            timeline.setCurrentTime(mainVideo.currentTime);
        }
    });

    sliderTime.addEventListener("input", function() {
        var value = parseFloat(this.value);
        timeline.setCurrentTime(value);
        setTimes(timeline);
    });
    
    sliderZoom.addEventListener("input", function() {
        var value = parseFloat(this.value) / 10;
        timeline.setVisibleDurationZoom(value);
        setTimes(timeline);

        sliderTime.value = 0;
    });
}

main();