# Librairies
import os
import sys
from libs.libs import run_sql_query

# Config
cells_prefix = 'COPY public.cell'
images_prefix = 'COPY public.image'
suffix = '\.'


def read_sql_dump( path_sql_dump ):

    # Initiate
    cells = []
    images = []

    # Load Data
    with open(path_sql_dump, 'r') as f:
        
        # read file
        data = f.read()
        data = data.split('\n')

        # go through
        for i, line in enumerate(data):

            # cells
            if line.startswith(cells_prefix):
                for j, line in enumerate(data):
                    if j < i: continue
                    if line.startswith(suffix): break
                    cells.append(line)


            # images
            if line.startswith(images_prefix):
                for j, line in enumerate(data):
                    if j < i: continue
                    if line.startswith(suffix): break
                    images.append(line)

                    
    # Parse Headers
    cells_headers = [ col.strip() for col in cells[0].split('(')[-1].split(')')[0].split(',') ]
    images_headers = [ col.strip() for col in images[0].split('(')[-1].split(')')[0].split(',') ]

    # Remove headers
    cells = cells[1:]
    images = images[1:]
    
    # Parse Values
    for j, line in enumerate(cells):

        # init
        datum = {}

        for i, value in enumerate(line.split('\t')):

            # get header
            header = cells_headers[i]

            # set value
            if value == '\\N': value = 'NULL'
            if value == 't': value = 'true'
            if value == 'f': value = 'false'
            datum[header] = value.strip()

        # set
        cells[j] = datum

    for j, line in enumerate(images):

        # init
        datum = {}

        for i, value in enumerate(line.split('\t')):

            # get header
            header = images_headers[i]

            # set value
            if value == '\\N': value = 'NULL'
            if value == 't': value = 'true'
            if value == 'f': value = 'false'
            datum[header] = value.strip()

        # set
        images[j] = datum

    # Return
    return [ images, cells ]


def build_query_images( images, update=False ):

    # Build list of values to upsert
    query_images_values = ', '.join([ f"( '{image['id']}', '{image['created_at']}', '{image['name']}', {image['account_id']}, {image['branch_id']}, {image['table_template_id']}, {image['status']}, {image['approved']}, {image['rotation']} )" for image in images ])
    
    # Build query
    query_images = f"""
    INSERT INTO image
        (
            id, 
            created_at,
            name,
            account_id,
            branch_id,
            table_template_id,
            status,
            approved,
            rotation
        )
    VALUES
        {query_images_values}
    """

    # Conflict Action
    if update:
        query_images += """
    ON CONFLICT
        (
            id
        )
    DO UPDATE SET
        created_at = EXCLUDED.created_at,
        status = EXCLUDED.status,
        approved = EXCLUDED.approved,
        rotation = EXCLUDED.rotation,
        branch_id = EXCLUDED.branch_id,
        table_template_id = EXCLUDED.table_template_id
    """
    else:
        query_images += """
    ON CONFLICT
        ( id )
    DO NOTHING
    """
        
    # Return
    return query_images


def build_query_cells( cells, update=False ):

    # format values
    for i, cell in enumerate(cells):
        value = cell['value']
        if value is None or value == 'NULL':
            value = 'NULL'
        else:
            value = f"'{value}'"
        cells[i]['value'] = value

    # Build list of values to upsert
    query_cells_values = ', '.join([ f"('{cell['image_id']}', {cell['rect_id']}, '{cell['data_type']}', '{cell['opts']}', {cell['value']}, {cell['confidence']}, {cell['reviewed']}, {cell['tl_x']}, {cell['tl_y']}, {cell['tr_x']}, {cell['tr_y']}, {cell['bl_x']}, {cell['bl_y']}, {cell['br_x']}, {cell['br_y']})" for cell in cells ])

    # Build query
    query_cells = f"""
    INSERT INTO cell
        (
            image_id,
            rect_id,
            data_type,
            opts,
            value,
            confidence,
            reviewed,
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
        {query_cells_values}
    """

    # Conflict Action
    if update:
        query_cells += """
    ON CONFLICT
        (image_id, rect_id)
    DO UPDATE SET
        value = EXCLUDED.value,
        reviewed = EXCLUDED.reviewed,
        confidence = EXCLUDED.confidence,
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
    """
    else:
        query_cells += """
    ON CONFLICT
        (image_id, rect_id)
    DO NOTHING
    """
        
    # Return
    return query_cells


def run( path_sql_dump, update_images, update_cells ):

    # Read SQL Dump
    images, cells = read_sql_dump( path_sql_dump )

    # Build Queries
    query_images = build_query_images( images, update_images )
    query_cells = build_query_cells( cells, update_cells )

    # Run
    run_sql_query(query_images)
    run_sql_query(query_cells)



if __name__ == "__main__":

    # Check Args
    try:
        path = sys.argv[1]
        update_images = sys.argv[2]
        update_cells = sys.argv[3]
    except:
        raise Exception("error while loading argument")

    # Validate
    if not os.path.exists(path): 
        raise Exception("error path doesnt exists")
    
    if update_images != '0' and update_images != '1': 
        raise Exception("error invalid update images flag")
    
    if update_cells != '0' and update_cells != '1': 
        raise Exception("error invalid update cells flag")

    # Parse
    if update_images == '0': 
        update_images = False
    elif update_images == '1': 
        update_images = True

    if update_cells == '0': 
        update_cells = False
    elif update_cells == '1': 
        update_cells = True

    # Run
    run( path, update_images, update_cells )
