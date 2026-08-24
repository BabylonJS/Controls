const fs = require('fs');
const { exec } = require('child_process');

function parseVersion(version) {
    const normalizedVersion = version.trim();
    const match = normalizedVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);
    if (!match) {
        throw new Error(`Invalid version: ${version}`);
    }

    return {
        raw: normalizedVersion,
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4]
    };
}

function getNextVersion(npmVersion, packageVersion) {
    const npm = parseVersion(npmVersion);
    const currentPackage = parseVersion(packageVersion);

    if (npm.major !== currentPackage.major || npm.minor !== currentPackage.minor) {
        return currentPackage.raw;
    }

    if (npm.prerelease) {
        const identifiers = npm.prerelease.split(".");
        const lastIdentifierIndex = identifiers.length - 1;
        const lastIdentifier = identifiers[lastIdentifierIndex];

        if (!/^\d+$/.test(lastIdentifier)) {
            throw new Error(`Cannot increment prerelease version: ${npm.raw}`);
        }

        identifiers[lastIdentifierIndex] = String(Number(lastIdentifier) + 1);
        return `${npm.major}.${npm.minor}.${npm.patch}-${identifiers.join(".")}`;
    }

    return `${npm.major}.${npm.minor}.${npm.patch + 1}`;
}

function versionUp() {
    exec("npm view @babylonjs/controls dist-tags.preview", (err, stdout) => {
        if (err) {
            console.error(err);
            throw err;
        }

        const npmVersion = stdout.trim();
        console.log("Current NPM Registry Version:", npmVersion);

        const packageText = fs.readFileSync("package.json");
        const packageJSON = JSON.parse(packageText);
        console.log("Current package.json Version:", packageJSON.version);

        const newVersion = getNextVersion(npmVersion, packageJSON.version);

        console.log("New Requested Version:", newVersion);

        packageJSON.version = newVersion;
        fs.writeFileSync("package.json", JSON.stringify(packageJSON, null, 4));
    });
}

if (require.main === module) {
    versionUp();
}

module.exports = { getNextVersion };
