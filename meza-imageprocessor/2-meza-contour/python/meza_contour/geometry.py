"""
    This file contains functions related to simple geometric operations
"""

# import basic libs
from copy import deepcopy
import math

# import image processing libs
try:
    import numpy as np
except:
    import sys
    sys.path.append('/opt/')
    import numpy as np



def determinant(p1, p2):
    """
        Returns the algebric determinant of a two point matrix
    """

    return p1[0] * p2[1] - p1[1] * p2[0]


def orientation(p, q, r):
    """
        Checks orientation of 3 points
    """

    val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])

    if val == 0:
        return 0  # colinear

    if val > 0:
        return 1   # clockwise

    return 2   # counterclock wise


def on_segment(p, q, r):
    """
        Checks if 3 points are on the same segment
    """

    return (q[0] <= max(p[0], r[0]) and q[0] >= min(p[0], r[0]) and q[1] <= max(p[1], r[1]) and q[1] >= min(p[1], r[1]))


def do_segments_intersect(segment1, segment2):
    """
        Checks if two segments intersect
    """

    # extract points
    p1 = segment1[0]
    q1 = segment1[1]
    p2 = segment2[0]
    q2 = segment2[1]

    # Find the four orientations needed for general and
    # special cases
    o1 = orientation(p1, q1, p2)
    o2 = orientation(p1, q1, q2)
    o3 = orientation(p2, q2, p1)
    o4 = orientation(p2, q2, q1)

    # General case
    if o1 != o2 and o3 != o4:
        return True


    # Special Cases
    # p1, q1 and p2 are colinear and p2 lies on segment p1q1
    if o1 == 0 and on_segment(p1, p2, q1):
        return True


    # p1, q1 and q2 are colinear and q2 lies on segment p1q1
    if o2 == 0 and on_segment(p1, q2, q1):
        return True


    # p2, q2 and p1 are colinear and p1 lies on segment p2q2
    if o3 == 0 and on_segment(p2, p1, q2):
        return True


    # p2, q2 and q1 are colinear and q1 lies on segment p2q2
    if o4 == 0 and on_segment(p2, q1, q2):
        return True


    return False # Doesn't fall in any of the above cases


def get_segments_intersection(segment1, segment2):
    """
        Returns the point at which two segments intersect, or none
    """

    # make sure the two segments intersect
    if not do_segments_intersect(segment1, segment2):
        return None

    # get the deltas
    xdiff = (segment1[0][0] - segment1[1][0], segment2[0][0] - segment2[1][0])
    ydiff = (segment1[0][1] - segment1[1][1], segment2[0][1] - segment2[1][1])

    # make sure determinant is not 0
    div = determinant(xdiff, ydiff)
    if div == 0:
        return None

    d = (determinant(*segment1), determinant(*segment2))
    x = determinant(d, xdiff) / div
    y = determinant(d, ydiff) / div

    return (x, y)


def rectangles_intersect(tl_1, br_1, tl_2, br_2):
    # Using the separation axis theorem

    # grab coordinates
    tl_x_1, tl_y_1 = tl_1
    br_x_1, br_y_1 = br_1

    tl_x_2, tl_y_2 = tl_2
    br_x_2, br_y_2 = br_2
    
    return not (tl_x_1 < tl_x_2 or tl_x_1 > br_x_2 or tl_y_1 > br_y_2 or br_y_1 < tl_y_2)


def euclidian_distance(p1, p2):
    """
        Returns the euclidian distance between two points
    """

    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)


def distance_point_to_segment(point, segment):
    """
        Returns the closest distance between a point and a segment
    """

    # format point
    point = np.array(point)

    # format segment
    segment = [
        np.array([segment[0][0], segment[0][1]]),
        np.array([segment[1][0], segment[1][1]])
    ]

    # unit vector
    unit_line = segment[1] - segment[0]
    norm_unit_line = unit_line / np.linalg.norm(unit_line)

    # compute the perpendicular distance to the theoretical infinite segment
    segment_dist = (
        np.linalg.norm(np.cross(segment[1] - segment[0], segment[0] - point)) /
        np.linalg.norm(unit_line)
    )

    diff = (
        (norm_unit_line[0] * (point[0] - segment[0][0])) +
        (norm_unit_line[1] * (point[1] - segment[0][1]))
    )

    x_seg = (norm_unit_line[0] * diff) + segment[0][0]
    y_seg = (norm_unit_line[1] * diff) + segment[0][1]

    endpoint_dist = min(
        np.linalg.norm(segment[0] - point),
        np.linalg.norm(segment[1] - point)
    )

    # decide if the intersection point falls on the segment
    lp1_x = segment[0][0]  # segment point 1 x
    lp1_y = segment[0][1]  # segment point 1 y
    lp2_x = segment[1][0]  # segment point 2 x
    lp2_y = segment[1][1]  # segment point 2 y
    is_betw_x = lp1_x <= x_seg <= lp2_x or lp2_x <= x_seg <= lp1_x
    is_betw_y = lp1_y <= y_seg <= lp2_y or lp2_y <= y_seg <= lp1_y

    if is_betw_x and is_betw_y:
        return segment_dist

    # if not, then return the minimum distance to the segment endpoints
    return endpoint_dist


def angle_between_3_points(p1, p2, p3):
    """
        With p2 as the middle point, returns the absolute value of the interior angle (rad)
    """

    # cast to numpy array
    a = np.array(p1)
    b = np.array(p2)
    c = np.array(p3)

    # get segment vectors
    ba = a - b
    bc = c - b

    # compute cosine between the segments
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    angle = np.arccos(cosine_angle)

    return angle


def accumulate_contour_angles(contour):
    """
        Goes through each contour's corner and accumulates the angles (rad)
    """

    # storage for angle accumulation
    accu = 0

    if len(contour) < 3:
        accu = 0

    elif len(contour) == 3:
        accu += angle_between_3_points(contour[0][0], contour[1][0], contour[2][0])
        accu += angle_between_3_points(contour[1][0], contour[2][0], contour[0][0])
        accu += angle_between_3_points(contour[2][0], contour[0][0], contour[1][0])

    else:
        for index in range(0, len(contour)-2):

            # get three consecutive points
            p1 = contour[index][0]
            p2 = contour[index+1][0]
            p3 = contour[index+2][0]

            # accumulate
            accu += angle_between_3_points(p1, p2, p3)

        # accumulate
        accu += angle_between_3_points(contour[len(contour)-2][0], contour[len(contour)-1][0], contour[0][0])
        accu += angle_between_3_points(contour[len(contour)-1][0], contour[0][0], contour[1][0])

    return accu


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


def get_slope(p1, p2):
    """
        Returns the slope of the line composed of two points
    """

    return (p2[1] - p1[1])/(p2[0] - p1[0] + 0.000001)   # +0.000001 not to divide by 0


def get_intercept(p1, p2):
    """
        Returns the intercept of the line composed of two points
    """

    slope = get_slope(p1, p2)
    intercept = p1[1] - slope*p1[0]

    return intercept


def get_slope_intercept(p1, p2):
    """
        Returns the slope and intercept of the line composed of two points
    """

    slope = get_slope(p1, p2)
    intercept = get_intercept(p1, p2)

    return slope, intercept


def get_segment_x_at_y(y, segment):

    # get two extremeties
    p1, p2 = segment

    # make sure y is inside segment
    y1 = p1[1]
    y2 = p2[1]
    if y > max([y1, y2]) or y < min([y1, y2]):
        return None

    # get slope & intercept
    slope, intercept = get_slope_intercept(p1, p2)

    # extract x
    x = (y - intercept)/(slope + 0.00000001)

    return x


def get_segment_y_at_x(x, segment):

    # get two extremeties
    p1, p2 = segment
    
    # make sure x is inside segment
    x1 = p1[0]
    x2 = p2[0]
    if x > max([x1, x2]) or x < min([x1, x2]):
        return None

    # get slope & intercept
    slope, intercept = get_slope_intercept(p1, p2)

    # extract y
    y = slope * x + intercept
    
    return y


def is_line_horz(p1, p2, MAX_HORZ_SLOPE):
    """
        Checks if a slope is horizontal under a delta
    """

    delta = get_slope(p1, p2)

    return (abs(delta) < MAX_HORZ_SLOPE)


def is_line_vert(p1, p2, MIN_VERT_SLOPE):
    """
        Checks if a slope is vertical above a delta
    """

    delta = get_slope(p1, p2)

    return (abs(delta) > MIN_VERT_SLOPE)


def extend_lines(lines, factor=0.2):
    """
        Extends the lines, only for horz or vert lines
    """

    # format lines
    extended_lines = []
    for line in lines:

        # grab points
        pt1, pt2 = line

        # grab coordinates
        x1, y1 = pt1
        x2, y2 = pt2

        # order points
        if x2 < x1:
            pt0 = pt1
            pt1 = pt2
            pt2 = pt0

        # compute length
        line_length = euclidian_distance(pt1, pt2)

        # compute extension length
        extension_length = int(line_length*factor)

        # ax+b
        slope = get_slope(pt1, pt2)

        # inverse tangent
        theta = math.atan(slope)

        # grab coordinates
        x1, y1 = pt1
        x2, y2 = pt2

        # new coordinates
        delta_y = math.sin(theta)*extension_length
        delta_x = math.cos(theta)*extension_length

        # extend
        x1 = x1 - delta_x
        y1 = y1 - delta_y
        x2 = x2 + delta_x
        y2 = y2 + delta_y

        # create points
        pt1 = (int(x1), int(y1))
        pt2 = (int(x2), int(y2))

        # new line
        new_line = [pt1, pt2]

        # append
        extended_lines.append(new_line)

    return extended_lines


def get_horz_vert_intersections(src_horz_lines, src_vert_lines, extension_factor=0.0):
    """
        Returns all the point intersections between horz and vert lines
    """

    # copy
    horz_lines = deepcopy(src_horz_lines)
    vert_lines = deepcopy(src_vert_lines)

    # slightly extend to be sure lines meet
    if extension_factor > 0:
        horz_lines = extend_lines(horz_lines, factor=extension_factor)
        vert_lines = extend_lines(vert_lines, factor=extension_factor)

    # init set for unique values
    intersection_points = []

    # go through all combinations of lines
    for horz_line in horz_lines:
        for vert_line in vert_lines:

            # get point at which the segments intersect
            inter_pt = get_segments_intersection(horz_line, vert_line)
            if inter_pt is None:
                continue

            # split
            x, y = inter_pt

            # append
            intersection_points.append([[int(x), int(y)]])

    return intersection_points


def split_points_by_quadrants(pts, contour_center):
    """
        Returns [tl, tr, br, bl]
    """

    if len(pts) < 4:
        return None

    # Extract center
    center_x, center_y = contour_center

    # init
    ordered_pts = [[], [], [], []]
    for pt in pts:

        x, y = pt[0]

        if x < center_x and y < center_y:
            ordered_pts[0].append(pt[0])
        elif x > center_x and y < center_y:
            ordered_pts[1].append(pt[0])
        elif x > center_x and y > center_y:
            ordered_pts[2].append(pt[0])
        elif x < center_x and y > center_y:
            ordered_pts[3].append(pt[0])

    # check
    for quadrant in ordered_pts:
        if len(quadrant) == 0:
            return None

    return ordered_pts


def get_best_corners_candidate(corners, contour):
    """
        returns corners in order [tl, tr, br, bl]
    """

    cnt_corners = []
    for corner in corners:

        # of all the potential corner candidates which one is closest to the contour
        nearest_pt = get_nearest_points_in_list(corner, contour, MAX_NBR=1)[0]

        # append
        cnt_corners.append(nearest_pt)

    return cnt_corners


def extend_lines_to_borders(horz_lines, vert_lines, width, height):
    """
        Extend lines to reach the borders, only for horz or vert lines
    """

    # horz lines
    extended_horz = []
    for line in horz_lines:

        # grab points
        pt1, pt2 = line

        # grab coordinates
        x1, y1 = pt1
        x2, y2 = pt2

        # order points
        if x2 < x1:
            pt0 = pt1
            pt1 = pt2
            pt2 = pt0

        # ax+b
        slope, intercept = get_slope_intercept(pt1, pt2)

        # create points
        pt1 = (0, int(intercept))
        pt2 = (int(width), int(slope*width + intercept))

        # new line
        new_line = [pt1, pt2]

        # append
        extended_horz.append(new_line)


    # vert lines
    extended_vert = []
    for line in vert_lines:

        # grab points
        pt1, pt2 = line

        # grab coordinates
        x1, y1 = pt1
        x2, y2 = pt2

        # order points
        if y2 < y1:
            pt0 = pt1
            pt1 = pt2
            pt2 = pt0

        # ax+b = y
        slope, intercept = get_slope_intercept(pt1, pt2)

        # create points
        pt1 = (-int(intercept/float(slope)), 0)
        pt2 = (int((height - intercept)/float(slope)), height)

        # new line
        new_line = [pt1, pt2]

        # append
        extended_vert.append(new_line)

    return [extended_horz, extended_vert]


def sort_horz_lines(horz_lines):
    """
        Returns horz lines in ascending order (top to bottom)
    """

    # sorting function
    def sortFunc(line):

        # grab points
        pt1, pt2 = line

        # grab coordinates
        x1, y1 = pt1
        x2, y2 = pt2

        # average y
        ave_x = (y1 + y2)/2.0

        return ave_x

    # sort
    horz_lines.sort(key=sortFunc)

    return horz_lines


def sort_vert_lines(vert_lines):
    """
        Returns vert lines in ascending order (left to right)
    """

    # sorting function
    def sortFunc(line):

        # grab points
        pt1, pt2 = line

        # grab coordinates
        x1, y1 = pt1
        x2, y2 = pt2

        # average y
        ave_y = (x1 + x2)/2.0

        return ave_y

    # sort
    vert_lines.sort(key=sortFunc)

    return vert_lines


def shard_lines_into_rectangles(horz_lines, vert_lines):
    """
        Takes horz and vert lines as inputs and returns individual rectangles
    """

    # sort in ascending order
    horz_lines = sort_horz_lines(horz_lines)
    vert_lines = sort_vert_lines(vert_lines)

    # init set for unique values
    rectangles = []

    # go through all combinations of lines
    rect_id = 0
    for i in range(0, len(horz_lines)-1):

        # get lines
        horz1 = horz_lines[i]
        horz2 = horz_lines[i+1]

        for j in range(0, len(vert_lines)-1):

            # get lines
            vert1 = vert_lines[j]
            vert2 = vert_lines[j+1]

            # get point at which the segments intersect
            inter_pt = get_segments_intersection(horz1, vert1)
            if inter_pt is None:
                continue

            x0, y0 = inter_pt

            inter_pt = get_segments_intersection(horz2, vert2)
            if inter_pt is None:
                continue

            x1, y1 = inter_pt

            # compute values
            w = int(x1 - x0)
            h = int(y1 - y0)
            x0 = int(x0)
            y0 = int(y0)

            # create rect
            rect = {
                'id':str(rect_id),
                'x0':x0,
                'y0':y0,
                'w':w,
                'h':h,
                'data_type':'float',         # ideally we would predict the type
                'values': []
            }

            # add to main arr
            rectangles.append(rect)

            # increment id
            rect_id += 1

    return rectangles


def rotate_points(pts, angle, initial_width, initial_height):
    """
        Rotates the points by mod 90 deg counterclockwise
    """

    # modulo 360
    angle = angle % 360

    if angle == 90:

        flipped = []
        for pt in pts:
            x, y = pt[0]
            new_y = initial_width - x
            new_x = y
            flipped.append([[new_x, new_y]])

        return flipped, initial_height, initial_width


    if angle == 180:

        flipped = []
        for pt in pts:
            x, y = pt[0]
            new_x = initial_width - x
            new_y = initial_height - y
            flipped.append([[new_x, new_y]])

        return flipped, initial_width, initial_height


    if angle == 270:

        flipped = []
        for pt in pts:
            x, y = pt[0]
            new_y = x
            new_x = initial_height - y
            flipped.append([[new_x, new_y]])

        return flipped, initial_height, initial_width


    if angle == 0:
        return pts, initial_width, initial_height


    return None, None, None


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


def return_closest_line_to_point(pt, lines, max_dist_for_match):

    # init
    index_of_closest_line = -1
    distance_to_closest_line = math.inf

    # grab vals
    x, y = pt

    # go through lines
    for j, line in enumerate(lines):

        # compute distance to line
        d = distance_point_to_segment((x, y), line)

        # if smaller than previous
        if d < distance_to_closest_line:
            index_of_closest_line = j
            distance_to_closest_line = d

    # if we have a match
    if distance_to_closest_line < max_dist_for_match:
        return index_of_closest_line
    
    return None


def pts_to_rectangular_lines(x0, y0, w, h):

    # round
    x0 = int(x0)
    y0 = int(y0)
    w = int(w)
    h = int(h)

    # append lines to list
    lines = [
        [(x0, y0), (x0 + w, y0)],
        [(x0 + w, y0), (x0 + w, y0 + h)],
        [(x0 + w, y0 + h), (x0, y0 + h)],
        [(x0, y0 + h), (x0, y0)]
    ]

    return lines