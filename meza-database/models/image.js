'use strict'

function schema(postgres, types, deferrable){
    return postgres.define('image', {
        id: {
            type: types.UUID,
            primaryKey: true,
            unique: true,
            defaultValue: types.UUIDV4
        },
        branch_id: {
            type: types.INTEGER,
            references: {
                model: 'branch',
                key: 'id',
                deferrable: deferrable.INITIALLY_IMMEDIATE
            }
        },
        account_id: {
            type: types.INTEGER,
            references: {
                model: 'account',
                key: 'id',
                deferrable: deferrable.INITIALLY_IMMEDIATE
            }
        },
        name: {
            type: types.STRING,
            allowNull: false
        },
        status: {
            type: types.INTEGER
        },
        hash: {
            type: types.STRING
        },
        rotation: {
            type: types.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        duplicate_of: {
            type: types.UUID
        },
        notes: {
            type: types.STRING
        },
        table_template_id: {
            type: types.INTEGER,
            references: {
                model: 'table_template',
                key: 'id',
                deferrable: deferrable.INITIALLY_IMMEDIATE
            }
        },
        taken_at: {
            type: types.DATE
        },
        approved: {
            type: types.BOOLEAN
        },
        approved_at: {
            type: types.DATE
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