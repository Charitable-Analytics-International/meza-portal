# Import config
from config import SERVER

# Import libraries
from .libs import run_sql_query, compute_age_from_dateofbirth, parse_date
from .fix import remove_duplicate_records


# build query to retrieve image data
query = """
SELECT 
    image.id AS image_id,
    image.branch_id AS branch_id,
    branch.name AS branch_name,
    account.email AS email,
    DATE(image.created_at) AS created_at,
    image.table_template_id AS table_template_id,
    table_template.name AS table_template_name,
    (
        SELECT JSON_AGG(JSON_BUILD_OBJECT(
            'rect_id', cell.rect_id, 
            'value', cell.value
        ))
        FROM 
            cell 
        WHERE 
            cell.image_id = image.id
    ) AS cells
FROM 
    image
LEFT JOIN
    branch
ON 
    image.branch_id = branch.id
LEFT JOIN
    account
ON 
    image.account_id = account.id
LEFT JOIN
    table_template
ON 
    image.table_template_id = table_template.id
WHERE
    ( image.approved IS NULL OR image.approved = true )
AND
    image.table_template_id IS NOT NULL
AND
    ( image.status = 1 OR image.status = 2 )
AND
    image.branch_id IS NOT NULL
ORDER BY
    image.created_at DESC
"""


# Mappings of 'table_template_id' -> 'rect_ids' -> Field of interest
mapping_date = {
    '1': [ 36 ],
    '2': [ 58 ],
    '8': [ 95, 94, 93 ],
    '9': [ 117, 116, 115 ],
    '10': [ 53, 52, 51 ],
    '11': [ 81, 80, 79 ] 
}

mapping_uid = {
    '1': [ 56 ],
    '2': [ 61 ],
    '8': [ 165, 164, 163, 162, 161, 160, 159, 158, 156, 157 ],
    '9': [ 129, 128, 127, 126, 125, 124, 123, 122, 121, 120 ],
    '10': [ 161, 160, 159, 158, 157, 155, 154, 153, 152, 151 ],
    '11': [ 106, 105, 113, 104, 112, 103, 110, 109, 108, 107 ]
}

mapping_dateofbirth = {
    '1': [ 46 ],
    '2': [ None ],
    '8': [ 114, 113, 112 ],
    '9': [ None ],
    '10': [ 144, 143, 142 ],
    '11': [ 73, 72, 71 ] 
}

mapping_gender = {
    '1': [ 45 ],
    '2': [ None ],
    '8': [ 111 ], 
    '9': [ None ],
    '10': [ 145 ],
    '11': [ 70 ]
}


# Helper functions to retrieve cell values
def return_cell_value(cells, rect_id):
    if rect_id is None: return None
    values = [cell['value'] for cell in cells if cell['rect_id'] == rect_id]
    if len(values) == 0: return None
    return values[0]
    
def return_cell_values(cells, rect_ids):
    return [ return_cell_value(cells, rect_id) for rect_id in rect_ids ]



def load_data():

    # run query
    data = run_sql_query(query)

    # convert data to dict
    data = [{ 
        'image_id': d[0], 
        'branch_id': d[1], 
        'branch_name': d[2], 
        'email': d[3], 
        'created_at': d[4],
        'table_template_id': str(d[5]), 
        'table_template_name': d[6], 
        'cells': d[7],
        'info': {}
    } for d in data if len(d[7]) > 0 ]

    # set key attributes
    for i, d in enumerate(data):

        # unpack
        table_template_id = d['table_template_id']
        cells = d['cells']

        # extract
        uid = return_cell_values(cells, mapping_uid[table_template_id])
        date = return_cell_values(cells, mapping_date[table_template_id])
        gender = return_cell_values(cells, mapping_gender[table_template_id])[0]
        dateofbirth = return_cell_values(cells, mapping_dateofbirth[table_template_id])

        # process
        uid = ''.join([ d for d in uid if d not in [ None, 'failed', '' ]] )
        date = parse_date(date)
        age = compute_age_from_dateofbirth(dateofbirth)

        # set
        data[i]['uid'] = ''.join(uid)
        data[i]['info']['date'] = date
        data[i]['info']['gender'] = gender
        data[i]['info']['age'] = age


    return data


def load_branches():
    
    # branch to whatsapp number
    branches = run_sql_query("SELECT id, name, whatsapp FROM branch")
    branches = { b[1]: { 'id': b[0], 'whatsapp': b[2] } for b in branches }

    return branches



def print_record(record, suffix = ''):

    # unpack
    image_id = record['image_id']
    created_at = record['created_at']

    # create links
    link_dashboard = f'{SERVER}?image_id={image_id}'
    link_file = f'{SERVER}/api/files/{image_id}'

    # log
    print(f'Submitted on {created_at}, {link_dashboard}{suffix}')


# --------------------------------------------------------------------------------------------------------------
# --------------------------------------------------------------------------------------------------------------
# --------------------------------------------------------------------------------------------------------------


def is_uid_invalid(uid):
    return uid == '' or uid == 'failed' or uid is None or len(uid) != 10

def extract_attribute(records, attribute_key):

    # extract attribute
    attribute = [ r['info'][attribute_key] for r in records ]

    # remove '', 'failed', and None
    attribute = list(set([ a for a in attribute if a not in ['', 'failed', None] ]))

    return attribute

def load_patients():

    # import data
    branches = load_branches()
    data = load_data()

    # setup main dataframe
    df = {}

    # --------------------------------------------------------------------------------

    # Group Records by Branch
    for branch_name in branches.keys():

        # unpack
        branch_id = branches[branch_name]['id']

        # add branch
        df[branch_id] = {
            'branch_id': branch_id,
            'branch_name': branch_name,
            'records': [],
            'patients': {}
        }

    # add records
    for d in data:
        df[d['branch_id']]['records'].append(d)

    # --------------------------------------------------------------------------------

    # Group Records by Patient
    for branch_id in df.keys():

        # unpack
        records = df[branch_id]['records']

        # go through each record
        for record in records:

            # unpack
            uid = record['uid']

            # if uid is invalid, continue
            if is_uid_invalid(uid): continue

            # add to patients
            if uid not in df[branch_id]['patients'].keys():
                df[branch_id]['patients'][uid] = {
                    'age': None,
                    'gender': None,
                    'records': []
                }
            df[branch_id]['patients'][uid]['records'].append(record)

    # --------------------------------------------------------------------------------

    # Remove Duplicates
    for branch_id in df.keys():

        # go through patients
        for uid in df[branch_id]['patients'].keys():

            # unpack
            branch_name = df[branch_id]['branch_name']
            records = df[branch_id]['patients'][uid]['records']

            # remove duplicates
            unique_records = remove_duplicate_records(records)

            # set
            df[branch_id]['patients'][uid]['records'] = unique_records

    # --------------------------------------------------------------------------------

    # set basic attributes of each patient
    for branch_id in df.keys():
        for uid in df[branch_id]['patients'].keys():

            # init
            gender = None
            age = None

            # unpack
            records = df[branch_id]['patients'][uid]['records']

            # sort by created_at date
            records = sorted(records, key=lambda r: r['created_at'], reverse=True)

            # extract values
            ages = extract_attribute(records, 'age')
            genders = extract_attribute(records, 'gender')

            # set
            if len(genders) == 1: gender = genders[0]
            if len(ages) == 1: age = ages[0]

            # set
            df[branch_id]['patients'][uid]['gender'] = gender
            df[branch_id]['patients'][uid]['age'] = age

    # --------------------------------------------------------------------------------

    # delete records
    for branch_id in df.keys():

        # delete records
        del df[branch_id]['records']


    return df
