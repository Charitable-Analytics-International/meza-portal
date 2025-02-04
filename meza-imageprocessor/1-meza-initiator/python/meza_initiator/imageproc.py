# import config
from .config import JPEG_QUALITY

# import core image processing libs
import numpy as np
import cv2 as cv

# import datatype lib
from .datatype import isStringNonEmpty, isNumber

# import filesystem lib
from .filesystem import fileExists

        
def imread(img_path):
    """
        Loads the image from disk
    """

    # check input
    if not isStringNonEmpty(img_path): return None

    # try to load
    try:
        img_src = cv.imread(img_path)
    except:
        pass

    # check if loaded properly
    if img_src is None or type(img_src) is not np.ndarray: return None

    # check dims
    try:
        height, width, depth = img_src.shape
    except:
        pass

    if not isNumber(width) or not isNumber(height) or not isNumber(depth):
        return None

    return img_src


def imwrite(img_path, img):

    # check input
    if not isStringNonEmpty(img_path): return False
    if img is None or type(img) is not np.ndarray: return False

    # try to write to disk
    try:
        cv.imwrite(img_path, img, [cv.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    except:
        pass
    
    return fileExists(img_path)

