# import libs
import datetime as dt
import json
from .libs import return_uuidv4, run_sql_query

# config
table_template_id = 11
rect_id_date_of_birth_day = 73
rect_id_date_of_birth_month = 72
rect_id_date_of_birth_year = 71
rect_id_gender = 70
rect_id_patient_id = [
    106,
    105,
    113,
    104,
    112,
    103,
    110,
    109,
    108,
    107
]
rect_id_visit_date_day = 81
rect_id_visit_date_month = 80
rect_id_visit_date_year = 79


# possible values
gender_values = [ 'Male', 'Female', 'Inter' ]




def load_mapping_branches():

    # load file
    with open('./libs/mapping_branches.json', 'r') as f:
        mapping_branches = json.load(f)

    # convert to dict
    _mapping_branches = {}

    # go through
    for m in mapping_branches:

        # unpack
        account_id = m['account_id']
        branch_id = m['branch_id']

        # set
        _mapping_branches[account_id] = branch_id

    return _mapping_branches


def add_info(branch_id, patient_id, age, gender):

    # check
    if gender not in gender_values:
        print('ERROR: Gender invalid')
        return

    # check
    if len(patient_id) != 10:
        print('ERROR: Patient id invalid')
        return

    # ---------------------------------------------------------------------------------------------------------

    # generate
    uuidv4 = return_uuidv4()

    # insert image
    query_image = f"INSERT INTO image (id, status, name, branch_id, table_template_id) VALUES ('{uuidv4}', 1, 'fix', {branch_id}, {table_template_id});"

    # run
    run_sql_query(query_image)

    # ---------------------------------------------------------------------------------------------------------

    # insert id
    for i, rect_id in enumerate(rect_id_patient_id):
        query_cell_id = f"INSERT INTO cell (image_id, rect_id, data_type, value, reviewed) VALUES ('{uuidv4}', {rect_id}, 'integer', {patient_id[i]}, true)"
        run_sql_query(query_cell_id)

    # ---------------------------------------------------------------------------------------------------------

    # insert cells
    query_cell_gender = f"INSERT INTO cell (image_id, rect_id, data_type, value, reviewed) VALUES ('{uuidv4}', {rect_id_gender}, 'bubble', '{gender}', true)"

    # run
    run_sql_query(query_cell_gender)

    # ---------------------------------------------------------------------------------------------------------

    # generate date of birth from age
    date_of_birth = dt.datetime.now() - dt.timedelta(days=age*365)
    year = date_of_birth.year
    month = date_of_birth.month
    day = date_of_birth.day

    # insert cells
    query_cell_date_of_birth_day = f"INSERT INTO cell (image_id, rect_id, data_type, value, reviewed) VALUES ('{uuidv4}', {rect_id_date_of_birth_day}, 'integer', {day}, true)"
    query_cell_date_of_birth_month = f"INSERT INTO cell (image_id, rect_id, data_type, value, reviewed) VALUES ('{uuidv4}', {rect_id_date_of_birth_month}, 'integer', {month}, true)"
    query_cell_date_of_birth_year = f"INSERT INTO cell (image_id, rect_id, data_type, value, reviewed) VALUES ('{uuidv4}', {rect_id_date_of_birth_year}, 'integer', {year}, true)"

    # run
    run_sql_query(query_cell_date_of_birth_day)
    run_sql_query(query_cell_date_of_birth_month)
    run_sql_query(query_cell_date_of_birth_year)

    # ---------------------------------------------------------------------------------------------------------

    # generate date of birth from age
    visit_date = dt.datetime.now()
    year = visit_date.year
    month = visit_date.month
    day = visit_date.day

    # insert cells
    query_cell_visit_date_day = f"INSERT INTO cell (image_id, rect_id, data_type, value, reviewed) VALUES ('{uuidv4}', {rect_id_visit_date_day}, 'integer', {day}, true)"
    query_cell_visit_date_month = f"INSERT INTO cell (image_id, rect_id, data_type, value, reviewed) VALUES ('{uuidv4}', {rect_id_visit_date_month}, 'integer', {month}, true)"
    query_cell_visit_date_year = f"INSERT INTO cell (image_id, rect_id, data_type, value, reviewed) VALUES ('{uuidv4}', {rect_id_visit_date_year}, 'integer', {year}, true)"

    # run
    run_sql_query(query_cell_visit_date_day)
    run_sql_query(query_cell_visit_date_month)
    run_sql_query(query_cell_visit_date_year)

    # ---------------------------------------------------------------------------------------------------------

    return uuidv4


def read_info():

    # combine
    rect_ids_str = ', '.join([ str(x) for x in rect_id_patient_id ])

    # add gender, and date of birth
    rect_ids_str += ', ' + str(rect_id_gender)
    rect_ids_str += ', ' + str(rect_id_date_of_birth_day)
    rect_ids_str += ', ' + str(rect_id_date_of_birth_month)
    rect_ids_str += ', ' + str(rect_id_date_of_birth_year)

    # insert cells
    query_cell = f"SELECT image.id AS image_id, branch.name AS branch_name, image.created_at AS created_at, json_agg(json_build_object('value', cell.value, 'rect_id', cell.rect_id)) AS cells FROM image LEFT JOIN branch ON branch.id = image.branch_id LEFT JOIN cell ON image.id = cell.image_id WHERE image.table_template_id = {table_template_id} AND cell.rect_id IN ({rect_ids_str}) AND cell.reviewed = true GROUP BY image.id, branch.name ORDER BY image.created_at DESC"

    # run
    results = run_sql_query(query_cell)

    # parse results
    results = [ { 'image_id': x[0], 'branch_name': x[1], 'created_at': x[2], 'cells': x[3] } for x in results ]

    # init
    table = [['id', 'branch_name', 'created_at', 'patient_id', 'gender', 'date_of_birth']]

    # convert cells value to string using the order of rect_id_patient_id
    for result in results:

        # unpack
        image_id = result['image_id']
        branch_name = result['branch_name']
        cells = result['cells']
        created_at = result['created_at']

        # convert created_at yyyy-mm-dd
        created_at = created_at.strftime('%Y-%m-%d')
        result['created_at'] = created_at

        # convert to dict rect_id -> value
        cells = { x['rect_id']: x['value'] for x in cells }

        # delete
        del result['cells']

        # init
        patient_id = ''
        gender = ''
        date_of_birth = ''

        # set patient id
        for rect_id in rect_id_patient_id:
            if rect_id in cells:
                patient_id += str(cells[rect_id])

        # set gender
        if rect_id_gender in cells:
            gender = cells[rect_id_gender]

        # set date of birth
        if rect_id_date_of_birth_day in cells and rect_id_date_of_birth_month in cells and rect_id_date_of_birth_year in cells:
            date_of_birth = f"{cells[rect_id_date_of_birth_day]}/{cells[rect_id_date_of_birth_month]}/{cells[rect_id_date_of_birth_year]}"

        # skip if unset
        if len(patient_id) != 10 or len(gender) == 0 or len(date_of_birth) == 0: continue

        # push to table
        datum = [ image_id, branch_name, created_at, patient_id, gender, date_of_birth ]

        # append
        table.append(datum)

    return table



def set_branches():

    # load mapping
    mapping = load_mapping_branches()

    # go through
    for key in mapping.keys():

        # unpack
        account_id = key
        branch_id = mapping[key]

        # build query
        query = f"UPDATE image SET branch_id = {branch_id} WHERE account_id = {account_id} AND branch_id IS NULL"

        # run query
        run_sql_query(query)



def fingerprint_record(record):

    # unpack
    table_template_id = record['table_template_id']
    date = record['info']['date']
    created_at = record['created_at']

    # convert date to string
    created_at_str = created_at.strftime('%Y-%m-%d')

    # if date provided
    if date is not None:
        return f'{table_template_id}-{date}'

    return f'{table_template_id}-{created_at_str}'



def remove_duplicate_records(records_of_patient):

    # init
    unique_records_fingerprints = []
    unique_records = []

    # sort records by created_at in descending order
    records_of_patient.sort(key=lambda x: x['created_at'], reverse=True)

    # create a fingerprint for each record
    for record in records_of_patient:
        record['fingerprint'] = fingerprint_record(record)

    # remove duplicate records
    for record in records_of_patient:
        if record['fingerprint'] not in unique_records_fingerprints:
            unique_records_fingerprints.append(record['fingerprint'])
            unique_records.append(record)
    
    # return unique records
    return unique_records
