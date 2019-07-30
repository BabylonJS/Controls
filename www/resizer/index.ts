import { Resizer } from "../../src/resizer";

const beforePicture = document.getElementById("beforePicture") as HTMLImageElement;
const afterPicture1 = document.getElementById("afterPicture1") as HTMLCanvasElement;
const afterPicture2 = document.getElementById("afterPicture2") as HTMLCanvasElement;
const afterPicture3 = document.getElementById("afterPicture3") as HTMLCanvasElement;
const afterPicture4 = document.getElementById("afterPicture4") as HTMLCanvasElement;
const startResizingButton = document.getElementById("startResizingButton");

const imageToResize = "../assets/logo.png";

function main() {
    beforePicture.src = imageToResize;

    const resizer1 = new Resizer(afterPicture1);
    const resizer2 = new Resizer(afterPicture2);
    const resizer3 = new Resizer(afterPicture3);
    const resizer4 = new Resizer(afterPicture4);

    startResizingButton.addEventListener("click", function() {
        resizer1.resize(imageToResize);
        resizer2.resize(imageToResize);
        resizer3.resize(imageToResize);
        resizer4.resize(imageToResize);
    });
}

main();