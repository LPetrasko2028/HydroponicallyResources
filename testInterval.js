function delayFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    // console.log('Starting interval test');
    // const interval = setInterval(async () => {
    //     await delayFor(5000);
    //     console.log('log after delay');
    //     clearInterval(interval);
    // }, 500);
    // await delayFor(10000);
    // clearInterval(interval);

    console.log('Start function parameter test');
    let timeout = false;
    setTimeout(() => {
        timeout = true;
    }, 5000);
    async function loop() {
        while (!timeout) {
            console.log('log');
            // await delayFor(1000);
            await delayFor(1000);
        }
    }
    loop();


    process.on('SIGINT', () => {
        clearInterval(interval);
        process.exit();
    });
}

main();