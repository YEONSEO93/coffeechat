async function startLoadTest() {
    console.log('Starting load test...');
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
        const promises = [];
        for (let i = 0; i < concurrency; i++) {
            promises.push(sendRequest());
        }

        await Promise.all(promises);
    }

    console.log('Load test completed.');
}
