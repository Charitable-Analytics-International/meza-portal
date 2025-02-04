# import basic libs
import json

# import config
from .config import MIN_IMG_WIDTH, MIN_IMG_HEIGHT, MAX_IMG_WIDTH, MAX_IMG_HEIGHT
from .config import PROCESS_IMG_LONGEST_DIM_MIN, PROCESS_IMG_LONGEST_DIM_MAX
from .config import table_template_schema, rectangle_schema
from .config import valid_image_extensions, valid_data_types

# import datatype lib
from .datatype import isNone, isStrInList, isListNonEmpty, isDict

# import filesystem lib
from .filesystem import fileExists, fileExtension

# import image processing lib
from .imageproc_basic import imread, bound_dimensions, resize, cvtToGray, get_table_template_dimensions
from .imageproc_complex import project_rectangles, compute_corners, extract_contours


def are_processing_results_valid(results):

    # check if results contain tables
    has_rectangles = isDict(results) and 'rectangles' in results and isListNonEmpty(results['rectangles'])
    if not has_rectangles: return False

    return True


def process(img, DEBUG=False):

    # init returned dict
    attributes = {
        "height": 0,
        "width": 0,
        "table_template_id": None,
        "rectangles": []
    }

    # extract dimensions
    height = img.shape[0]
    width = img.shape[1]
    attributes['width'] = width
    attributes['height'] = height

    # bound the dimensions of the image to our min/max thresholds
    new_width, new_height, resize_factor = bound_dimensions(width, height, MIN_LENGTH=PROCESS_IMG_LONGEST_DIM_MIN, MAX_LENGTH=PROCESS_IMG_LONGEST_DIM_MAX)

    # resize image to a processable size
    img_resized = resize(img, new_width, new_height)

    # convert to grayscale
    img_resized_gray = cvtToGray(img_resized)

    # extract contours of tables
    contours_resized = extract_contours(img_resized_gray)
    if not isListNonEmpty(contours_resized): return None

    # extract corners of contours
    contours_corners_resized = compute_corners(img_resized_gray, contours_resized)
    if not isListNonEmpty(contours_corners_resized): return None

    # scale corners back to original image
    contours_corners = []
    for contour_corners_resized in contours_corners_resized:

        # resize
        corners = [
            [int(contour_corners_resized[0][0]*(1/resize_factor)), int(contour_corners_resized[0][1]*(1/resize_factor))],
            [int(contour_corners_resized[1][0]*(1/resize_factor)), int(contour_corners_resized[1][1]*(1/resize_factor))],
            [int(contour_corners_resized[2][0]*(1/resize_factor)), int(contour_corners_resized[2][1]*(1/resize_factor))],
            [int(contour_corners_resized[3][0]*(1/resize_factor)), int(contour_corners_resized[3][1]*(1/resize_factor))]
        ]

        # append
        contours_corners.append(corners)

    # sort the contours by area
    contours_corners = sorted(contours_corners, key=lambda x: (x[1][1] - x[0][1]) * (x[2][0] - x[1][0]), reverse=True)

    # get the first
    corners = contours_corners[0]

    # set table template id
    attributes['table_template_id'] = 99

    # init
    default_rectangles = [
        { "id": 0, "h": 10, "w": 10, "x0": 0, "y0": 0, "opts": "", "data_type": "integer" }
    ]

    # project corners
    reprojected_rectangles = project_rectangles(default_rectangles, corners)

    # validate
    if not isListNonEmpty(reprojected_rectangles): return None

    # set projected rectangles
    attributes['rectangles'] = reprojected_rectangles

    return attributes


def run(img_path, json_outpath=None, DEBUG=False):

    """
        1. Validate Image Path
    """

    # check if file exists on disk
    if not fileExists(img_path):
        print("ERROR: Image path input is invalid")
        return None

    # extract file extension
    extension = fileExtension(img_path)

    # check if file extension is a valid image type
    if not isStrInList(extension, valid_image_extensions):
        print("ERROR: Image extension is invalid")
        return None

    """
        2. Validate Image
    """

    # load image
    img_src = imread(img_path)

    # check if successful
    if isNone(img_src):
        print("ERROR: Image could not be loaded")
        return None

    # extract dimensions
    height = img_src.shape[0]
    width = img_src.shape[1]

    # check that the image is not too small nor too big
    if width < MIN_IMG_WIDTH or height < MIN_IMG_HEIGHT:
        print("ERROR: Image is too small")
        return None

    if width > MAX_IMG_WIDTH or height > MAX_IMG_HEIGHT:
        print("ERROR: Image is too big")
        return None

    """
        3. Process Image
    """

    # process
    result = process(img_src, DEBUG=DEBUG)

    # check if failed
    if not isDict(result): return None

    # write results to disk
    if json_outpath is not None:
        with open(json_outpath, 'w+', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=True)

    return result
