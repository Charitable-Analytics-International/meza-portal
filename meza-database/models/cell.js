'use strict'

function schema(postgres, types, deferrable){
    return postgres.define('cell', {
        id: {
            type: types.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        image_id: {
            type: types.UUID,
            references: {
                model: 'image',
                key: 'id',
                deferrable: deferrable.INITIALLY_IMMEDIATE
            },
            allowNull: false
        },
        rect_id: {
            type: types.INTEGER,
            allowNull: false
        },
        data_type: {
            type: types.STRING,
            allowNull: false
        },
        opts: {
            type: types.STRING
        },
        tl_x: {
            type: types.INTEGER
        },
        tl_y: {
            type: types.INTEGER
        },
        tr_x: {
            type: types.INTEGER
        },
        tr_y: {
            type: types.INTEGER
        },
        bl_x: {
            type: types.INTEGER
        },
        bl_y: {
            type: types.INTEGER
        },
        br_x: {
            type: types.INTEGER
        },
        br_y: {
            type: types.INTEGER
        },
        value: {
            type: types.STRING
        },
        confidence: {
            type: types.FLOAT
        },
        reviewed: {
            type: types.BOOLEAN
        },
        hist_values: {
            type: types.JSONB,
            defaultValue: []
        },
        public: {
            type: types.BOOLEAN,
            defaultValue: false,
            allowNull: false
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
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['image_id', 'rect_id']
            }
        ]
    })
}

export default schema