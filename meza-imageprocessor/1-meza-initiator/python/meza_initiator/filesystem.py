import os

# import datatype lib
from .datatype import isStringNonEmpty, isString


def fileExists(img_path):
    
    # check input
    if not isStringNonEmpty(img_path): return False
    
    # try to read from disk
    _exists = False
    try:
        _exists = os.path.exists(img_path)
    except:
        pass

    return _exists


def fileExtension(img_path):

    # check input
    if not isStringNonEmpty(img_path): return None

    try:
        path, ext = os.path.splitext(img_path)
    except:
        pass

    # check 
    if not isString(ext): return None

    # remove the .
    if len(ext) > 0 and '.' in ext:
        ext = ext[1:] 
    
    return ext


def fileName(img_path):

    # check input
    if not isStringNonEmpty(img_path): return None

    # grab last
    img_name = img_path.split('/')[-1]

    return img_name


def fileNameWithoutExtension(img_path):

    # process string
    img_name = fileName(img_path)
    img_extension = fileExtension(img_path)

    # check
    if img_name is None or img_extension is None: return None

    # if has extension 
    if len(img_extension) > 0:

        # suffix length +1 for the '.'
        suffix_len = len(img_extension) + 1

        # check
        if suffix_len >= len(img_name): return None

        # remove extension from name
        img_name = img_name[:-suffix_len]

    return img_name
