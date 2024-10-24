'use strict';

// middleware lib
import validator from '../../../meza-libraries/middlewares/validator.js';

// data type lib
import { isNumber } from '../../../meza-libraries/gen/datatype.js';

// schemas
import by_image from '../validations/cell/by_image.js';
import image_attributes from '../validations/image_attributes.js';


function register(server, serviceLocator) {

    // --- Read ---
    server.get(
        '/api/image',
        async (req, res, next) => {

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab image model
            const ImageModel = database.models.Image;

            // read all
            let images;
            try{
                images = await ImageModel.findAll()
            }catch(e){
                logger.error('could not read images');
                return res.status(400).send({ message: 'could not read images' })
            }

            // REMOVE IMAGES WITH NAME = 'fix'
            images = images.filter(im => im['name'] !== 'fix');

            // send
            return res.status(200).send(images)
        }
    )


    // --- Read by id ---
    server.get(
        '/api/image/:image_id',
        async (req, res, next) => {

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab image model
            const ImageModel = database.models.Image;

            // read all
            let image;
            try{
                image = await ImageModel.findByPk(req.params.image_id)
            }catch(e){
                logger.error('could not read image');
                return res.status(400).send({ message: 'could not read image' })
            }

            // send
            return res.status(200).send(image)
        }
    );


    // --- Read Statistics ---
    server.get(
        '/api/imagestatistics',
        async (req, res, next) => {

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // build query
            const query = `
                SELECT
                    image.id AS image_id,
                    image.status AS status,
                    image.account_id AS account_id,
                    image.branch_id AS branch_id,
                    image.table_template_id AS table_template_id,
                    image.approved AS approved,
                    image.created_at AS created_at,
                    COUNT(*) FILTER ( WHERE data_type = 'integer' ) AS nbr_integer,
                    COUNT(*) FILTER ( WHERE data_type = 'float' ) AS nbr_float,
                    COUNT(*) FILTER ( WHERE data_type = 'bubble' ) AS nbr_bubble,
                    COUNT(*) FILTER ( WHERE data_type = 'integer' AND value IS NOT NULL AND value != 'failed' ) AS nbr_integer_decoded,
                    COUNT(*) FILTER ( WHERE data_type = 'float' AND value IS NOT NULL AND value != 'failed' ) AS nbr_float_decoded,
                    COUNT(*) FILTER ( WHERE data_type = 'bubble' AND value IS NOT NULL AND value != 'failed' ) AS nbr_bubble_decoded
                FROM
                    cell
                LEFT JOIN
                    image
                ON
                    image.id = cell.image_id
                WHERE
                    ( image.approved IS NULL OR image.approved = true )
                AND
                    image.table_template_id IS NOT NULL
                AND
                    ( data_type = 'integer' OR data_type = 'float' OR data_type = 'bubble' )
                GROUP BY
                    image.id
                ORDER BY
                    image.created_at
                DESC
            `;

            // read all
            let images, _;
            try{
                [images, _] = await database.query(query);
            }catch(e){
                logger.error('could not read images statistics');
                return res.status(400).send({ message: 'could not read images statistics' })
            }

            // check
            if (images === undefined || images === null || !Array.isArray(images)) {
                logger.error('could not read images statistics');
                return res.status(400).send({ message: 'could not read images statistics' })
            };

            // parse
            images = images.map(image => {

                const { image_id, status, account_id, branch_id, table_template_id, approved, created_at,
                    nbr_integer, nbr_float, nbr_bubble, nbr_integer_decoded, nbr_float_decoded, nbr_bubble_decoded } = image;

                return {
                    'image_id': image_id,
                    'status': +status,
                    'account_id': +account_id,
                    'branch_id': +branch_id,
                    'table_template_id': +table_template_id,
                    'approved': approved,
                    'created_at': created_at,
                    'nbr_integer': +nbr_integer,
                    'nbr_float': +nbr_float,
                    'nbr_bubble': +nbr_bubble,
                    'nbr_integer_decoded': +nbr_integer_decoded,
                    'nbr_float_decoded': +nbr_float_decoded,
                    'nbr_bubble_decoded': +nbr_bubble_decoded
                }
            })

            // send
            return res.status(200).send(images)
        }
    )


    // --- Read Statuses by account ---
    server.get(
        '/api/image/status',
        async (req, res, next) => {

            // TODO: Do not pass using headers
            // grab account id
            const account_id = req.headers['account-id'];

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // check input
            if (!isNumber(account_id)) {
                logger.error(`account id is invalid`)
                return res.status(500).send({ message: `server error - account id invalid` })
            }

            // build query
            const query = `
                SELECT
                    image.id AS id,
                    image.name AS name,
                    image.status AS status,
                    image.account_id AS account_id,
                    image.created_at AS created_at
                FROM
                    image
                WHERE
                    account_id = ${account_id}
                ORDER BY
                    image.created_at DESC
                LIMIT
                    200
            `;

            // read all
            let images, _;
            try{
                [images, _] = await database.query(query);
            }catch(e){
                logger.error('could not read images statistics');
                return res.status(400).send({ message: 'could not read images status' })
            }

            // check
            if (images === undefined || images === null || !Array.isArray(images)) {
                logger.error('could not read images statistics');
                return res.status(400).send({ message: 'could not read images status' })
            };

            // send
            return res.status(200).send(images)
        }
    )


    // --- Update image ---
    server.put(
        '/api/image/:image_id',
        validator({
            params: by_image,
            body: image_attributes
        }),
        async (req, res, next) => {

            // grab data from body
            const { image_id } = req.params;
            const { table_template_id, branch_id, approved, notes, rotation, status } = req.body;

            // Get services
            const database = serviceLocator.get('database');
            const logger = serviceLocator.get('logger');

            // Get models
            const ImageModel = database.models.Image;
            const CellModel = database.models.Cell;

            // Create update payload
            let payload = {};
            if (branch_id !== undefined && branch_id !== null) payload['branch_id'] = branch_id;
            if (table_template_id !== undefined && table_template_id !== null) payload['table_template_id'] = table_template_id;
            if (approved !== undefined && approved !== null) payload['approved'] = approved;
            if (notes !== undefined && notes !== null) payload['notes'] = notes;
            if (rotation !== undefined && rotation !== null) payload['rotation'] = rotation;
            if (status !== undefined && status !== null) payload['status'] = status;

                
            // Check if empty payload
            if (Object.keys(payload).length === 0) {
                logger.error('No payload to update');
                return res.status(400).json({ message: 'No payload to update' });
            }


            try {

                // Get image
                const image = await ImageModel.findOne({
                    where: { id: image_id },
                    attributes: ['id', 'status', 'table_template_id', 'approved', 'rotation'],
                    raw: true
                });

                if (!image) {
                    logger.error(`Image not found: ${image_id}`);
                    return res.status(404).json({ message: 'Image not found' });
                }

                // Update image
                await ImageModel.update(
                    {
                        ...payload,
                        updated_at: new Date()
                    },{
                        where: { id: image_id }
                    }
                );

                // If table_template_id changed, destroy cells
                if (table_template_id !== undefined && table_template_id !== null && image.table_template_id !== table_template_id){
                    await CellModel.destroy({
                        where: {
                            image_id
                        }
                    });
                    logger.info(`Cells deleted: ${image_id}`);
                }

                // Inform update success
                logger.info(`Image updated: ${image_id}`);

                // Update project status
                const project_status = serviceLocator.get('status');
                await project_status.refresh();

                // Send success response
                return res.status(200).json({ message: "Image updated" });
            
            } catch (error) {
                logger.error(`Could not update image: ${image_id}`, error);
                return res.status(500).json({ message: 'Could not update image', error });
            }
        }
    )
}


const image = {
    'register': register
}

export default image;
