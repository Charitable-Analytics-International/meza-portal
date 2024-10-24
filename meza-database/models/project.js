'use strict'

function schema(postgres, types, deferrable){
    return postgres.define('project', {
        id: {
            type: types.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: types.STRING,
            allowNull: false
        },
        status: {
            type: types.UUID
        },
        district_boundaries: {
            type: types.JSON
        },
        created_at: {
            type: types.DATE,
            defaultValue: postgres.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
            type: types.DATE,
            defaultValue: postgres.literal('CURRENT_TIMESTAMP')
        }
    }, {
        freezeTableName: true,
        timestamps: false
    })
}

export default schema