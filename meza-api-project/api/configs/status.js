'use strict';

import { status_refresh, status_select } from '../../../meza-libraries/sql/status.js';

class Status {

    constructor(log, postgres){
        this.log = log
        this.postgres = postgres
    }

    async refresh(){

        // get query
        const query = status_refresh();

        // run query
        try{
            await this.postgres.query(query)
        }catch(e){
            console.log(e);
            this.log.error('could not update status of projects');
            return false;
        }

        return true;
    }

    async get(){

        // get query
        const query = status_select();

        // run query
        let results = null, _ = null;
        try{
            [results, _] = await this.postgres.query(query)
        }catch(e){
            console.log(e);
            this.log.error('could not read status from projects');
        }

        // validate
        if (results === null || !Array.isArray(results) || results.length !== 1){
            return null;
        }

        // grab
        const { status } = results[0];
        if (status === undefined || status === null) {
            return null
        }

        return status;
    }
}

export default Status;