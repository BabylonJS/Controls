const assert = require("assert");
const { getNextVersion } = require("./versionUp");

const cases = [
    {
        npmVersion: "2.2.0\n",
        packageVersion: "2.2.0",
        expected: "2.2.1"
    },
    {
        npmVersion: "2.2.0-alpha.6\n",
        packageVersion: "2.2.0",
        expected: "2.2.0-alpha.7"
    },
    {
        npmVersion: "2.0.0-alpha.6\n",
        packageVersion: "2.0.0",
        expected: "2.0.0-alpha.7"
    },
    {
        npmVersion: "2.2.3\n",
        packageVersion: "2.2.0",
        expected: "2.2.0"
    },
    {
        npmVersion: "2.0.0-alpha.6\n",
        packageVersion: "2.2.0",
        expected: "2.2.0"
    },
    {
        npmVersion: "1.2.10\n",
        packageVersion: "2.2.0",
        expected: "2.2.0"
    }
];

for (const testCase of cases) {
    assert.strictEqual(
        getNextVersion(testCase.npmVersion, testCase.packageVersion),
        testCase.expected
    );
}

console.log("versionUp tests passed");
