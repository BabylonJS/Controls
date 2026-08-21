const fs = require('fs');
const { exec } = require('child_process');

function parseVersion(version) {
    const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
    if (!match) {
        throw new Error(`Invalid version: ${version}`);
    }

    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3])
    };
}

function getNextVersion(npmVersion, packageVersion) {
    const npm = parseVersion(npmVersion);
    const currentPackage = parseVersion(packageVersion);

    if (npm.major !== currentPackage.major || npm.minor !== currentPackage.minor) {
        return packageVersion;
    }

    return `${npm.major}.${npm.minor}.${npm.patch + 1}`;
}

function versionUp() {
    exec("npm view @babylonjs/controls dist-tags.preview", (err, stdout) => {
        if (err) {
            console.error(err);
            throw err;
        }

        console.log("Current NPM Registry Version:", stdout);

        const packageText = fs.readFileSync("package.json");
        const packageJSON = JSON.parse(packageText);
        const newVersion = getNextVersion(stdout, packageJSON.version);

        console.log("New Requested Version:", newVersion);

        packageJSON.version = newVersion;
        fs.writeFileSync("package.json", JSON.stringify(packageJSON, null, 4));
    });
}

if (require.main === module) {
    versionUp();
}

module.exports = { getNextVersion };
