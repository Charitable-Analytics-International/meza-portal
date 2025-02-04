'use strict'


function register(server, serviceLocator) {

    // --- Read ---
    server.get(
        '/api/project',
        async (req, res, next) => {

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab project model
            const ProjectModel = database.models.Project;

            // read all
            let projects;
            try{
                projects = await ProjectModel.findAll({
                    raw: true,
                    attributes: ['id', 'name', 'district_boundaries', 'created_at', 'updated_at']
                })
            }catch(e){
                logger.error('could not read projects');
                return res.status(400).send({ message: 'could not read projects' })
            }

            // check 
            if (Array.isArray(projects) && projects.length !== 1){
                logger.error('more than 1 project');
                return res.status(400).send({ message: 'could not read projects' })
            }

            // send
            return res.status(200).send(projects[0])
        }
    )
}


const project = {
    'register': register
}

export default project;
