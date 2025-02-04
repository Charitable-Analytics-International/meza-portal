'use strict'

// uuid generator
import { generate_sid } from '../gen/sid.js';

export function status_refresh(){

    // generate new status
    const new_status = generate_sid();

    // build query
    const query = `
        UPDATE
            project
        SET 
            status = '${new_status}'
    `;

    return query;
}

export function status_select(){

    const query = `
        SELECT
            status
        FROM
            project
        LIMIT
            1
    `;

    return query;
}

