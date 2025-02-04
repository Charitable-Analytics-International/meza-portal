'use strict';

// import image processing pipeline
import { task as task_initiator } from './1-meza-initiator/server.js';
import { task as task_contour } from './2-meza-contour/server.js';

// start tasks
task_initiator.start();
task_contour.start();
