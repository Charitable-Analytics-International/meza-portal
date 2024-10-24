'use strict'

function schema(postgres, types, deferrable){
    return postgres.define('branch', {
        id: {
            type: types.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: types.STRING,
            allowNull: false
        },
        latitude: {
            type: types.FLOAT
        },
        longitude: {
            type: types.FLOAT
        },
        whatsapp: {
            type: types.STRING
        },
        key: {
            type: types.UUID,
            unique: true,
            defaultValue: types.UUIDV4
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