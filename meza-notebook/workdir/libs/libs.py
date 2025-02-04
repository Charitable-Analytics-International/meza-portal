# import libs
import psycopg2 as pg
import re
import datetime as dt
import urllib.parse
import sys
import uuid
import math

# config
from config import DB_PORT, DB_HOST, DB_NAME, DB_USERNAME, DB_PASSWORD

# connect to database
connection = pg.connect(user=DB_USERNAME, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT, database=DB_NAME)


def date_to_datetime(date):
    date = date.strftime('%Y-%m-%d')
    date = dt.datetime.strptime(date, '%Y-%m-%d') 
    return date


def parse_date_str(date_str):

    # validate
    if date_str == '' or date_str == 'failed' or date_str is None: return None

    try:

        # if dd-mm-yyyy
        if re.match(r'\d{1,2}-\d{1,2}-\d{4}', date_str):
            return dt.datetime.strptime(date_str, '%d-%m-%Y').date()
        
        # if dd/mm/yyyy
        if re.match(r'\d{1,2}\/\d{1,2}\/\d{4}', date_str):
            return dt.datetime.strptime(date_str, '%d/%m/%Y').date()
        
        # if dd-mm-yy
        if re.match(r'\d{1,2}-\d{1,2}-\d{2}', date_str):
            yy = int(date_str.split('-')[-1])
            if yy >= 50:
                yyyy = 1900 + yy
            else:
                yyyy = 2000 + yy
            date_str = date_str[:-2] + str(yyyy)
            return dt.datetime.strptime(date_str, '%d-%m-%Y').date()      
        
        # if dd/mm/yy
        if re.match(r'\d{1,2}\/\d{1,2}/\d{2}', date_str):
            yy = int(date_str.split('/')[-1])
            if yy >= 50:
                yyyy = 1900 + yy
            else:
                yyyy = 2000 + yy
            date_str = date_str[:-2] + str(yyyy)
            return dt.datetime.strptime(date_str, '%d/%m/%Y').date()

        # if yyyy
        if len(date_str) == 4 and re.match(r'\d{4}', date_str):
            dd = 1
            mm = 1
            yyyy = int(date_str)
            date_str = str(dd) + '-' + str(mm) + '-' + str(yyyy)
            return dt.datetime.strptime(date_str, '%d-%m-%Y').date()
        
        # if mm-yyyy
        if re.match(r'\d{1,2}-\d{4}', date_str):
            dd = 1
            mm = int(date_str.split('-')[0])
            yyyy = int(date_str.split('-')[-1])
            date_str = str(dd) + '-' + str(mm) + '-' + str(yyyy)
            return dt.datetime.strptime(date_str, '%d-%m-%Y').date()
        
        # if mm/yyyy
        if re.match(r'\d{1,2}\/\d{4}', date_str):
            dd = 1
            mm = int(date_str.split('/')[-1])
            yyyy = int(date_str.split('/')[-1])
            date_str = str(dd) + '-' + str(mm) + '-' + str(yyyy)
            return dt.datetime.strptime(date_str, '%d-%m-%Y').date()
    except: 
        return None
    
    return None


def parse_date(date):

    # validate
    if date is None: return None

    # if string
    if type(date) == str:
        return parse_date_str(date)

    # if list
    if type(date) == list:
        if len(date) == 0: return None
        if len(date) == 1: return parse_date_str(date[0])
        if len(date) == 3:

            # unpack
            dd = date[0]
            mm = date[1]
            yyyy = date[2]

            # if invalid
            if yyyy == '' or yyyy == 'failed' or yyyy is None: return None
            if len(yyyy) > 4: return None
            if mm == '' or mm == 'failed' or mm is None: return None

            # if adjustable
            if dd == '' or dd == 'failed' or dd is None: dd = 15
            if dd == '00' or dd == '0' or dd == 0: dd = 15
            if mm == '00' or mm == '0' or mm == 0: mm = 1
            if len(yyyy) == 3: yyyy = str(int(yyyy))
            
            # process
            return parse_date_str(f'{dd}-{mm}-{yyyy}')
        
        return None
    
    return None


def return_uuidv4():
    return str(uuid.uuid4())


def compute_age_from_dateofbirth(dateofbirth):

    # parse
    dateofbirth = parse_date(dateofbirth)
    
    # validate
    if dateofbirth is None: return None

    # compute
    today = dt.datetime.today()

    # return
    return today.year - dateofbirth.year


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


def get_binary_size(encoded_message):
    return sys.getsizeof(encoded_message)


def to_whatsapp(message, number):

    # build destination
    destination_url = f"https://wa.me/{number}"

    # encode message
    encoded_message = urllib.parse.quote(message)

    # check how big the report is
    report_byte_size = get_binary_size(encoded_message)

    # log binary size
    print(f'INFO: byte size of report: {report_byte_size}')

    # check
    if report_byte_size > 3000: return None

    return f"{destination_url}?text={encoded_message}"


def whatsapp_message(report_date_str, branch_name, summary):

    # generate a unique id
    report_uid_str = return_uuidv4()

    # generate todays date in yyyy-mm-dd hh:mm:ss format
    creation_date_str = dt.datetime.today().strftime('%Y-%m-%d %H:%M:%S')

    # consolidate
    report = f"""
_Report: {report_uid_str}_

\`\`\`•-----------------------------•
|  |\\  /|  |‾‾‾  ‾‾/   |‾‾‾|  |
|  | \\/ |  |---   /    |---|  |
|  |    |  |___  /___  |   |  |
|                             |
|    |‾| |‾ |‾| |‾| |‾| ‾|‾   |
|    |‾\\ |‾ |‾  | | |‾\\  |    |
|         ‾      ‾            |
| Generated on {creation_date_str} |
•-----------------------------•\`\`\`

Name:  *{branch_name}*
Month: *{report_date_str}*

{summary}
"""

    # strip
    report = report.strip()
    
    return report

