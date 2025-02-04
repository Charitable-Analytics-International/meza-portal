'use strict';

// import datatype lib
import { isArrayNonEmpty } from "../gen/datatype.js";


// Safe DB Query
export async function db_query(database, query){

    // run query
    let results, metadata;
    try {
        [results, metadata] = await database.query(query);
    } catch(e) {
        console.log(e);
        return [];
    }

    // skip if none
    if(!isArrayNonEmpty(results)){
        return [];
    }

    return results;
}


// Definition of a fully "processed" image
export function return_processed_image_definition(){
    return `
            ( image.approved IS NULL OR image.approved = true )
        AND
            image.table_template_id IS NOT NULL
        AND
            image.status = 1
        AND
            image.duplicate_of IS NULL
        AND
            image.branch_id IS NOT NULL
    `;
}

export function return_processed_image_definition_WITH_DUPLICATES(){
    return `
            ( image.approved IS NULL OR image.approved = true )
        AND
            image.table_template_id IS NOT NULL
        AND
            image.status = 1
        AND
            image.branch_id IS NOT NULL
    `;
}


export function select_image_ids_STRICT(){
    return `SELECT id FROM image WHERE ${return_processed_image_definition()}`;
}


export function select_cells_schema_by_image_id(image_id){

    const query = `
    SELECT
        image_id,
        rect_id,
        tl_x,
        tl_y,
        tr_x,
        tr_y,
        br_x,
        br_y,
        bl_x,
        bl_y
    FROM
        cell
    WHERE
        image_id = '${image_id}'
    `;

    return query;
}


export function select_table_templates(){

    // build query
    const query = `SELECT id, name, rectangles FROM table_template ORDER BY id`;

    return query;
}


export function update_image_status(STATUS, image_id){

    // build query
    const query = `UPDATE image SET status = ${STATUS} WHERE id = '${image_id}'`;

    return query;
}


export function update_images_status(STATUS, image_ids){

    // stringify image_ids
    const image_ids_str = image_ids.map(d => `'${d}'`).join(', ')

    // build query
    const query = `UPDATE image SET status = ${STATUS} WHERE id IN ( ${image_ids_str} )`;

    return query;
}


export function update_cell_value_failed(image_id, rect_id){

    // build query
    const query = `UPDATE cell SET value = 'failed' WHERE image_id = '${image_id}' AND rect_id = ${rect_id}`;

    // run query
    return query;
}


export function update_image_set_duplicate_of(image_id, duplicate_of_image_id){

    const query = `
        UPDATE
            image
        SET
            duplicate_of = '${duplicate_of_image_id}'
        WHERE
            id = '${image_id}'
    `;

    return query;
}


export function upsert_cells_sharding(cells) {

    // build query
    const query = `
        INSERT INTO cell
            (
                image_id,
                rect_id,
                data_type,
                opts,
                tl_x,
                tl_y,
                tr_x,
                tr_y,
                bl_x,
                bl_y,
                br_x,
                br_y
            )
        VALUES
            ${cells.map(cell => {return `(
                '${cell['image_id']}',
                ${cell['rect_id']},
                '${cell['data_type']}',
                '${cell['opts']}',
                ${cell['tl_x']},
                ${cell['tl_y']},
                ${cell['tr_x']},
                ${cell['tr_y']},
                ${cell['bl_x']},
                ${cell['bl_y']},
                ${cell['br_x']},
                ${cell['br_y']}
            )`}).join(',')}
        ON CONFLICT
            (image_id, rect_id)
        DO UPDATE SET
            data_type = EXCLUDED.data_type,
            opts = EXCLUDED.opts,
            tl_x =  EXCLUDED.tl_x,
            tl_y =  EXCLUDED.tl_y,
            tr_x =  EXCLUDED.tr_x,
            tr_y =  EXCLUDED.tr_y,
            bl_x =  EXCLUDED.bl_x,
            bl_y =  EXCLUDED.bl_y,
            br_x =  EXCLUDED.br_x,
            br_y =  EXCLUDED.br_y
    `;

    return query;
}


export function upsert_cells_decoding(cells) {

    // build query
    const query = `
        INSERT INTO cell
            (
                image_id,
                rect_id,
                data_type,
                value,
                confidence
            )
        VALUES
            ${cells.map(cell => {return `(
                '${cell['image_id']}',
                ${cell['rect_id']},
                '${cell['data_type']}',
                ${cell['value'] === null ? 'NULL' : `'${cell['value']}'`},
                ${cell['confidence']}
            )`}).join(',')}
        ON CONFLICT
            (image_id, rect_id)
        DO UPDATE SET
            value = EXCLUDED.value,
            confidence = EXCLUDED.confidence
    `;

    // update query
    return query;
}


export function select_images_with_status_null(LIMIT){

    // build query
    const query = `
        SELECT
            id
        FROM
            image
        WHERE
            status IS NULL
        ORDER BY
            created_at ASC
        LIMIT
            ${LIMIT}
    `;

    return query;
}


export function select_images_by_status(STATUS, LIMIT){

    // build query
    const query = `
        SELECT
            id
        FROM
            image
        WHERE
            status = ${STATUS}
        AND
            updated_at < NOW() - INTERVAL '3 minutes'
        ORDER BY
            created_at ASC
        LIMIT
            ${LIMIT}
    `;

    return query;
}


export function select_images_by_table_template_id_STRICT(table_template_id){

    const query = `
        SELECT
            id
        FROM
            image
        WHERE
            ${return_processed_image_definition()}
        AND
            table_template_id = ${table_template_id}
        ORDER BY
            created_at ASC
    `;

    return query
}


export function select_cells_by_image_id_STRICT(image_id){

    // build query
    const query = `
        SELECT
            rect_id,
            data_type,
            opts,
            value
        FROM
            cell
        LEFT JOIN
            image
        ON
            image.id = cell.image_id
        WHERE
            ${return_processed_image_definition()}
        AND
            cell.data_type IN ( 'integer', 'float', 'bubble' )
        AND
            cell.value IS NOT NULL AND cell.value != 'failed'
        AND
            image.id = '${image_id}'
    `;

    return query;
}


export function select_image_ids_with_same_cell_value_STRICT(rect_id, value){

    // build query
    const query = `
        SELECT
            DISTINCT image_id
        FROM
            cell
        LEFT JOIN
            image
        ON
            image.id = cell.image_id
        WHERE
            ${return_processed_image_definition()}
        AND
            cell.data_type IN ( 'integer', 'float', 'bubble' )
        AND
            cell.value IS NOT NULL AND cell.value != 'failed'
        AND
            cell.rect_id = ${rect_id}
        AND
            cell.value = '${value}'
    `;

    return query;
}


export function select_cells_by_image_id_STRICT_and_data_type(image_id, data_types){

    // stringify data types
    const data_types_str = data_types.map(d => `'${d}'`).join(', ')

    // build query
    const query = `
        SELECT
            image_id AS image_id,
            rect_id AS rect_id,
            opts AS opts
        FROM
            cell
        WHERE
            image_id = '${image_id}'
        AND
            data_type IN ( ${data_types_str} )
    `;

    return query;
}
