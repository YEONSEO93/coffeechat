// Configuration for Load Test
const endpoint = "http://n11725605-autoscale-assignment3-2133643054.ap-southeast-2.elb.amazonaws.com:8080/process-gif";
const numberOfRequests = 5000; // Total number of requests to send
const batchSize = 50; // Requests per batch to sustain load
const batchInterval = 500; // Time (ms) between each batch

// Tracking Variables
let totalTime = 0;
let resolvedRequests = 0;
let failedRequests = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to Simulate a Request for GIF Processing
async function makeGifRequest(requestNumber) {
    const startTime = performance.now();
    console.log(`Request ${requestNumber} started.`);

    try {
        // Sending a POST request to trigger GIF processing on the server
        const res = await fetch(endpoint, { 
            method: "POST", 
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                images: ["image1.jpg", "image2.jpg", "image3.jpg"] // Example images for GIF creation
            })
        });

        if (!res.ok) {
            console.error(`Request ${requestNumber} failed with status: ${res.status}`);
            failedRequests++;
            return;
        }

        // Measure response time and log it
        const responseTime = performance.now() - startTime;
        resolvedRequests++;
        totalTime += responseTime;

        // Log average response time every 10 requests to avoid console clutter
        if (requestNumber % 10 === 0) {
            const avgResponseTime = (totalTime / resolvedRequests).toFixed(2);
            console.log(`Request ${requestNumber} completed in ${responseTime.toFixed(2)}ms, rolling average ${avgResponseTime}ms over ${resolvedRequests} requests.`);
        }
    } catch (error) {
        console.error(`Request ${requestNumber} encountered an error: ${error.message}`);
        failedRequests++;
    }
}

// Main Load Test Function
async function loadTest() {
    for (let batch = 0; batch < Math.ceil(numberOfRequests / batchSize); batch++) {
        const batchPromises = [];

        for (let i = 0; i < batchSize; i++) {
            const requestNumber = batch * batchSize + i;
            batchPromises.push(makeGifRequest(requestNumber));
        }

        // Execute all requests in the current batch in parallel
        await Promise.all(batchPromises);

        // Wait before sending the next batch
        await sleep(batchInterval);
    }

    console.log(`Load test complete. ${resolvedRequests} successful requests, ${failedRequests} failed requests.`);
    console.log(`Average response time: ${(totalTime / resolvedRequests).toFixed(2)} ms`);
}

// Run the Load Test
loadTest();
