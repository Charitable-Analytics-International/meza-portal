'use strict';

// import image processing pipeline
import { task as task_initiator } from './1-meza-initiator/server.js';

// start tasks
task_initiator.start();
