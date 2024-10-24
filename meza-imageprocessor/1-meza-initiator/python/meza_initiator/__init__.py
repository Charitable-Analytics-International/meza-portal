# import config
from .config import MIN_IMG_WIDTH, MIN_IMG_HEIGHT, MAX_IMG_WIDTH, MAX_IMG_HEIGHT
from .config import valid_image_extensions

# import datatype lib
from .datatype import isNone, isStrInList

# import filesystem lib
from .filesystem import fileExists, fileExtension

# import image processing lib
from .imageproc import imread, imwrite


def run(img_path):

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
        3. Write file to disk
    """

    # build outpath
    out_path = img_path.replace(extension, 'jpg')

    # write cell
    success = imwrite(out_path, img_src)

    # check
    if success is False: 
        print(f"ERROR: Could not write file {out_path}")
        return None

    return out_path
