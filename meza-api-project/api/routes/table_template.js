'use strict'


function register(server, serviceLocator) {

    // --- Read ---
    server.get(
        '/api/table_template',
        async (req, res, next) => {

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab table_template model
            const Table_TemplateModel = database.models.Table_Template;

            // read all
            let table_templates;
            try{
                table_templates = await Table_TemplateModel.findAll()
            }catch(e){
                logger.error('could not read table_templates');
                return res.status(400).send({ message: 'could not read table_templates' })
            }

            // send
            return res.status(200).send(table_templates)
        }
    )
}


const table_template = {
    'register': register
}

export default table_template;
