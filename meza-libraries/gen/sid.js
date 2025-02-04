'use strict';

// import uuid lib
import { v4 as uuidv4 } from 'uuid';

export function generate_sid(){
    return uuidv4();
}
