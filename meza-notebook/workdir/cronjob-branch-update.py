# libs
import json
import psycopg2 as pg
import time

# config
from config import DB_PORT, DB_HOST, DB_NAME, DB_USERNAME, DB_PASSWORD

# connect to database
connection = pg.connect(user=DB_USERNAME, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT, database=DB_NAME)


def run_sql_query(sql_query):

    # init
    data = None

    # Create a cursor to perform database operations
    cursor = connection.cursor()

    # Fetch result
    cursor.execute(sql_query)

    # if select, fetch all
    if sql_query.strip().lower().startswith('select'):
        data = cursor.fetchall()
    
    # commit
    connection.commit()

    # close
    cursor.close()

    # return
    return data


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


def main():

    # run in a loop every 5 minutes
    while True:

        # set branches
        try:
            set_branches()
        except:
            print('Error setting branches')
            
        # log
        print('Branches updated')

        # sleep
        time.sleep(300)
        

if __name__ == '__main__':

    # run
    main()
    