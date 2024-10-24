'use strict'

function schema(postgres, types, deferrable){
    return postgres.define('account', {
        id: {
            type: types.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        firstname: {
            type: types.STRING
        },
        lastname: {
            type: types.STRING
        },
        email: {
            type: types.STRING,
            unique: true,
            allowNull: false
        },
        password: {
            type: types.STRING,
            allowNull: false
        },
        access: {
            type: types.INTEGER,
            allowNull: false
        },
        branch_ids: {
            type: types.ARRAY(types.INTEGER),
            allowNull: true
        },
        last_login_at: {
            type: types.DATE
        },
        sid: {
            type: types.STRING
        },
        publickey: {
            type: types.TEXT,
            allowNull: false
        },
        privatekey: {
            type: types.TEXT,
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
        timestamps: false
    })
}

export default schema