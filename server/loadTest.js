const endpoint = "http://n11725605-autoscale-assignment3-2133643054.ap-southeast-2.elb.amazonaws.com";
const numberOfRequests = 20;   // Initial number of requests
const timeBetweenRequests = 500;  // Time in ms between requests
let totalTime = 0;
let resolvedRequests = 0;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRequest(requestNumber) {
    return new Promise((res) => {
        console.log(`Request ${requestNumber} started.`);
        const startTime = performance.now();
        fetch(endpoint, { method: "GET" }).then((res) => {
            if (!res.ok) {
                console.error(`Request ${requestNumber} failed with status: ${res.status}`);
                return;
            }

            const responseTime = performance.now() - startTime;
            resolvedRequests += 1;
            totalTime += responseTime;
            const averageResponseTime = totalTime / resolvedRequests;
            console.log(`Request ${requestNumber} completed in ${responseTime.toFixed(2)}ms, rolling average ${averageResponseTime.toFixed(2)}ms over ${resolvedRequests} requests.`);
        });
    });
}

async function loadTest() {
    for (let i = 0; i < numberOfRequests; i++) {
        makeRequest(i);
        await sleep(timeBetweenRequests);
    }
}

loadTest();
