# import config
from .config import MAX_NBR_TABLES, MIN_NBR_OF_CHILDREN, CLOSENESS_FACTOR, MIN_TABLE_ASPECT_RATIO, MIN_TABLE_AREA, MAX_PERIMETER_AREA, MAX_MIN_AREA_RECT_FRAC, MIN_CONTOUR_AREA_TO_RECT_AREA_RATIO, MAX_CNT_ANGLE_POLY, MAX_CNT_ANGLE_OPEN, LOWER_BOUND_CANNY_THRESH, UPPER_BOUND_CANNY_THRESH, DELTA_CANNY_THRESH, SMOOTH_FACTOR, LINE_GROUP_THICKNESS, MIN_LINE_LENGTH_TABLE_CNT, ANGLE_RESOLUTION, MAX_HORZ_SLOPE, MIN_VERT_SLOPE, MAX_HORZ_SLOPE_CNT, MIN_VERT_SLOPE_CNT, HOUGH_THRESHOLD_MIN, HOUGH_BASIC_LINES_TRESH, HOUGH_KERNEL_SIZE, MAX_LINE_GAP, MIN_NBR_OF_HORZ_LINES, MIN_NBR_OF_VERT_LINES, MIN_LINE_LENGTH, MIN_TABLE_INTERSECTION_POINTS, MAX_RECT_AREA_RATIO_DIFF, HOUGH_SMALL_LINES_TRESH, HOUGH_LONG_LINES_TRESH, MIN_LINE_LENGTH, MIN_CHILD_CONTOUR_AREA_TO_PARENT, MIN_ASPECT_RATIO_TABLE_AND_TABLE_TEMPLATE, PROCESS_TABLE_LONGEST_DIM_MIN, PROCESS_TABLE_LONGEST_DIM_MAX, SIMPLIFICATION_FACTOR, LINES_EXTENSION_FACTOR, MIN_TABLE_TEMPLATE_FIT_SCORE

# import basic libs
import math
from copy import deepcopy

# import core image processing libs
import numpy as np
import cv2 as cv

# import datatype lib
from .datatype import isListNonEmpty, isNumber

# import geometry lib
from .geometry import pts_to_rectangular_lines, angle_between_3_points, distance_point_to_segment, accumulate_contour_angles, is_line_horz, is_line_vert, get_slope_intercept, euclidian_distance, split_points_by_quadrants, get_horz_vert_intersections, return_closest_line_to_point, get_segment_y_at_x, get_segment_x_at_y

# import image processing helper functions
from .imageproc_basic import cvtToColor, draw_circles, show, return_blank_canvas, bound_dimensions, get_contours_area_sum, approx_poly_contour, get_contours_min_area_rect_sum, get_dilated_edges, get_contour_centroid, draw_lines, compute_PCA, get_nearest_points_in_list, cosine_similarity, get_table_template_dimensions, remap_rectangles_origin_to_corners, remap_rectangles_corners_to_origin, retrieve_src_from_projected


def project_rectangles(template_rectangles, corners):

    # init
    rectangles_projected = []

    # go through rectangles
    max_width = 0
    max_height = 0
    points = []
    for rectangle in template_rectangles:

        # unpack
        x0 = rectangle['x0']
        y0 = rectangle['y0']
        w = rectangle['w']
        h = rectangle['h']

        # update
        if x0 + w > max_width: max_width = x0 + w
        if y0 + h > max_height: max_height = y0 + h

        # convert to points
        tl_x = x0
        tl_y = y0
        tr_x = x0 + w
        tr_y = y0
        br_x = x0 + w
        br_y = y0 + h
        bl_x = x0
        bl_y = y0 + h

        # append
        points.append([ [tl_x, tl_y], [tr_x, tr_y], [br_x, br_y], [bl_x, bl_y] ])

    # define source points
    src_points = [ [0, 0], [max_width, 0], [max_width, max_height], [0, max_height]]
            
    # findHomography
    M, _ = cv.findHomography(np.array(src_points), np.array(corners), cv.RANSAC)

    # project points
    for i, point in enumerate(points):

        # init
        coordinates = []

        # loop
        for x, y in point:

            # convert to np array
            d = np.array([[[x, y]]], dtype=np.float32)

            # project
            projected_point = cv.perspectiveTransform(d, M)

            # unpack
            x, y = projected_point[0][0]

            # append
            coordinates.append([x, y])

        # unpack
        tl_x = coordinates[0][0]
        tl_y = coordinates[0][1]
        tr_x = coordinates[1][0]
        tr_y = coordinates[1][1]
        br_x = coordinates[2][0]
        br_y = coordinates[2][1]
        bl_x = coordinates[3][0]
        bl_y = coordinates[3][1]

        # get rectangle
        rectangle = template_rectangles[i]
        data_type = rectangle['data_type']
        opts = rectangle['opts']
        rect_id = rectangle['id']

        # append
        rectangles_projected.append({
            'rect_id': rect_id,
            'data_type': data_type,
            'opts': opts,
            'tl_x': int(tl_x),
            'tl_y': int(tl_y),
            'tr_x': int(tr_x),
            'tr_y': int(tr_y),
            'br_x': int(br_x),
            'br_y': int(br_y),
            'bl_x': int(bl_x),
            'bl_y': int(bl_y)
        })

    return rectangles_projected


def open_contour(contour):
    """
        Sometimes the outside segment of the table is not present in the contour.
        You end up with a bunch of unjoined cell's lines (looks like appendages).
        This function floods those areas by using the convex hull defect lines that
        intersect with the source contour at least 3 times.
    """

    # get the contour's convex hull defects lines
    hull = cv.convexHull(contour, returnPoints=False)

    # lines to add
    to_be_removed_indexes = set()

    if len(hull) > 3:
        try:
            defects = cv.convexityDefects(contour, hull)
            if type(defects) != type(None):
                for defect in defects:

                    start_index, end_index, _, _ = defect[0]

                    # indexes can wrap around 0, so create a continous range list
                    # we dont include the start and end index, we only test the points in the center
                    range_list = []
                    if start_index > end_index:
                        range_list = list(range(start_index+1, len(contour))) + list(range(0, end_index))
                    else:
                        range_list = list(range(start_index+1, end_index))

                    # create a segment with the start and end point
                    start_pt = tuple(contour[start_index][0])
                    end_pt = tuple(contour[end_index][0])
                    defect_line = [start_pt, end_pt]

                    nbr_of_intersions = 0
                    for i in range_list:

                        # grab point
                        pt = contour[i][0]

                        # if there is an intersection
                        dist = distance_point_to_segment(pt, defect_line)
                        if dist < 4:
                            nbr_of_intersions += 1

                    if nbr_of_intersions > 0 or len(range_list) <= 2:

                        # remove the middle points from the final contour
                        for j in range_list:
                            if j not in (start_index, end_index):
                                to_be_removed_indexes.add(j)

        except cv.error:
            pass

    # format returned contour
    final_contour = []
    for i, pt in enumerate(contour):

        if i in to_be_removed_indexes:
            continue
        final_contour.append(pt)

    return np.array(final_contour)


def simplify_contour(img, contour):
    """
        Returns the simplified contour (erodes the little appendages)
    """

    # get image dimensions
    h = img.shape[0]
    w = img.shape[1]

    # get contour area
    cnt_area = get_contours_area_sum([contour])

    # if contour was a square, compute side length
    cnt_square_length = math.sqrt(cnt_area)

    # create the morphological kernel
    kernel_length = int( cnt_square_length * SIMPLIFICATION_FACTOR)
    if kernel_length < 6:
        kernel_length = 6
    kernel = cv.getStructuringElement(cv.MORPH_RECT, (kernel_length, kernel_length))

    # init a black mask
    mask_cnt = np.zeros((h, w, 1), np.uint8)

    # draw open contour and convex hull on mask
    mask_cnt = cv.drawContours(mask_cnt, [contour], -1, color=255, thickness=cv.FILLED)

    # erode and then expand
    mask_cnt = cv.morphologyEx(mask_cnt, cv.MORPH_OPEN, kernel)

    # Get contours
    contours, hierarchy = cv.findContours(mask_cnt, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    # make sure we have contours
    if contours is None or hierarchy is None or len(contours) == 0:
        return None

    # grab contour with max area
    max_cnt_area = 0.0
    max_index = 0
    for i, cnt in enumerate(contours):
        cnt_area = get_contours_area_sum(cnt)
        if cnt_area > max_cnt_area:
            max_cnt_area = cnt_area
            max_index = i
    simplified_contour = contours[max_index]

    return simplified_contour


def validate_contour(contour, img):
    """
        Checks if the contour looks valid based on multiple properties
    """

    # Grab dimensions of image
    height = img.shape[0]
    width = img.shape[1]

    # Get area of image
    area_img = width*height

    # Test 1: Make sure the rough contour has at least 4 points (rectangle)
    if len(contour) < 4:
        return False

    # Test 2: Make sure the polygon approximation has at least 4 points (rectangle)
    poly_cnt = approx_poly_contour(contour, smooth_factor=SMOOTH_FACTOR)
    if len(poly_cnt) < 4:
        return False

    # Test 3 : Aspect Ratio
    _, (min_rect_width, min_rect_height), _ = cv.minAreaRect(poly_cnt)
    aspect_ratio = min([min_rect_width, min_rect_height])/float(max([min_rect_width, min_rect_height]) + 0.0000001)
    if aspect_ratio < MIN_TABLE_ASPECT_RATIO:
        return False

    # Test 4 : Make sure the contour's area as a fraction of the whole image is above the min threshold
    # Get area of contour
    area_cnt = cv.contourArea(contour)
    area_frac = area_cnt/float(area_img)
    if area_frac < MIN_TABLE_AREA:
        return False

    # Test 5 : Make sure the perimeter/surface is under a threshold
    perimeter = cv.arcLength(contour, True)
    perimeter_ratio = perimeter/float(area_cnt)
    if perimeter_ratio > MAX_PERIMETER_AREA:
        return False

    # Test 6 : Angle sum of Poly Contour
    angle_sum_cnt = accumulate_contour_angles(poly_cnt)
    if angle_sum_cnt > MAX_CNT_ANGLE_POLY:
        return False

    # Test 7 : Angle sum of Open Contour
    open_cnt = open_contour(poly_cnt)
    angle_sum_cnt = accumulate_contour_angles(open_cnt)
    if angle_sum_cnt > MAX_CNT_ANGLE_OPEN:
        return False

    return True


def bruteForceFindContour(img, extra_dilate=False):

    # init contour array
    resized_tables_contours = []
    total_min_area_rect_final = math.inf
    total_area_final = math.inf

    # iterate over canny low thresh
    for j in range(LOWER_BOUND_CANNY_THRESH[0], LOWER_BOUND_CANNY_THRESH[1], DELTA_CANNY_THRESH):

        # iterate over canny up thresh
        for i in range(UPPER_BOUND_CANNY_THRESH[0], UPPER_BOUND_CANNY_THRESH[1], DELTA_CANNY_THRESH):

            # iterate over close lines option
            for k in [False, True]:

                # get table contours
                out_contours = get_contours_tables(img, low_thresh=j, up_thresh=i, close_lines=k, extra_dilate=extra_dilate)
                if out_contours is None or len(out_contours) == 0:
                    continue

                # get the value of properties we are trying to optimize
                total_area = get_contours_area_sum(out_contours)
                total_min_area_rect = get_contours_min_area_rect_sum(out_contours)

                # if less contours than previous attempt
                if len(out_contours) < len(resized_tables_contours):

                    # ignore if total area is smaller
                    if total_area < total_area_final:
                        continue

                # if same number of contours has previous attempt
                if len(out_contours) == len(resized_tables_contours):

                    # ignore if total area is smaller
                    if total_area < total_area_final:
                        continue

                    # ignore if total area is similar and min rect area is bigger
                    if abs(total_area - total_area_final) < total_area*(MAX_MIN_AREA_RECT_FRAC - 1):
                        if total_min_area_rect > total_min_area_rect_final*MAX_MIN_AREA_RECT_FRAC:
                            continue

                # update
                resized_tables_contours = out_contours
                total_area_final = total_area
                total_min_area_rect_final = total_min_area_rect

    return resized_tables_contours


def get_contours_tables(img, low_thresh=None, up_thresh=None, close_lines=True, extra_dilate=False):
    """
        Returns all the contours that look like tables in an image
    """

    # Grab dimensions of image
    height = img.shape[0]
    width = img.shape[1]

    # Get edges
    img_edges = get_dilated_edges(img, low_thresh=low_thresh, up_thresh=up_thresh, close_lines=close_lines)

    if extra_dilate:
        # init kernels
        kernel_rect = cv.getStructuringElement(cv.MORPH_RECT, (5, 5))

        # dilate intersection points
        img_edges = cv.dilate(img_edges, kernel_rect)

    # Get contours
    contours, hierarchy = cv.findContours(img_edges, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)

    # make sure we have contours
    if contours is None or hierarchy is None or len(contours) == 0:
        return None

    # opencv wraps it in []
    hierarchy = hierarchy[0]

    # init arrays
    nbr_of_childrens = np.zeros(len(contours))

    # Create an array containing how many times a contour was mentionned as parent
    # hierarchy: [Next, Previous, First_Child, Parent]
    for i, rect in enumerate(hierarchy):

        # get the indexes
        parent_index = rect[3]

        # skip if
        if parent_index < 0:
            continue

        # get this contour
        contour = contours[i]
        contour_parent = contours[parent_index]

        # get the area of the contours
        area = cv.contourArea(contour)
        area_parent = cv.contourArea(contour_parent)

        # get the width & height of the rectangle with minimum area that enclose the contour
        _, (min_rect_width, min_rect_height), _ = cv.minAreaRect(contour)

        # test: if this contour is not "cell-like", ignore
        if area / (1.0 * min_rect_width * min_rect_height) < MIN_CONTOUR_AREA_TO_RECT_AREA_RATIO:
            continue

        # test: must be at least a substantial fraction of the parent contour
        if area / (1.0 * area_parent) < MIN_CHILD_CONTOUR_AREA_TO_PARENT:
            continue

        # increment the counter of the countour referenced as parent
        nbr_of_childrens[parent_index] += 1

    # Sort contours in ascending order
    parent_index_sorted = np.argsort(nbr_of_childrens)

    # init returned variable
    final_contours = []
    final_contours_parents = set()
    final_contours_added = set()

    # --- Group Top with all neighbors ---
    for i in range(1, MAX_NBR_TABLES + 2):
        # info, we iterate over the ~7-12 best table candidates to find the right ones

        # check if index exists
        if i >= len(parent_index_sorted):
            break

        # Get Contour with the most references as parent (this is our most confident table)
        top_index = parent_index_sorted[-i]

        # grab contour
        contour = contours[top_index]

        # grab the number of references as parent
        contour_nbr_of_childrens = nbr_of_childrens[top_index]

        # must have at least this number of children
        if contour_nbr_of_childrens < MIN_NBR_OF_CHILDREN:
            continue

        # Make sure this contour is not the parent of a previous one
        if top_index in final_contours_parents:
            continue

        # Make sure this contour is not the child of a previous added one
        parent_added = False
        parent_index = hierarchy[top_index][3]
        while(parent_index != -1):

            # check if the parent index hasn't been already added
            if parent_index in final_contours_added:
                parent_added = True

            final_contours_parents.add(parent_index)     # append parents of final contour
            parent_index = hierarchy[parent_index][3]

        if parent_added:
            continue

        # simplify contour
        simplified_contour = simplify_contour(img_edges, contour)
        if simplified_contour is None:
            continue

        # Test if the contour looks valid
        if not validate_contour(simplified_contour, img):
            continue

        # add to contours
        final_contours_added.add(top_index)

        # append to final contours
        final_contours.append(simplified_contour)

    return final_contours


def approximate_corners(height, width, contour):
    """
        Returns the 4 best corners candidates from a table contour
    """

    # init a black mask
    mask_cnt = np.zeros((height, width, 1), np.uint8)

    # get the contour's center
    contour_center = get_contour_centroid(contour)

    # get the width & height of the rectangle with minimum area that enclose the contour
    _, (min_rect_width, min_rect_height), _ = cv.minAreaRect(contour)

    # simplify contour using poly
    poly_contour = approx_poly_contour(contour, smooth_factor=SMOOTH_FACTOR)

    # draw open contour and convex hull on mask
    mask_cnt = cv.drawContours(mask_cnt, [poly_contour], -1, color=255, thickness=3)

    """
        Horz Lines
    """

    # compute params
    min_line_length = min_rect_width*MIN_LINE_LENGTH_TABLE_CNT

    # Apply Hough Transform
    lines = cv.HoughLinesP(mask_cnt, 1, ANGLE_RESOLUTION, HOUGH_THRESHOLD_MIN, None, min_line_length, 0)
    if lines is None:
        return None

    # format lines
    horz_lines = []
    for line in lines:

        # grab coordinates
        x1 = line[0][0]
        y1 = line[0][1]
        x2 = line[0][2]
        y2 = line[0][3]

        # create points
        pt1 = (x1, y1)
        pt2 = (x2, y2)

        # only keep horz
        if is_line_horz(pt1, pt2, MAX_HORZ_SLOPE_CNT):

            # append
            horz_lines.append([pt1, pt2])


    """
        Vert Lines
    """

    # compute params
    min_line_length = min_rect_height*MIN_LINE_LENGTH_TABLE_CNT

    # Apply Hough Transform
    lines = cv.HoughLinesP(mask_cnt, 1, ANGLE_RESOLUTION, HOUGH_THRESHOLD_MIN, None, min_line_length, 0)
    if lines is None:
        return None

    # format lines
    vert_lines = []
    for line in lines:

        # grab coordinates
        x1 = line[0][0]
        y1 = line[0][1]
        x2 = line[0][2]
        y2 = line[0][3]

        # create points
        pt1 = (x1, y1)
        pt2 = (x2, y2)

        # only keep vert
        if is_line_vert(pt1, pt2, MIN_VERT_SLOPE_CNT):

            # append
            vert_lines.append([pt1, pt2])


    """
        Intersection of lines
    """

    # find all intersection points when lines are extended
    intersection_points = get_horz_vert_intersections(horz_lines, vert_lines, extension_factor=0.5)

    # validate
    if intersection_points is None or len(intersection_points) < 4:
        print("ERROR: Not enough points to cluster")
        return None

    # for pt in intersection_points:
    #     mask_cnt = cv.circle(mask_cnt, tuple(pt[0]), 10, (255), thickness=-1)

    # split intersection points by quadrant, order in [tl, tr, br, bl]
    quadrant_pts = split_points_by_quadrants(intersection_points, contour_center)
    if quadrant_pts is None:
        print("ERROR: Couldn't order intersections points in the right order")
        return None


    """
        Cluster intersection points using k-means
    """

    corners = []
    for quadrant_pt in quadrant_pts:

        if len(quadrant_pt) == 1:
            corners.append(quadrant_pt[0])
            continue

        # More poles than needed for weird lines
        nbr_of_poles = 3
        if nbr_of_poles > len(quadrant_pt):
            nbr_of_poles = len(quadrant_pt)

        # Whenever 10 iterations of algorithm is ran, or an accuracy of epsilon = 1.0 is reached, stop the algorithm
        criteria = (cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_MAX_ITER, 10, 1.0)

        # convert to np.float32
        Z = np.float32(quadrant_pt)

        # Apply KMeans to find the approximate {nbrOfCorners} corners of the contour
        _, _, centers = cv.kmeans(Z, nbr_of_poles, None, criteria, 10, cv.KMEANS_PP_CENTERS)

        # make sure its valid
        if centers is None or len(centers) != nbr_of_poles:
            continue

        # take the furthest corner (its fine because we then look at the closest on the actual contour)
        max_corner = centers[0]
        max_dist = 0
        for pt in centers:
            dist = euclidian_distance(contour_center, pt)
            if dist > max_dist:
                max_dist = dist
                max_corner = pt
        corners.append(max_corner)

    if len(corners) != 4:
        print("ERROR: Couldn't cluster points")
        return None

    # get the contour points closest to the centers
    #corners = get_best_corners_candidate(corners, contour)

    """
        The top of the table contour tends to be deformed. We lower the y coordinates of the top corners
        by the difference between the lowest point on the contour and the straight line between the corners.
    """

    # note when the top corners point indexes
    tl_index = 0
    tr_index = 0
    for i, pt in enumerate(contour):

        # split
        x, y = pt[0]

        if x == corners[0][0] and y == corners[0][1]:
            tl_index = i

        if x == corners[1][0] and y == corners[1][1]:
            tr_index = i


    # distribute in two arrays the points laying between and outside of the two corners indexes
    i_start = min([tl_index, tr_index])
    i_end = max([tl_index, tr_index])
    splitContour = [[], []]
    min1 = math.inf
    max1 = 0
    min2 = math.inf
    max2 = 0
    for i, pt in enumerate(contour):

        # split
        x, y = pt[0]

        if i >= i_start and i <= i_end:
            splitContour[0].append(pt)
            if y < min1:
                min1 = y
            if y > max1:
                max1 = y

        else:
            splitContour[1].append(pt)
            if y < min2:
                min2 = y
            if y > max2:
                max2 = y

    # set the array containing points who have the least variance in y coordinates as the top line array
    diff1 = max1 - min1
    diff2 = max2 - min2
    topContour = []
    if diff1 > diff2:
        topContour = splitContour[1]
    else:
        topContour = splitContour[0]


    # get slope of top CENTERS
    slope, intercept = get_slope_intercept(corners[0], corners[1])
    max_diff = 0
    for pt in topContour:

        # split
        x, y = pt[0]

        # get y of top straight line between corners
        line_y = slope*x + intercept

        # only if lower
        if line_y > y:
            continue

        # get diff
        diff_y = abs(line_y - y)

        if diff_y > max_diff:
            max_diff = diff_y

    # offset the top corners
    max_diff = math.ceil(max_diff)
    corners[0][1] += max_diff
    corners[1][1] += max_diff

    return corners


def extract_table(img, corners, width, height):
    """
        Extracts a trapezoid from the image and projects it to a rectangle
    """

    # copy img
    table = img.copy()

    src = np.array(corners, dtype="float32")

    dest = np.array([
        [0, 0],
        [width, 0],
        [width, height],
        [0, height]
    ], dtype="float32")

    # Get the transformation matrix
    transform_matrix = cv.getPerspectiveTransform(src, dest)

    # If values in transform matrix are lower than threshold, set to threshold
    # this is because on aws lambda if lower than, it rounds to 0 and breaks the sharder
    for i, row in enumerate(transform_matrix):
        for j, val in enumerate(row):
            if abs(val) < 1e-6:
                transform_matrix[i][j] = 1e-6

    # Apply the transformation on our image
    table = cv.warpPerspective(table, transform_matrix, (width, height))

    return table, transform_matrix


def get_table_horz_vert_lines(table, up_thresh=120, minLineLength=0.3, close_lines=False):
    """
        Returns the horz and vert lines in a table
    """

    # get dimensions
    height = table.shape[0]
    width = table.shape[1]

    # get edges
    edges = get_dilated_edges(table.copy(), low_thresh=20, up_thresh=up_thresh, close_lines=close_lines)

    # init
    horz_lines = []
    vert_lines = []

    # kernels
    vert_kernel = cv.getStructuringElement(cv.MORPH_RECT, (HOUGH_KERNEL_SIZE, 1))
    horz_kernel = cv.getStructuringElement(cv.MORPH_RECT, (1, HOUGH_KERNEL_SIZE))

    # -------------------------------------------------------
    # ---------------- Horizontal Lines ---------------------
    # -------------------------------------------------------

    # erode vert lines
    horzEdges = edges.copy()
    horzEdges = cv.morphologyEx(horzEdges, cv.MORPH_ERODE, vert_kernel)
    horzEdges = cv.morphologyEx(horzEdges, cv.MORPH_OPEN, vert_kernel)
    horzEdges = cv.morphologyEx(horzEdges, cv.MORPH_CLOSE, horz_kernel)

    # Set Parameters
    widthLineLength = int(width*minLineLength)
    lineGap = int(width*MAX_LINE_GAP)
    if lineGap < 4:
        lineGap = 4

    for maxLineGap in [0, lineGap]:

        # Apply Hough Transform
        for thresh in HOUGH_BASIC_LINES_TRESH:

            # compute hough lines
            lines = cv.HoughLinesP(horzEdges, 1, ANGLE_RESOLUTION, thresh, None, minLineLength=widthLineLength, maxLineGap=maxLineGap)
            if lines is None:
                continue

            # Go through each Hough line and only keep the horizontal ones
            temp_horz_lines = []
            for line in lines:

                x1 = line[0][0]
                y1 = line[0][1]
                x2 = line[0][2]
                y2 = line[0][3]

                if is_line_horz((x1, y1), (x2, y2), MAX_HORZ_SLOPE):
                    temp_horz_lines.append([(x1, y1), (x2, y2)])

            # if more than earlier set as new lines
            if len(temp_horz_lines) > len(horz_lines):
                horz_lines = temp_horz_lines

        # get unique lines
        unique_lines = reduce_lines(horz_lines, width, height)

        # if we found horz lines, we break
        if len(unique_lines) > MIN_NBR_OF_HORZ_LINES:
            break

    # add the two borders
    if len(horz_lines) > 0:

        # top
        horz_lines.append([(1, 1), (width-1, 1)])

        # bottom
        horz_lines.append([(1, height-1), (width-1, height-1)])


    # -------------------------------------------------------
    # ------------------ Vertical Lines ---------------------
    # -------------------------------------------------------

    # erode horz lines
    vertEdges = edges.copy()
    vertEdges = cv.morphologyEx(vertEdges, cv.MORPH_ERODE, horz_kernel)
    vertEdges = cv.morphologyEx(vertEdges, cv.MORPH_OPEN, horz_kernel)
    vertEdges = cv.morphologyEx(vertEdges, cv.MORPH_CLOSE, vert_kernel)

    # set parameter
    vertLineLength = int(height*minLineLength)
    lineGap = int(height*MAX_LINE_GAP)
    if lineGap < 4:
        lineGap = 4

    for maxLineGap in [0, lineGap]:

        # Apply Hough Transform
        for thresh in HOUGH_BASIC_LINES_TRESH:

            # compute probabilistic hough lines
            lines = cv.HoughLinesP(vertEdges, 1, ANGLE_RESOLUTION, thresh, lines=None, minLineLength=vertLineLength, maxLineGap=maxLineGap)
            if lines is None:
                continue

            # Go through each Hough line and only keep the horizontal ones
            temp_vert_lines = []
            for line in lines:

                x1 = line[0][0]
                y1 = line[0][1]
                x2 = line[0][2]
                y2 = line[0][3]

                if is_line_vert((x1, y1), (x2, y2), MIN_VERT_SLOPE):
                    temp_vert_lines.append([(x1, y1), (x2, y2)])


            # if more than earlier set as new lines
            if len(temp_vert_lines) > len(vert_lines):
                vert_lines = temp_vert_lines


        # get unique lines
        unique_lines = reduce_lines(vert_lines, width, height)

        # if we found horz lines, we break
        if len(unique_lines) > MIN_NBR_OF_VERT_LINES:
            break


    # add the two borders
    if len(vert_lines) > 0:

        # left
        vert_lines.append([(1, 1), (1, height-1)])

        # right
        vert_lines.append([(width-1, 1), (width-1, height-1)])


    return horz_lines, vert_lines


def reduce_lines(lines, width, height):
    """
        Remove duplicate lines
    """

    # create a mask
    src_mask = np.zeros((height, width, 1), np.uint8)
    src_mask = draw_lines(src_mask, lines, line_thickness=LINE_GROUP_THICKNESS, color=(255))

    # dims
    height = src_mask.shape[0]
    width = src_mask.shape[1]

    # Get contours
    contours, _ = cv.findContours(src_mask, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)
    if contours is None or len(contours) == 0:
        return []

    # go through lines
    new_lines = []
    for cnt in contours:

        # get the width & height of the rectangle with minimum area that enclose the contour
        _, (min_rect_width, min_rect_height), _ = cv.minAreaRect(cnt)
        max_cnt_length = max([min_rect_width, min_rect_height])

        # create a mask
        mask = np.zeros((height, width, 1), np.uint8)
        mask = cv.drawContours(mask, [cnt], -1, (255), -1)

        # append all white pixel coordinates to an array
        white_pixels = cv.findNonZero(mask)

        # compute PCA
        angle, center = compute_PCA(white_pixels)

        # compute segment
        r = max_cnt_length/2.0
        q1 = (int(center[0] + r*math.cos(angle)), int(center[1] + r*math.sin(angle)))
        p1 = (int(center[0] + r*math.cos(angle+math.pi)), int(center[1] + r*math.sin(angle+math.pi)))

        # add vert
        new_lines.append([(p1[0], p1[1]), (q1[0], q1[1])])

    return new_lines


def group_lines(horz_lines, vert_lines, width, height):
    """
        Groups segments if they seem to be part of the same line
    """

    # Reduce horz lines
    new_horz = reduce_lines(horz_lines, width, height)

    # Reduce vert lines
    new_vert = reduce_lines(vert_lines, width, height)

    """
        Filter Horz lines
    """

    final_horz = []
    for line in new_horz:

        # split
        p1, p2 = line

        # distance test
        if euclidian_distance(p1, p2) < MIN_LINE_LENGTH*width:
            continue

        # slope test
        if not is_line_horz(p1, p2, MAX_HORZ_SLOPE):
            continue

        # append
        final_horz.append(line)

    """
        Filter Vert lines
    """

    final_vert = []
    for line in new_vert:

        # split
        p1, p2 = line

        # distance test
        if euclidian_distance(p1, p2) < MIN_LINE_LENGTH*height:
            continue

        # slope test
        if not is_line_vert(p1, p2, MIN_VERT_SLOPE):
            continue

        # append
        final_vert.append(line)


    return final_horz, final_vert


def score_table_template_fit(table_intersection_points, template_intersection_points, width, height):

    # Test 1 : If there is just too few points
    if len(table_intersection_points) <= len(template_intersection_points)*MIN_TABLE_INTERSECTION_POINTS:
        return 0.0

    """
        How well do table intersection points match with the template intersection points
    """

    # get the template intersection points closest to the table
    analog_pts = []
    for pt in table_intersection_points:
        analog_pt = get_nearest_points_in_list(pt[0], template_intersection_points, MAX_NBR=1)[0]
        analog_pts.append([analog_pt])

    # compute cosine similarity
    cos_sim = cosine_similarity(table_intersection_points, analog_pts, width, height)

    # normalize
    table_fit_score = (cos_sim + 1)/2.0

    """
        (Inverse) How well do template intersection points match with the table intersection points
    """

    # get the template intersection points closest to the table
    analog_pts = []
    for pt in template_intersection_points:
        analog_pt = get_nearest_points_in_list(pt[0], table_intersection_points, MAX_NBR=1)[0]
        analog_pts.append([analog_pt])

    # compute cosine similarity
    cos_sim = cosine_similarity(template_intersection_points, analog_pts, width, height)

    # normalize
    template_fit_score = (cos_sim + 1)/2.0

    """
        Combine the two scores
    """
    composite_score = (template_fit_score + table_fit_score)/2.0

    return composite_score


def scale_table_template(table_template, width, height):

    # copy template
    scaled_table_template = deepcopy(table_template)

    # get table template dimensions
    template_width, template_height = get_table_template_dimensions(table_template)

    # resize the rects to fit the target width/heigh
    width_ratio = width / float(template_width)
    height_ratio = height / float(template_height)

    # get aspect ratio
    aspect_ratio = template_width / float(template_height)

    # set height if not provided
    if height is None:
        height = int( width / float(aspect_ratio) )

    # go through and scale
    for i, rectangle in enumerate(scaled_table_template['rectangles']):

        # compute new coordinates
        x0 = int(rectangle['x0'] * width_ratio)
        y0 = int(rectangle['y0'] * height_ratio)
        w = int(rectangle['w'] * width_ratio)
        h = int(rectangle['h'] * height_ratio)

        # update
        scaled_table_template['rectangles'][i]['x0'] = x0
        scaled_table_template['rectangles'][i]['y0'] = y0
        scaled_table_template['rectangles'][i]['w'] = w
        scaled_table_template['rectangles'][i]['h'] = h

        # if AOI,
        if 'aoi' in rectangle:

            # compute new coordinates
            x0 = int(rectangle['aoi']['x0'] * width_ratio)
            y0 = int(rectangle['aoi']['y0'] * height_ratio)
            w = int(rectangle['aoi']['w'] * width_ratio)
            h = int(rectangle['aoi']['h'] * height_ratio)

            # update
            scaled_table_template['rectangles'][i]['aoi']['x0'] = x0
            scaled_table_template['rectangles'][i]['aoi']['y0'] = y0
            scaled_table_template['rectangles'][i]['aoi']['w'] = w
            scaled_table_template['rectangles'][i]['aoi']['h'] = h

    return scaled_table_template


def get_rectangles_intersections(rectangles):

    # init empty set
    intersection_points = set()

    for rectangle in rectangles:

        # grab (x, y) of both corner
        x0 = rectangle['x0']
        y0 = rectangle['y0']
        w = rectangle['w']
        h = rectangle['h']

        # change mapping
        x1, y1, x2, y2 = remap_rectangles_origin_to_corners(x0, y0, w, h)

        # 4 corners
        corner1 = (x1, y1)
        corner2 = (x1, y2)
        corner3 = (x2, y1)
        corner4 = (x2, y2)

        # add
        intersection_points.add(corner1)
        intersection_points.add(corner2)
        intersection_points.add(corner3)
        intersection_points.add(corner4)

    # convert to list
    intersection_points = list(intersection_points)

    # format properly
    for i, pt in enumerate(intersection_points):
        x, y = pt
        intersection_points[i] = [[x,y]]

    return intersection_points


def fitUsingHough(to_be_fitted_rectangles, horz_lines, vert_lines, FACTOR):
    """
        Fit rects using nearby hough lines
    """

    # index of valid hough lines
    valid_horz_lines = []
    valid_vert_lines = []

    # go through rects
    for i, rectangle in enumerate(to_be_fitted_rectangles):

        # grab rect position
        x0 = rectangle['x0']
        y0 = rectangle['y0']
        w = rectangle['w']
        h = rectangle['h']

        # find middle points
        mid_x = x0 + w/2.0
        mid_y = y0 + h/2.0

        # change mapping
        x1, y1, x2, y2 = remap_rectangles_origin_to_corners(x0, y0, w, h)

        # spacing
        minColSpacing = w*FACTOR
        minRowSpacing = h*FACTOR

        # find the closest hough line to the midde point of each rectangle side
        top_line_index = return_closest_line_to_point((mid_x, y1), horz_lines, minRowSpacing)
        bottom_line_index = return_closest_line_to_point((mid_x, y2), horz_lines, minRowSpacing)
        left_line_index = return_closest_line_to_point((x1, mid_y), vert_lines, minColSpacing)
        right_line_index = return_closest_line_to_point((x2, mid_y), vert_lines, minColSpacing)

        # new pos
        new_x1 = x1
        new_y1 = y1
        new_x2 = x2
        new_y2 = y2

        x1_fitted = False
        y1_fitted = False
        x2_fitted = False
        y2_fitted = False

        x_validated = False
        y_validated = False

        # top
        if top_line_index is not None:
            line = horz_lines[top_line_index]

            _new_y1 = get_segment_y_at_x(mid_x, line)

            if _new_y1 is not None:
                new_y1 = _new_y1
                y1_fitted = True
                valid_horz_lines.append(top_line_index)

        # bottom
        if bottom_line_index is not None:
            line = horz_lines[bottom_line_index]

            _new_y2 = get_segment_y_at_x(mid_x, line)

            if _new_y2 is not None:
                new_y2 = _new_y2
                y2_fitted = True
                valid_horz_lines.append(bottom_line_index)

        # left
        if left_line_index is not None:
            line = vert_lines[left_line_index]

            _new_x1 = get_segment_x_at_y(mid_y, line)

            if _new_x1 is not None:
                new_x1 = _new_x1
                x1_fitted = True
                valid_vert_lines.append(left_line_index)

        # right
        if right_line_index is not None:
            line = vert_lines[right_line_index]

            _new_x2 = get_segment_x_at_y(mid_y, line)

            if _new_x2 is not None:
                new_x2 = _new_x2
                x2_fitted = True
                valid_vert_lines.append(right_line_index)

        # change mapping
        new_x0, new_y0, new_w, new_h = remap_rectangles_corners_to_origin(new_x1, new_y1, new_x2, new_y2)

        # update
        if new_x1 != new_x2 and new_x2 > new_x1:
            to_be_fitted_rectangles[i]['x0'] = new_x0
            to_be_fitted_rectangles[i]['w'] = new_w
            x_validated = True

        if new_y1 != new_y2 and new_y2 > new_y1:
            to_be_fitted_rectangles[i]['y0'] = new_y0
            to_be_fitted_rectangles[i]['h'] = new_h
            y_validated = True

        # if all fitted
        to_be_fitted_rectangles[i]['fitted'] = (x1_fitted and y1_fitted and x2_fitted and y2_fitted and x_validated and y_validated)

    # grab unique lines
    valid_horz_lines = list(set(valid_horz_lines))
    valid_vert_lines = list(set(valid_vert_lines))
    valid_horz_lines = [horz_lines[ind] for ind in valid_horz_lines]
    valid_vert_lines = [vert_lines[ind] for ind in valid_vert_lines]

    return to_be_fitted_rectangles, valid_horz_lines, valid_vert_lines


def are_rectangles_adjacent(rectangle_1, rectangle_2):

    # constants
    MIN_DIST = 4

    # grab position of rectangle 1
    x0_1 = rectangle_1['x0']
    y0_1 = rectangle_1['y0']
    w_1 = rectangle_1['w']
    h_1 = rectangle_1['h']

    # get middle point
    mid_x_1 = x0_1 + w_1/2.0
    mid_y_1 = y0_1 + h_1/2.0

    # change mapping
    x1_1, y1_1, x2_1, y2_1 = remap_rectangles_origin_to_corners(x0_1, y0_1, w_1, h_1)


    # grab position of rectangle 2
    x0_2 = rectangle_2['x0']
    y0_2 = rectangle_2['y0']
    w_2 = rectangle_2['w']
    h_2 = rectangle_2['h']

    # get middle point
    mid_x_2 = x0_2 + w_2/2.0
    mid_y_2 = y0_2 + h_2/2.0

    # change mapping
    x1_2, y1_2, x2_2, y2_2 = remap_rectangles_origin_to_corners(x0_2, y0_2, w_2, h_2)


    # if same, False
    if mid_x_1 == mid_x_2 and mid_y_1 == mid_y_2: return False, None

    # connected by the right wall of the cell
    if abs(mid_y_1 - mid_y_2) < MIN_DIST and abs(x2_1 - x1_2) < MIN_DIST:
        return True, 'r'

    # connected by the left wall of the cell
    if abs(mid_y_1 - mid_y_2) < MIN_DIST and abs(x1_1 - x2_2) < MIN_DIST:
        return True, 'l'

    # connected by the bottom wall of the cell
    if abs(mid_x_1 - mid_x_2) < MIN_DIST and abs(y2_1 - y1_2) < MIN_DIST:
        return True, 'b'

    # connected by the top wall of the cell
    if abs(mid_x_1 - mid_x_2) < MIN_DIST and abs(y1_1 - y2_2) < MIN_DIST:
        return True, 't'

    return False, None


def get_adjacent_rectangles_index(rectangle, rectangles):
    """
        Returns all the rectangles that have a common border with the rectangle
    """

    # init list
    index_of_neighbors = []

    # get the index of all template rectangles with adjacent borders
    for i, _rectangles in enumerate(rectangles):

        # check if adjacent
        adjacent, _ = are_rectangles_adjacent(rectangle, _rectangles)

        # if it is, append
        if adjacent:
            index_of_neighbors.append(i)

    # remove duplicate ids
    index_of_neighbors = list(set(index_of_neighbors))

    return index_of_neighbors


def relative_position_of_rect(rect_center, rect_adjacent):
    """
        returns [0: to the right, 1: to the top, 2: to the left, 3: to the bottom, or None if inconclusive
    """

    # center
    cx = rect_center['x0'] + (rect_center['w'] / 2.0)
    cy = rect_center['y0'] + (rect_center['h'] / 2.0)

    # center
    _cx = rect_adjacent['x0'] + (rect_adjacent['w'] / 2.0)
    _cy = rect_adjacent['y0'] + (rect_adjacent['h'] / 2.0)
    
    # angle 
    angle_in_rad = angle_between_3_points((cx + 100, cy), (cx, cy), (_cx, _cy))

    # find the number of 90 deg turns
    nbr_of_90 = angle_in_rad / (3.1415926 / 2.0)

    # has to be within 10% of the exact number of turns
    delta = abs(nbr_of_90 - round(nbr_of_90))
    max_delta = (3.1415926 / 2.0) * 0.1
    if delta > max_delta: return None
    
    # round
    nbr_of_90 = round(nbr_of_90)

    # add Pi if adjacent is in the bottom quadrants
    if _cy > cy and nbr_of_90 == 1:
        nbr_of_90 = 3
        
    return nbr_of_90


def fitUsingNeighbours(to_be_fitted_rectangles, template_rectangles):
    """
        Look at unfitted rects and match to neighboring fitted rects
    """

    # split the fitted & unfitted rectangles
    fitted_rectangles_index = [i for i, rectangle in enumerate(to_be_fitted_rectangles) if 'fitted' in rectangle and rectangle['fitted'] == True]
    unfitted_rectangles_index = [i for i, rectangle in enumerate(to_be_fitted_rectangles) if 'fitted' not in rectangle or rectangle['fitted'] == False]

    # go through unfitted rectangles and try to fit using adjacent fitted rectangles
    for i in unfitted_rectangles_index:

        # grab unfitted rectangle
        unfitted_rectangle = to_be_fitted_rectangles[i]

        # grab corresponding template rectangle
        template_rectangle = template_rectangles[i]

        # get the index of all adjacent rectangles
        adjacent_rectangles_index = get_adjacent_rectangles_index(template_rectangle, template_rectangles)

        # only keep the index of adjacent rectangles that have been fitted
        adjacent_fitted_rectangles_index = [_i for _i in adjacent_rectangles_index if 'fitted' in to_be_fitted_rectangles[_i] and to_be_fitted_rectangles[_i]['fitted'] == True]

        # skip if none
        if len(adjacent_fitted_rectangles_index) == 0: continue

        # grab current position
        x0 = unfitted_rectangle['x0']
        y0 = unfitted_rectangle['y0']
        w = unfitted_rectangle['w']
        h = unfitted_rectangle['h']

        # init new positions
        new_x0 = x0
        new_y0 = y0
        new_w = w
        new_h = h

        for j in range(0, 3):
            for _i in adjacent_fitted_rectangles_index:

                # grab adjacent rect
                _rectangle = to_be_fitted_rectangles[_i]

                # find position
                nbr_of_90_turn = relative_position_of_rect(unfitted_rectangle, _rectangle)
                if not isNumber(nbr_of_90_turn): continue

                # get cell corners
                _h = _rectangle['h']
                _w = _rectangle['w']
                _x0 = _rectangle['x0']
                _y0 = _rectangle['y0']
                
                # adjust line
                if nbr_of_90_turn == 0:
                    new_w = _x0 - x0
                elif nbr_of_90_turn == 1:
                    new_y0 = _y0 + _h
                elif nbr_of_90_turn == 2:
                    new_x0 = _x0 + _w
                elif nbr_of_90_turn == 3:
                    new_h = _y0 - y0

        # compute max delta
        max_x_delta = template_rectangle['w'] * CLOSENESS_FACTOR
        max_y_delta = template_rectangle['h'] * CLOSENESS_FACTOR

        # update
        if abs(x0 - new_x0) < max_x_delta:
            to_be_fitted_rectangles[i]['x0'] = new_x0
        if abs(w - new_w) < max_x_delta:
            to_be_fitted_rectangles[i]['w'] = new_w
        if abs(y0 - new_y0) < max_y_delta:
            to_be_fitted_rectangles[i]['y0'] = new_y0
        if abs(h - new_h) < max_y_delta:
            to_be_fitted_rectangles[i]['h'] = new_h

    return to_be_fitted_rectangles


def fitRects(table, template_rectangles, horz_lines, vert_lines):

    # grab dimensions
    height = table.shape[0]
    width = table.shape[1]

    # create a copy of the rectangles
    to_be_fitted_rectangles = [deepcopy(rect) for rect in template_rectangles]

    """
        First fit using raw hough lines
    """

    # fit using hough lines
    to_be_fitted_rectangles, horz_lines, vert_lines = fitUsingHough(to_be_fitted_rectangles, horz_lines, vert_lines, CLOSENESS_FACTOR)

    # fit using neighbors
    for i in range(0, 2):
        to_be_fitted_rectangles = fitUsingNeighbours(to_be_fitted_rectangles, template_rectangles)

    """
        Make sure the fitted rects are at least close to the area occupied by the template equivalent
    """

    # rect corners
    for i, rectangle in enumerate(to_be_fitted_rectangles):

        # grab data of adjusted rect
        fitted = rectangle['fitted']
        x0 = rectangle['x0']
        y0 = rectangle['y0']
        w = rectangle['w']
        h = rectangle['h']
        rect_area = w * h

        # grab data of template rect
        template_rectangle = template_rectangles[i]
        x0_t = template_rectangle['x0']
        y0_t = template_rectangle['y0']
        w_t = template_rectangle['w']
        h_t = template_rectangle['h']
        rect_area_t = w_t * h_t

        # skip
        if fitted == False: continue
        if rect_area_t <= 1: continue

        # ratio
        rect_area_ratio = abs(1 - ( rect_area / float(rect_area_t) ))

        # check if within
        if rect_area_ratio > MAX_RECT_AREA_RATIO_DIFF:
            to_be_fitted_rectangles[i]['fitted'] = False
            to_be_fitted_rectangles[i]['x0'] = x0_t
            to_be_fitted_rectangles[i]['y0'] = y0_t
            to_be_fitted_rectangles[i]['w'] = w_t
            to_be_fitted_rectangles[i]['h'] = h_t

    """
        Make sure the points don't fall out of the table
    """

    for i, rectangle in enumerate(to_be_fitted_rectangles):

        # grab data of adjusted rect
        x0 = rectangle['x0']
        y0 = rectangle['y0']
        w = rectangle['w']
        h = rectangle['h']

        # change mapping
        x1 = x0
        y1 = y0
        x2 = x0 + w
        y2 = y0 + h

        # check
        if x2 < 0 or y2 < 0 or x1 > width or y1 > height or x1 == x2 or y1 == y2:
            print('ERROR: Invalid cell size after fit')
            return None

        # init
        new_x1 = x1
        new_y1 = y1
        new_x2 = x2
        new_y2 = y2

        # adjust
        if x1 < 0:
            new_x1 = 0
        if y1 < 0:
            new_y1 = 0
        if x2 > width:
            new_x2 = width
        if y2 > height:
            new_y2 = height

        # update
        to_be_fitted_rectangles[i]['x0'] = new_x1
        to_be_fitted_rectangles[i]['y0'] = new_y1
        to_be_fitted_rectangles[i]['w'] = new_x2 - new_x1
        to_be_fitted_rectangles[i]['h'] = new_y2 - new_y1

    return to_be_fitted_rectangles


def fitAOI(fitted_rectangle, template_rectangle):

    # grab coordinates of template rectangle
    x0_template = template_rectangle['x0']
    y0_template = template_rectangle['y0']
    w_template = template_rectangle['w']
    h_template = template_rectangle['h']

    # grab coordinates of aoi of template rectangle
    x0_aoi_template = template_rectangle['aoi']['x0']
    y0_aoi_template = template_rectangle['aoi']['y0']
    w_aoi_template = template_rectangle['aoi']['w']
    h_aoi_template = template_rectangle['aoi']['h']

    # grab coordinates of fitted rectangle
    x0_fitted = fitted_rectangle['x0']
    y0_fitted = fitted_rectangle['y0']
    w_fitted = fitted_rectangle['w']
    h_fitted = fitted_rectangle['h']

    # change mapping
    x1_template, y1_template, x2_template, y2_template = remap_rectangles_origin_to_corners(x0_template, y0_template, w_template, h_template)
    x1_aoi_template, y1_aoi_template, x2_aoi_template, y2_aoi_template = remap_rectangles_origin_to_corners(x0_aoi_template, y0_aoi_template, w_aoi_template, h_aoi_template)
    x1_fitted, y1_fitted, x2_fitted, y2_fitted = remap_rectangles_origin_to_corners(x0_fitted, y0_fitted, w_fitted, h_fitted)

    # get the ratio of the aoi rectangle length over the original rectangle length
    w_aoi_ratio = w_aoi_template / float( w_template )
    h_aoi_ratio = h_aoi_template / float( h_template )

    # fitted
    w_aoi_fitted = w_aoi_ratio * w_fitted
    h_aoi_fitted = h_aoi_ratio * h_fitted

    # init new position
    new_x0 = x0_fitted
    new_y0 = y0_fitted
    new_w = w_aoi_fitted
    new_h = h_aoi_fitted

    if abs(x1_template - x1_aoi_template) > 1:
        # left side of aoi and rectangle are not touching
        new_x0 = x2_fitted - w_aoi_fitted

    elif abs(y1_template - y1_aoi_template) > 1:
        # top side of aoi and rectangle are not touching
        new_y0 = y2_fitted - h_aoi_fitted

    return new_x0, new_y0, new_w, new_h


def cropAOIRects(fitted_rectangles, template_rectangles):

    # split the rectangles with a AOI
    aoi_rectangles_index = [i for i, rectangle in enumerate(template_rectangles) if 'aoi' in rectangle]

    # update the coordinates of the rectangles with AOI
    for i in aoi_rectangles_index:

        # grab rectangles
        fitted_rectangle = fitted_rectangles[i]
        template_rectangle = template_rectangles[i]

        # fit aoi
        aoi_x0, aoi_y0, aoi_w, aoi_h = fitAOI(fitted_rectangle, template_rectangle)

        # update
        fitted_rectangles[i]['x0'] = aoi_x0
        fitted_rectangles[i]['y0'] = aoi_y0
        fitted_rectangles[i]['w'] = aoi_w
        fitted_rectangles[i]['h'] = aoi_h

    return fitted_rectangles


def reprojRects(table, rectangles, transform_matrix):

    # get dimensions
    height = table.shape[0]
    width = table.shape[1]

    # init
    reproj_rects = []
    min_x = math.inf
    min_y = math.inf
    max_x = 0
    max_y = 0

    # go through db rectangles and reproject them on source image using transform matrix
    for rectangle in rectangles:

        # grab data of adjusted rect
        rect_id = rectangle['id']
        x0 = rectangle['x0']
        y0 = rectangle['y0']
        w = rectangle['w']
        h = rectangle['h']

        # change mapping
        x1, y1, x2, y2 = remap_rectangles_origin_to_corners(x0, y0, w, h)

        # reproject
        tl_pt = retrieve_src_from_projected(transform_matrix, x1, y1)
        tr_pt = retrieve_src_from_projected(transform_matrix, x2, y1)
        br_pt = retrieve_src_from_projected(transform_matrix, x2, y2)
        bl_pt = retrieve_src_from_projected(transform_matrix, x1, y2)
        if tl_pt is None or tr_pt is None or br_pt is None or bl_pt is None:
            print("ERROR: Couldn't reproject rectangle")
            return None

        # split
        tl_x, tl_y = tl_pt
        tr_x, tr_y = tr_pt
        br_x, br_y = br_pt
        bl_x, bl_y = bl_pt

        # round
        tl_x = int(tl_x)
        tl_y = int(tl_y)
        tr_x = int(tr_x)
        tr_y = int(tr_y)
        br_x = int(br_x)
        br_y = int(br_y)
        bl_x = int(bl_x)
        bl_y = int(bl_y)

        # update min
        if tl_x < min_x:
            min_x = tl_x
        if bl_x < min_x:
            min_x = bl_x
        if tr_y < min_y:
            min_y = tr_y
        if tl_y < min_y:
            min_y = tl_y

        # update max
        if tr_x > max_x:
            max_x = tr_x
        if br_x > max_x:
            max_x = br_x
        if br_y > max_y:
            max_y = br_y
        if bl_y > max_y:
            max_y = bl_y

        # new cell
        cell = {
            'rect_id': rect_id,
            'tl_x': tl_x,
            'tl_y': tl_y,
            'tr_x': tr_x,
            'tr_y': tr_y,
            'bl_x': bl_x,
            'bl_y': bl_y,
            'br_x': br_x,
            'br_y': br_y,
            'x0': x1/float(width),
            'y0': y1/float(height),
            'w': w/float(width),
            'h': h/float(height)
        }

        # set info
        cell['data_type'] = rectangle['data_type']
        cell['opts'] = rectangle['opts']

        # append to array
        reproj_rects.append(cell)


    # check
    if max_x == 0 or max_y == 0 or min_x >= max_x or min_y >= max_y:
        print('ERROR: Invalid table size')
        return None

    # get max width height
    max_width = max_x - min_x
    max_height = max_y - min_y

    # round
    max_width = int(max_width)
    max_height = int(max_height)

    # go through reprojected rects and scale to max width/height of source table
    for i, rect in enumerate(reproj_rects):
        reproj_rects[i]['x0'] = int(rect['x0']*max_width)
        reproj_rects[i]['y0'] = int(rect['y0']*max_height)
        reproj_rects[i]['w'] = int(rect['w']*max_width)
        reproj_rects[i]['h'] = int(rect['h']*max_height)

        # go through rects and validate
        if reproj_rects[i]['h'] < 2 or reproj_rects[i]['w'] < 2:
            print('ERROR: Invalid cell size')
            return None

        # make sure it's not over the dim
        if reproj_rects[i]['x0'] > max_width:
            reproj_rects[i]['x0'] = max_width

        if reproj_rects[i]['y0'] > max_height:
            reproj_rects[i]['y0'] = max_height

        if reproj_rects[i]['x0'] + reproj_rects[i]['w'] > max_width:
            reproj_rects[i]['w'] = max_width - reproj_rects[i]['x0']

        if reproj_rects[i]['y0'] + reproj_rects[i]['h'] > max_height:
            reproj_rects[i]['h'] = max_height - reproj_rects[i]['y0']

    return (reproj_rects, max_width, max_height)


def extract_contours(img):
    """
        Find the contours of elements that look like tables
    """

    # find contours
    contours = bruteForceFindContour(img, extra_dilate=False)

    # try again with dilation
    if len(contours) == 0:
        contours = bruteForceFindContour(img, extra_dilate=True)

    # if failed
    if not isListNonEmpty(contours):
        print("ERROR: No contours could be found")
        return None

    return contours


def compute_corners(img, contours):
    """
        Extract the corners of each contour
    """

    # extract dimensions
    height = img.shape[0]
    width = img.shape[1]

    # init variables
    contours_corners = []

    # go through contours
    for contour in contours:

        # compute corners
        corners = approximate_corners(height, width, contour)

        # check
        if not isListNonEmpty(corners) or len(corners) != 4:
            continue

        # append
        contours_corners.append(corners)

    # check if we have corners
    if not isListNonEmpty(contours_corners):
        print("ERROR: No corners of contours could be found")
        return None

    return contours_corners


def extract_tables(img, tables_corners):

    # init variables
    tables_transform_matrix = []
    tables = []

    for table_corners in tables_corners:

        # get approximate table dimensions
        bottom_width = abs(table_corners[2][0] - table_corners[3][0])
        top_width = abs(table_corners[1][0] - table_corners[0][0])
        left_height = abs(table_corners[3][1] - table_corners[0][1])
        right_height = abs(table_corners[2][1] - table_corners[1][1])

        # set average as dimension
        width = int((top_width + bottom_width)/2.0)
        height = int((left_height + right_height)/2.0)

        # bound the dimensions of the image to our min/max thresholds
        new_width, new_height, resize_factor = bound_dimensions(width, height, MIN_LENGTH=PROCESS_TABLE_LONGEST_DIM_MIN, MAX_LENGTH=PROCESS_TABLE_LONGEST_DIM_MAX)

        # remap
        table, transform_matrix = extract_table(img, table_corners, new_width, new_height)

        # append
        tables.append(table)
        tables_transform_matrix.append(transform_matrix)

    return tables, tables_transform_matrix


def compute_hough_lines(img):

    # extract dimensions
    height = img.shape[0]
    width = img.shape[1]

    # init list containing hough lines
    horz_lines = []
    vert_lines = []

    # compute Hough for small Lines
    for lines_threshold in HOUGH_SMALL_LINES_TRESH:
        temp_horz_lines, temp_vert_lines = get_table_horz_vert_lines(img, minLineLength=MIN_LINE_LENGTH, up_thresh=lines_threshold, close_lines=False)
        horz_lines = horz_lines + temp_horz_lines
        vert_lines = vert_lines + temp_vert_lines

    # compute Hough for long Lines: with morph lines closed
    for lines_threshold in HOUGH_LONG_LINES_TRESH:
        temp_horz_lines, temp_vert_lines = get_table_horz_vert_lines(img, minLineLength=0.8, up_thresh=lines_threshold, close_lines=True)
        horz_lines = horz_lines + temp_horz_lines
        vert_lines = vert_lines + temp_vert_lines

    # group lines
    horz_lines, vert_lines = group_lines(horz_lines, vert_lines, width, height)

    return horz_lines, vert_lines


def filter_table_templates(table, table_templates):

    # init variable holding best table templates candidates
    filtered_table_templates = []

    # extract dimensions
    height = table.shape[0]
    width = table.shape[1]

    # get aspect ratio (w / h)
    aspect_ratio_table = width / float(height)

    # go through all table templates
    for table_template in table_templates:

        # extract table template dimensions
        template_width, template_height = get_table_template_dimensions(table_template)

        # get aspect ratio
        aspect_ratio_template = template_width / float(template_height)

        # filter table templates based on aspect ratio mismatch
        aspect_ratio_frac = min([aspect_ratio_template, aspect_ratio_table]) / float(max([aspect_ratio_template, aspect_ratio_table]))
        if aspect_ratio_frac < MIN_ASPECT_RATIO_TABLE_AND_TABLE_TEMPLATE:
            continue

        # append
        filtered_table_templates.append(table_template)

    return filtered_table_templates


def score_rectangles_fit(table, fitted_rectangles, template_rectangles):

    # extract dimensions
    height = table.shape[0]
    width = table.shape[1]

    # get template's lines intersections points
    fitted_intersection_points = get_rectangles_intersections(fitted_rectangles)

    # get template's lines intersections points
    template_intersection_points = get_rectangles_intersections(template_rectangles)

    # score template fit
    score = score_table_template_fit(fitted_intersection_points, template_intersection_points, width, height)

    return score


def match_table_templates(table, table_templates, horz_lines, vert_lines, DEBUG=True):

    # extract dimensions
    height = table.shape[0]
    width = table.shape[1]

    # init process variables
    max_score = 0
    max_score_table_template = None

    # get lines intersection points
    table_intersection_points = get_horz_vert_intersections(horz_lines, vert_lines, extension_factor=LINES_EXTENSION_FACTOR)

    # go through table templates
    for table_template in table_templates:

        # get template's lines intersections points
        template_intersection_points = get_rectangles_intersections(table_template['rectangles'])

        # score template fit
        score = score_table_template_fit(table_intersection_points, template_intersection_points, width, height)

        # update best matching template
        if score > max_score:
            max_score = score
            max_score_table_template = table_template

    # test score
    if max_score < MIN_TABLE_TEMPLATE_FIT_SCORE: return None, None

    return max_score, max_score_table_template