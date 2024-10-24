'use strict'

// middleware lib
import validator from '../../../meza-libraries/middlewares/validator.js';

// datatype lib
import { isArray, isNumber, isStringNonEmpty } from '../../../meza-libraries/gen/datatype.js';

// dbhelper lib
import { return_processed_image_definition } from '../../../meza-libraries/sql/dbhelper.js';

// schemas
import by_image from '../validations/cell/by_image.js';
import by_rect from '../validations/cell/by_rect.js';
import by_rects from '../validations/cell/by_rects.js';
import by_search from '../validations/cell/by_search.js';
import by_cells from '../validations/cell/by_cells.js';

const attributes_full = [
    'image_id',
    'rect_id',
    'data_type',
    'opts',
    'value',
    'tl_x',
    'tl_y',
    'tr_x',
    'tr_y',
    'br_x',
    'br_y',
    'bl_x',
    'bl_y',
];

const attributes_basic = [
    'image_id',
    'rect_id',
    'data_type',
    'opts',
    'value'
];


function register(server, serviceLocator) {

    async function read(image_id, rect_id){

        // Grab database
        const database = serviceLocator.get('database')

        // grab logger
        const logger = serviceLocator.get('logger')

        // Grab cell model
        const CellModel = database.models.Cell;

        // read all
        let cells;
        try{
            if (isStringNonEmpty(image_id) && isNumber(rect_id)) {
                cells = await CellModel.findAll({
                    attributes: attributes_full,
                    where: {
                        'image_id': image_id,
                        'rect_id': rect_id
                    },
                    raw: true
                })
            } else if (isStringNonEmpty(image_id)) {
                cells = await CellModel.findAll({
                    attributes: attributes_full,
                    where: {
                        'image_id': image_id
                    },
                    raw: true
                })
            }
        }catch(e){
            logger.error('could not read cells');
        }

        return cells;
    }

    // --- Read ---
    server.get(
        '/api/cell/:image_id/:rect_id',
        validator({
            params: by_rect
        }),
        async (req, res, next) => {

            // get data
            const { image_id, rect_id } = req.params;

            // read from database
            const cells = await read(image_id, rect_id);

            if(cells === undefined || cells === null){
                return res.status(400).send({ message: 'could not read cells' })
            }else{
                return res.status(200).send(cells)
            }
        }
    )

    server.get(
        '/api/cell/:image_id',
        validator({
            params: by_image
        }),
        async (req, res, next) => {

            // get data
            const { image_id } = req.params;

            // read from database
            const cells = await read(image_id);

            if(cells === undefined || cells === null){
                return res.status(400).send({ message: 'could not read cells' })
            }else{
                return res.status(200).send(cells)
            }
        }
    )


    // --- Read Search ----
    server.post(
        '/api/cellsearch',
        validator({
            body: by_search
        }),
        async (req, res, next) => {

            // get data from body
            const { rect_ids, table_template_id, branch_id, ignore_reviewed } = req.body;

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // build query
            let query = `
                SELECT
                    image_id,
                    rect_id,
                    data_type,
                    opts,
                    value
                FROM
                    cell
                WHERE
                    rect_id IN ( ${rect_ids.join(', ')} ) 
                AND
                    image_id IN (
                        SELECT
                            id
                        FROM
                            image
                        WHERE
                            ( image.approved IS NULL OR image.approved = true )
                        AND
                            image.table_template_id IS NOT NULL
                        AND
                            image.duplicate_of IS NULL
                        AND
                            image.branch_id IS NOT NULL
                        AND
                            image.table_template_id = ${table_template_id}
                        AND
                            image.name != 'fix'
                    )
            `;

            // add reviewed flag
            if (ignore_reviewed === true) {
                query = `${query} AND (reviewed IS NULL OR reviewed = false)`
            }
   
            // add branch id
            if (isNumber(branch_id)){
                query = `${query} AND image_id IN (SELECT id FROM image WHERE branch_id = ${branch_id})`
            }

            // find all
            let cells;
            try{
                cells = (await database.query(query))[0];
            }catch(e){
                logger.error('could not perform cell search');
                return res.status(400).send({ message: 'could not perform cell search' })
            }

            // validate
            if (!isArray(cells)) {
                return res.status(400).send({ message: 'could not find cells in database' })
            }

            // log
            logger.info(`cell search returned ${cells.length} cells`);

            return res.status(200).send(cells)
        }
    );


    // --- Update cell value ---
    server.put(
        '/api/cell',
        validator({
            body: by_rects
        }),
        async (req, res, next) => {

            // grab data from body
            const { rect_ids, image_id, value } = req.body;

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab cell model
            const CellModel = database.models.Cell;

            // build query
            const query = `
                SELECT
                    image_id,
                    rect_id,
                    opts,
                    data_type
                FROM
                    cell
                WHERE
                    image_id = '${image_id}'
                AND
                    rect_id IN ( ${rect_ids.join(', ')} )
            `;

            // find all
            let cells;
            try{
                cells = (await database.query(query))[0];
            }catch(e){
                logger.error('could not read cells');
                return res.status(400).send({ message: 'could not read cells' })
            }

            // validate
            if (cells === undefined || cells === null || !Array.isArray(cells) || cells.length !== rect_ids.length) {
                return res.status(400).send({ message: 'could not find cells in database' })
            }

            // get date now
            const date_now = new Date()

            // set data
            cells.forEach(cell => {

                // push value to historical
                let hist_values = cell['hist_values'];
                if (hist_values === undefined || hist_values === null || !Array.isArray(hist_values)) {
                    hist_values = []
                }
                hist_values.push({
                    value,
                    created_at: date_now
                })
                cell['hist_values'] = hist_values;

                // set reviewed flag
                cell['reviewed'] = true;

                // set current value
                cell['value'] = value;
            })

            // update
            try {
                const result = await CellModel.bulkCreate(cells, { returning: true, updateOnDuplicate: ['value', 'hist_values', 'reviewed'] })
            }catch (e){
                console.log(e)
                logger.error('could not create cells');
                return res.status(400).send({ message: 'could not create cells' })
            }

            // inform
            logger.info(`${rect_ids.length} cells from (image ${image_id}) updated`)

            // update project status
            const status = serviceLocator.get('status');
            await status.refresh();

            return res.status(200).send({ message: `${rect_ids.length} cells from (image ${image_id}) updated` })
        }
    )


    // --- Upsert Cells ---
    server.post(
        '/api/cell/:image_id',
        validator({
            params: by_image,
            body: by_cells
        }),
        async (req, res, next) => {

            // get data
            const { image_id } = req.params;

            // grab data from body
            const { rectangles } = req.body;

            // set the image id for all rectangles
            rectangles.forEach(rect => {
                rect['image_id'] = image_id;
            })

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab cell model
            const CellModel = database.models.Cell;

            // update
            try {
                const result = await CellModel.bulkCreate(rectangles, { returning: true, updateOnDuplicate: [
                    'tl_x',
                    'tl_y',
                    'tr_x',
                    'tr_y',
                    'br_x',
                    'br_y',
                    'bl_x',
                    'bl_y',
                    'data_type',
                    'opts'
                ] })
            }catch (e){
                console.log(e)
                logger.error('could not create cells');
                return res.status(400).send({ message: 'could not create cells' })
            }

            // inform
            logger.info(`${rectangles.length} cells created`)

            // update project status
            const status = serviceLocator.get('status');
            await status.refresh();

            return res.status(200).send({ message: `${rectangles.length} cells created` })
        }
    )
}


const cell = {
    'register': register
}

export default cell;
