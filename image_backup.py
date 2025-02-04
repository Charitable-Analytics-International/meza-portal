#!/usr/bin/env python3

# Import the required libraries
import argparse
import psycopg2
from datetime import datetime
import os
import zipfile

# Load environment variables from a .env file
from dotenv import load_dotenv
load_dotenv()

# Database connection parameters
DB_NAME = os.getenv("DB_NAME")
DB_USERNAME = os.getenv("DB_USERNAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")


def get_image_path(image_id):
    return f"/home/ubuntu/images/{image_id}/{image_id}.jpg"


def main(min_date, max_date, output_zip):

    # Convert the min date string to a datetime object
    try:
        min_date = datetime.strptime(min_date, "%Y-%m-%d")
    except ValueError:
        print("ERROR: Invalid date format. Use YYYY-MM-DD.")
        return
    
    # Convert the max date string to a datetime object
    try:
        max_date = datetime.strptime(max_date, "%Y-%m-%d")
    except ValueError:
        print("ERROR: Invalid date format. Use YYYY-MM-DD.")
        return
    
    # Check if min_date is less than max_date
    if min_date >= max_date:
        print("ERROR: Min date should be less than max date.")
        return

    # Connect to the PostgreSQL database
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USERNAME,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
    except Exception as e:
        print(f"ERROR: Unable to connect to the database. Details: {e}")
        return

    # Create a cursor and execute the query
    cursor = conn.cursor()
    try:
        # Retrieve image_id, created_at in descending order
        cursor.execute("SELECT id AS image_id, created_at FROM image ORDER BY created_at DESC;")
        rows = cursor.fetchall()
    except Exception as e:
        print(f"ERROR: Could not execute the SELECT query. Details: {e}")
        conn.close()
        return

    # Filter rows where created_at is less than the cutoff date
    filtered_image_ids = []
    for row in rows:
        created_at = row[1]

        # Strip timezone information to make it naive
        if created_at.tzinfo is not None: created_at = created_at.replace(tzinfo=None)

        # Check if the created_at date is within the specified range
        if min_date <= created_at <= max_date:
            filtered_image_ids.append(row[0])

    print(f"Found {len(filtered_image_ids)} images created between {min_date} and {max_date}.")

    # Close database connection
    cursor.close()
    conn.close()

    # Create a ZIP archive of all matching image files
    if not filtered_image_ids:
        print("No images found for the specified date cutoff. Exiting.")
        return

    zip_filename = output_zip
    try:
        with zipfile.ZipFile(zip_filename, "w") as zipf:
            for image_id in filtered_image_ids:
                image_path = get_image_path(image_id)
                if os.path.isfile(image_path):
                    # Add the file to the zip, naming it {image_id}.jpg in the archive
                    arcname = f"{image_id}.jpg"
                    zipf.write(image_path, arcname=arcname)
                    print(f"Added {image_path} to {zip_filename}")
                else:
                    print(f"WARNING: File not found for image_id {image_id} at {image_path}. Skipping.")
        print(f"\nSuccessfully created ZIP archive: {zip_filename}")
    except Exception as e:
        print(f"ERROR: Could not create or write to the ZIP file. Details: {e}")


if __name__ == "__main__":

    # Parse command-line arguments for the cutoff date
    parser = argparse.ArgumentParser(
        description="Fetch image_ids with min_date < image.created_at < max_date, then zip the corresponding .jpg files."
    )
    parser.add_argument(
        "--min-date",
        required=True,
        help="Min date in YYYY-MM-DD format"
    )
    parser.add_argument(
        "--max-date", 
        default=datetime.now().strftime("%Y-%m-%d"),
        help="Max date in YYYY-MM-DD format (default: today)"
    )
    parser.add_argument(
        "--output-zip",
        default="images.zip",
        help="Output ZIP filename (default: images.zip)"
    )
    args = parser.parse_args()

    # Get the command-line arguments
    min_date = args.min_date
    max_date = args.max_date
    output_zip = args.output_zip

    # Call the main function
    main(min_date, max_date, output_zip)
