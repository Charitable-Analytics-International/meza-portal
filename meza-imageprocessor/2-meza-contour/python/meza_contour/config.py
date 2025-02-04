# quality of jpeg when writing to disk
JPEG_QUALITY = 100

# schema validation
table_template_schema = ['id', 'rectangles']
rectangle_schema = ['id', 'x0', 'y0', 'w', 'h', 'data_type']

# value range
valid_image_extensions = ['jpeg', 'jpg', 'png', '']
valid_data_types = ['info', 'string', 'blackout', 'bubble', 'float', 'integer']

# image size
MIN_IMG_WIDTH = 600
MIN_IMG_HEIGHT = 600
MAX_IMG_WIDTH = 10000
MAX_IMG_HEIGHT = 10000

# When processing the image we resize it so that its longest side measures
PROCESS_IMG_LONGEST_DIM_MIN = 1080
PROCESS_IMG_LONGEST_DIM_MAX = 2160

# When processing the table we resize it so that its longest side measures
PROCESS_TABLE_LONGEST_DIM_MIN = 900
PROCESS_TABLE_LONGEST_DIM_MAX = 1800

# The minimum acceptable min_side/max_side ratio a table can have
MIN_TABLE_ASPECT_RATIO = 0.4

# The minimum area fraction a table could occupy in an image
MIN_TABLE_AREA = 0.03

# perimeter/surface ratio should be lower than (removes crazy contours)
MAX_PERIMETER_AREA = 0.05

# Min/Max Canny Thresholds to find table contours
LOWER_BOUND_CANNY_THRESH = [40,0]
UPPER_BOUND_CANNY_THRESH = [200,60]
DELTA_CANNY_THRESH = -10

# When going through potential table contours, we discard the ones who are bigger in area than the previous ones by this amount
MAX_MIN_AREA_RECT_FRAC = 1.02

# When considering if a child contour looks like a rectangular cell, this is the
# minimum ratio between its area and the area of the minimal enclosing rectangle
MIN_CONTOUR_AREA_TO_RECT_AREA_RATIO = 0.95

# When considering a child contour, it must be at least this fraction of the area
# of the parent contour
MIN_CHILD_CONTOUR_AREA_TO_PARENT = 0.001

# Minimum number of children a table contour must have
MIN_NBR_OF_CHILDREN = 6

# Max number of tables that could be in one image
MAX_NBR_TABLES = 4

# Maximum accumulated angle the contour of a table can have
MAX_CNT_ANGLE_POLY = 12*(3.1415926/2.0)
MAX_CNT_ANGLE_OPEN = 9*(3.1415926/2.0)

# When approximating a contour using a polygon we use this smoothing factor
SMOOTH_FACTOR = 0.02

# HOUGH PARAMS
MIN_LINE_LENGTH_TABLE_CNT = 0.1
MIN_LINE_LENGTH = 0.2                   # as a fraction of the dimension
ANGLE_RESOLUTION = 3.1415926/360.0      # in rad
MAX_HORZ_SLOPE = 0.2                    # if y = a*x + b, this is the thresh for a for horz lines
MIN_VERT_SLOPE = 5                      # if y = a*x + b, this is the thresh for a for vert lines
MAX_HORZ_SLOPE_CNT = 0.35               # a little bit more extreme for the contours
MIN_VERT_SLOPE_CNT = 2.5                # a little bit more extreme for the contours

# To find the horizontal and vertical table lines using Hough lines we use these thresholds
HOUGH_SMALL_LINES_TRESH = [130, 120, 110, 100, 90, 80, 70, 60]         # [100, 90, 80, 70]
HOUGH_LONG_LINES_TRESH = [130, 120, 110, 100, 90, 80, 70, 60]             # [110, 100, 90]
HOUGH_BASIC_LINES_TRESH = [60, 70, 80, 90, 100, 110]             # [60, 70, 80, 90, 100]
HOUGH_THRESHOLD_MIN = 60

# When grouping neighboring lines we set this thickness (> 1)
LINE_GROUP_THICKNESS = 5

# Minimum number of lines to process a table
MIN_NBR_OF_HORZ_LINES = 3
MIN_NBR_OF_VERT_LINES = 3

# If the number of lines is under these minimum threshold, we will look for lines with gap during hough transform
MAX_LINE_GAP = 0.02

# How far lines should be extended to create intersection points between horz and vert lines
LINES_EXTENSION_FACTOR = 0.25

# Before applying the hough transform we erode lines in the opposing direction with this kernel size
HOUGH_KERNEL_SIZE = 7

# Minimum fraction of the templates intersection points needed to try to fit
MIN_TABLE_INTERSECTION_POINTS = 0.02

# Table aspect ratio and Table template aspect ratio must be higher than
MIN_ASPECT_RATIO_TABLE_AND_TABLE_TEMPLATE = 0.6

# Table template has to at least have this fit score
MIN_TABLE_TEMPLATE_FIT_SCORE = 0.992

# Area difference between actual and template rect
MAX_RECT_AREA_RATIO_DIFF = 0.25

# CLOSENESS BETWEEN RECTANGLES (MUST BE < 0.5)
CLOSENESS_FACTOR = 0.1

# Simplification of Contour (to remove little apendages)
SIMPLIFICATION_FACTOR=0.05