const fs = require('fs');
const { exec } = require('child_process');

exec("npm view @babylonjs/controls dist-tags.preview", (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }

    console.log("Current NPM Registry Version:", stdout);

    const version = stdout;
    const spl = version.split(".");
    spl[spl.length - 1]++;
    const newVersion = spl.join(".");

    console.log("New Requested Version:", newVersion);

    const packageText = fs.readFileSync("package.json");

    const packageJSON = JSON.parse(packageText);
    packageJSON.version = newVersion;

    fs.writeFileSync("package.json", JSON.stringify(packageJSON, null, 4));
});
