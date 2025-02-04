# import config
from .config import JPEG_QUALITY

# import basic libs
import math

# import core image processing libs
import numpy as np
import cv2 as cv

# import datatype lib
from .datatype import isStringNonEmpty, isNumber

# import filesystem lib
from .filesystem import fileExists


def show(img, title='img'):
    """
        Displays image through opencv gui
    """

    cv.imshow(title, img)
    key = cv.waitKey(0)
    cv.destroyAllWindows()
    if key == 27:
        assert False

        
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


def return_blank_canvas(img):

    # extract dimensions
    height = img.shape[0]
    width = img.shape[1]

    if len(img.shape) > 2:
        depth = img.shape[2]
    else:
        depth = 1

    return np.zeros((height, width, depth), dtype=np.uint8)
    

def remap_rectangles_origin_to_corners(x0, y0, w, h):

    # change mapping
    x1 = x0
    y1 = y0
    x2 = x0 + w
    y2 = y0 + h

    return x1, y1, x2, y2


def remap_rectangles_corners_to_origin(x1, y1, x2, y2):

    # change mapping
    x0 = x1
    y0 = y1
    w = x2 - x1
    h = y2 - y1

    return x0, y0, w, h


def bound_dimensions(width, height, MIN_LENGTH, MAX_LENGTH):
    """
        Returns the dimensions of the 
    """

    # init resized dimensions
    resize_factor = 1.0
    new_width = width
    new_height = height

    # set dimensions
    if width >= height:

        if width < MIN_LENGTH:
            # need to stretch
            resize_factor = MIN_LENGTH / float(width)
            new_width = MIN_LENGTH

        elif width > MAX_LENGTH:
            # need to shrink
            resize_factor = MAX_LENGTH / float(width)
            new_width = MAX_LENGTH

        new_height = int( height * resize_factor )

    else:
        if height < MIN_LENGTH:
            # need to stretch
            resize_factor = MIN_LENGTH / float(height)
            new_height = MIN_LENGTH

        elif height > MAX_LENGTH:
            # need to shrink
            resize_factor = MAX_LENGTH / float(height)
            new_height = MAX_LENGTH
        
        new_width = int( width * resize_factor )


    return new_width, new_height, resize_factor


def resize(img, new_width, new_height):
    """
        Resizes an image between the provided bounds and also returns resize factor
    """

    # extract dimensions
    height = img.shape[0]
    width = img.shape[1]

    # copy
    img_resized = img.copy()

    # compute resize factor
    resize_factor = new_width / float(width)

    # resize
    if resize_factor > 1.0:
        img_resized = cv.resize(img_resized, (new_width, new_height), 0, 0, cv.INTER_CUBIC)
    else:
        img_resized = cv.resize(img_resized, (new_width, new_height), 0, 0, cv.INTER_AREA)

    return img_resized


def rotate(img, nbr_of_rotations):
    """
        Rotates image counterclockwise by n number of 90 deg rotations
    """

    # copy
    img_rotated = img.copy()

    for i in range(0, nbr_of_rotations):
        img_rotated = cv.rotate(img_rotated, cv.ROTATE_90_COUNTERCLOCKWISE)

    return img_rotated


def cvtToGray(img):
    """
        Converts the image to grayscale
    """

    # copy
    img_gray = img.copy()

    # convert to grayscale
    img_gray = cv.cvtColor(img_gray, cv.COLOR_BGR2GRAY)

    return img_gray


def cvtToColor(img_gray):

    # copy
    _img_gray = img_gray.copy()

    # convert to grayscale
    img = cv.cvtColor(_img_gray, cv.COLOR_GRAY2BGR)

    return img
    


def normal_info(img_gray):
    """
        Returns the pixel intensity mean and standard deviation of a grayscale image
    """

    # validate input
    if len(img_gray.shape) != 2:
        return None, None

    # reshape image in a 1d vector
    values = img_gray.reshape(-1)

    # compute mean
    mean = np.mean(values)

    # standard deviation
    std = np.std(values)

    return mean, std


def get_edges(img, low_thresh=None, up_thresh=None):
    """
        Returns the image with the canny transformation applied
    """

    # make a copy
    img_edges = img.copy()

    # convert to grayscale
    if len(img_edges.shape) == 3:
        img_edges = cv.cvtColor(img_edges, cv.COLOR_BGR2GRAY)
    
    # apply a light blur
    img_edges = cv.GaussianBlur(img_edges, (5, 5), 0)
    # blur = cv.bilateralFilter(blur, 5, 30, 50)

    # set thresholds
    lower_thresh = 30
    upper_thresh = 120

    # check inputs
    if low_thresh is not None:
        lower_thresh = low_thresh

    if up_thresh is not None:
        upper_thresh = up_thresh

    # canny for edges
    img_edges = cv.Canny(img_edges, lower_thresh, upper_thresh)

    return img_edges


def get_dilated_edges(img, low_thresh=None, up_thresh=None, kernel_size=3, close_lines=True):
    """
        Returns the image with the canny transformation applied and a dilation morphological transformation to connect neighboring lines
    """

    # Get edges
    img_edges = get_edges(img, low_thresh=low_thresh, up_thresh=up_thresh)

    # init kernels
    kernel_rect = cv.getStructuringElement(cv.MORPH_RECT, (kernel_size, kernel_size))

    # dilate intersection points
    img_edges = cv.dilate(img_edges, kernel_rect)

    # close lines
    if close_lines:
        img_edges = cv.morphologyEx(img_edges, cv.MORPH_CLOSE, kernel_rect)

    return img_edges


def get_contours_area_sum(contours):
    """
        Takes a list of contours as input. Accumulates the closed area and return the sum
    """

    # init returned var
    total_areas = 0

    # accumulate area
    for cnt in contours:
        total_areas += cv.contourArea(cnt)

    return total_areas


def get_contours_min_area_rect_sum(contours):
    """
        Takes a list of contours as input. Accumulates the min area rect and return the sum
    """
    
    # init returned var
    total_areas = 0

    # accumulate area
    for cnt in contours:
        _, (min_rect_width, min_rect_height), _ = cv.minAreaRect(cnt)
        total_areas += min_rect_width*min_rect_height

    return total_areas


def get_contour_centroid(contour):
    """
        Returns the contour's centroid using the moments
    """

    M = cv.moments(contour)
    cx = int(M['m10']/(M['m00'] + 0.0000001))
    cy = int(M['m01']/(M['m00'] + 0.0000001))

    return cx, cy


def approx_poly_contour(contour, smooth_factor=0.05):
    """
        Returns a polygon approximation of a closed contour
    """

    # Get contour area
    cnt_area = cv.contourArea(contour)

    # maximum distance from contour to approximated contour
    epsilon = math.sqrt(cnt_area)*smooth_factor

    # Apply Morphological Operation
    contour = cv.approxPolyDP(contour, epsilon, True)

    return contour


def compute_PCA(pts):
    """
        Returns the orientation and center of an ellipse grouping most of a set of points
    """

    sz = len(pts)
    data_pts = np.empty((sz, 2), dtype=np.float64)
    for i in range(data_pts.shape[0]):
        data_pts[i, 0] = pts[i, 0, 0]
        data_pts[i, 1] = pts[i, 0, 1]

    # Perform PCA analysis
    mean = np.empty((0))
    mean, eigenvectors, _ = cv.PCACompute2(data_pts, mean)

    # Store the center of the object
    cntr = (int(mean[0, 0]), int(mean[0, 1]))

    # orientation in radians
    angle = math.atan2(eigenvectors[0, 1], eigenvectors[0, 0])

    return angle, cntr


def draw_lines(img, lines, line_thickness=1, color=(0, 0, 255)):
    """
        Draws lines on the image
    """

    for line in lines:
        p1, p2 = line
        img = cv.line(img, p1, p2, color, line_thickness)

    return img


def draw_circles(img, pts, radius=9, color=(0, 0, 255)):
    """
        Draws circles on the image
    """

    for pt in pts:
        x, y = pt
        img = cv.circle(img, (int(x), int(y)), radius=radius, color=color, thickness=-1)

    return img


def draw_contour(img, contour, color=(0,0,255), thickness=3):
    """
        Draws contour on image
    """
    
    img = cv.drawContours(img, [contour], -1, color=color, thickness=thickness)
    
    return img


def get_table_template_dimensions(table_template):

    # init variables
    width = 0
    height = 0
    
    # go through rectangles
    for rectangle in table_template['rectangles']:

        # grab data
        x0 = rectangle['x0']
        y0 = rectangle['y0']
        w = rectangle['w']
        h = rectangle['h']

        # far point coordinates
        outer_x = x0 + w
        outer_y = y0 + h

        # accumulate 
        if outer_x > width:
            width = outer_x
        if outer_y > height:
            height = outer_y

    return width, height


def get_index_of_nearest_points_in_list(pt, pts_pool, MAX_NBR=1):
    """
        Takes a list of points and a target point and returns the closest point
    """

    # format pool of points
    nodes = [p[0] for p in pts_pool]
    nodes = np.asarray(nodes)

    # difference between the point and the pool of points
    deltas = nodes - np.array(pt)

    # compute distances
    distances = np.einsum('ij,ij->i', deltas, deltas)

    # grab the number to select
    nbr_of_points = MAX_NBR
    if len(distances) <= MAX_NBR:
        nbr_of_points = len(distances)-1
    
    # sort the values by index
    sorted_distances_indexes = np.argpartition(distances, nbr_of_points)

    # get closests
    return list(sorted_distances_indexes[:nbr_of_points])


def get_nearest_points_in_list(pt, pts_pool, MAX_NBR=1):
    """
        Takes a list of points and a target point and returns the closest point
    """

    # grab the nearest points
    indexes = get_index_of_nearest_points_in_list(pt, pts_pool, MAX_NBR=MAX_NBR)

    # get closests
    nearest_pts = []
    for ind in indexes:
        nearest_pts.append(pts_pool[ind][0])

    return nearest_pts


def cosine_similarity(pts1, pts2, width, height):
    """
        Returns the cosine angle between two sets of points
    """

    # center points on the unit circle
    _pts1 = []
    _pts2 = []

    for i in range(0, len(pts1)):

        # grab points
        pt1 = np.array(pts1[i][0])
        pt2 = np.array(pts2[i][0])
        x1, y1 = pt1
        x2, y2 = pt2

        # center points around origin
        x1 = x1 - width/2.0
        x2 = x2 - width/2.0
        y1 = y1 - height/2.0
        y2 = y2 - height/2.0

        # scale points around the origin
        x1 = x1 / float(width)
        x2 = x2 / float(width)
        y1 = y1 / float(height)
        y2 = y2 / float(height)

        # append
        _pts1.append((x1, y1))
        _pts2.append((x2, y2))

    # init
    nume = 0

    for i in range(0, len(_pts1)):

        # grab points
        pt1 = np.array(_pts1[i])
        pt2 = np.array(_pts2[i])

        # accumulate dot product
        nume += np.dot(pt1, pt2)

    # compute denominator
    denom = (np.linalg.norm(_pts1)*np.linalg.norm(_pts2) + 0.00000001)

    cos_sim = nume/denom

    return cos_sim


def retrieve_src_from_projected(M, x1, y1):
    """
        Using the 3x3 transformation matrix, retrieve the original coordinates of a projected point
    """

    # Check dimensions of M
    w, h = np.array(M).shape
    if w != 3 or h != 3:
        print("ERROR: Transformation matrix is not 3x3")
        return None

    # Check values of M
    for val in np.array(M).reshape(-1):
        if abs(val) == 0.0:
            print("ERROR: Transformation matrix value is too small")
            return None

    # Get x
    x = ((M[1][2]*(M[0][1] - M[2][1]*x1))/((M[2][0]*x1 - M[0][0])*(M[2][1]*y1 - M[1][1])) - (M[2][2]*y1*(M[0][1] - M[2][1]*x1))/((M[2][0]*x1 - M[0][0])*(M[2][1]*y1 - M[1][1])) + M[0][2]/(M[2][0]*x1 - M[0][0]) - (M[2][2]*x1)/(M[2][0]*x1 - M[0][0]))/(-(M[1][0]*(M[0][1] - M[2][1]*x1))/((M[2][0]*x1 - M[0][0])*(M[2][1]*y1 - M[1][1])) + (M[2][0]*y1*(M[0][1] - M[2][1]*x1))/((M[2][0]*x1 - M[0][0])*(M[2][1]*y1 - M[1][1])) + 1)

    # Get y
    y = (x*(M[1][0] - y1*M[2][0]) + M[1][2] - y1*M[2][2])/(M[2][1]*y1 - M[1][1])

    return (x, y)
