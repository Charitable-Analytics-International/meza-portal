'use strict'

function schema(postgres, types, deferrable){
    return postgres.define('table_template', {
        id: {
            type: types.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        rectangles: {
            type: types.JSONB,
            allowNull: false
        },
        name: {
            type: types.STRING,
            allowNull: false
        },
        description: {
            type: types.STRING
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