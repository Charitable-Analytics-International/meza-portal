'use strict';

// import scheduler
import cron from 'node-cron';

// import config
import config from './configs.js';

// import dependency injector
import serviceLocator from '../config/dependency_injector.js';

// import decoder
import { run } from './main.js';

// config
const FREQUENCY = config.FREQUENCY;

// process var
let taskRunning = false;


// wrapper for decoder run
async function _run(){

    // update task running status
    taskRunning = true;

    await run(serviceLocator);

    // update task running status
    taskRunning = false;
}


// init cron job
export const task = cron.schedule(FREQUENCY, () => {
    
    // if job is currently running, wait for next cycle
    if(taskRunning){
        return;
    }

    // run a cycle
    _run();

},{
    scheduled: false
});
