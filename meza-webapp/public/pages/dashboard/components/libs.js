'use strict';

/***********************************************************************
* External Imports & Config
***********************************************************************/
import {
    isStringNonEmpty,
    getOriginFromUrl,
    isArrayNonEmpty,
    isObject,
    isNumber
} from '../../../assets/libs/datatypes.js';

import {
    DEFAULT_SERVER,
    ENDPOINT_FILE_METADATA,
    ENDPOINT_CELL,
    ENDPOINT_IMAGE
} from '../../../config.js';

import {
    reqGET,
    reqPOST
} from '../../../assets/libs/http.js';

// The server base URL
const server = DEFAULT_SERVER;


/***********************************************************************
* loadImage(endpoint)
* 
* Fetches an image (blob) from 'endpoint', converts it to an <img>, 
* and optionally parses metadata from 'x-image-metadata' header.
* Returns { asset: <img>, ...restOfMetadata } or null on failure.
***********************************************************************/
export async function loadImage(endpoint) {
    
    // 1) Fetch
    const response = await fetch(endpoint).catch(err => {
        console.error("loadImage fetch error:", err);
        return null;
    });
    if (!response) return null;
    
    const imageDataHeader = response.headers.get('x-image-metadata');
    
    // 2) Create Blob and object URL
    let blob;
    try {
        blob = await response.blob();
    } catch (err) {
        console.error("Blob creation error:", err);
        return null;
    }
    const imageURL = URL.createObjectURL(blob);
    
    // 3) Load into <img>
    let asset = new Image();
    let success = false;
    await new Promise((resolve) => {
        asset.onload = () => {
            success = true;
            resolve();
        };
        asset.onerror = () => {
            resolve();
        };
        asset.src = imageURL;
    });
    
    if (!success) return null;
    
    // 4) If there's image metadata, parse it
    if (isStringNonEmpty(imageDataHeader)) {
        const imageData = JSON.parse(imageDataHeader);
        return { asset, ...imageData };
    } else {
        return { asset };
    }
}


/***********************************************************************
* getCornerPoints(rectangles, cells)
* 
* Finds the four corners (top-left, top-right, bottom-right, bottom-left)
* of the entire table based on the stored rectangle definitions and 
* their final cell positions. 
* 
* Returns an array of four [x,y] points in the order: [TL, TR, BR, BL].
***********************************************************************/
export function getCornerPoints(rectangles, cells) {
    
    // 1) Collect the corners of each rectangle in the template
    //    We store [rect_id, x, y] for top-left, top-right, bottom-right, bottom-left
    const points = [];
    rectangles.forEach(r => {
        const { id, x0, y0, w, h } = r;
        points.push([id, x0,      y0     ]); // TL
        points.push([id, x0 + w,  y0     ]); // TR
        points.push([id, x0 + w,  y0 + h ]); // BR
        points.push([id, x0,      y0 + h ]); // BL
    });
    
    // 2) Compute the center of all these points
    let sumX = 0, sumY = 0;
    points.forEach(([_, px, py]) => {
        sumX += px;
        sumY += py;
    });
    const cx = sumX / points.length;
    const cy = sumY / points.length;
    
    // 3) Track corners (TL, TR, BR, BL) by greatest distance from center in each quadrant
    //    We'll store an object {id, x, y}, plus a "minDist" to know if it's more distant.
    let tl = { id: null, x: Infinity,   y: Infinity };
    let tr = { id: null, x: -Infinity,  y: Infinity };
    let br = { id: null, x: -Infinity,  y: -Infinity };
    let bl = { id: null, x: Infinity,   y: -Infinity };
    
    // We'll keep track of "farthest distance from center" in each quadrant
    let distTL = -Infinity, distTR = -Infinity, distBR = -Infinity, distBL = -Infinity;
    
    points.forEach(point => {
        const [id, x, y] = point;
        const dist = Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2));
        
        if (x < cx && y < cy && dist > distTL) {
            // top-left quadrant
            tl = { id, x, y };
            distTL = dist;
        } else if (x > cx && y < cy && dist > distTR) {
            // top-right quadrant
            tr = { id, x, y };
            distTR = dist;
        } else if (x > cx && y > cy && dist > distBR) {
            // bottom-right quadrant
            br = { id, x, y };
            distBR = dist;
        } else if (x < cx && y > cy && dist > distBL) {
            // bottom-left quadrant
            bl = { id, x, y };
            distBL = dist;
        }
    });
    
    // 4) For each corner's rect_id, look up the actual cell corners 
    //    because cells store final positions in tl_x, tr_x, etc.
    const cell_tl = cells.find(c => +c.rect_id === +tl.id);
    const cell_tr = cells.find(c => +c.rect_id === +tr.id);
    const cell_br = cells.find(c => +c.rect_id === +br.id);
    const cell_bl = cells.find(c => +c.rect_id === +bl.id);
    
    // If any are missing, we can't proceed
    if (!cell_tl || !cell_tr || !cell_br || !cell_bl) {
        return [[0,0], [0,0], [0,0], [0,0]];
    }
    
    // Return the final corners as [ [x,y], [x,y], [x,y], [x,y] ]
    return [
        [cell_tl.tl_x, cell_tl.tl_y],
        [cell_tr.tr_x, cell_tr.tr_y],
        [cell_br.br_x, cell_br.br_y],
        [cell_bl.bl_x, cell_bl.bl_y]
    ];
}


/***********************************************************************
* reproject(src_points, dst_points, rectangles)
* 
* Uses OpenCV's findHomography and perspectiveTransform to project 
* each rectangle from 'src_points' -> 'dst_points'.
* 
* 'src_points' and 'dst_points' must each be an array of length 8 
* describing four 2D points [x0,y0, x1,y1, x2,y2, x3,y3].
* 'rectangles' is an array of objects with corner coords:
*   { tl_x, tl_y, tr_x, tr_y, br_x, br_y, bl_x, bl_y }
* 
* Returns the array of reprojected rectangles with new corner coords.
***********************************************************************/
export function reproject(src_points, dst_points, rectangles) {
    // Make sure "cv" is in the global scope if you're using OpenCV.js
    // e.g. <script src="opencv.js"></script> before this file
    
    // 1) Prepare input mats for homography
    const srcMat = new cv.Mat(4, 1, cv.CV_32FC2);
    srcMat.data32F.set(src_points);
    const dstMat = new cv.Mat(4, 1, cv.CV_32FC2);
    dstMat.data32F.set(dst_points);
    
    // 2) Compute homography
    const homographyMatrix = cv.findHomography(srcMat, dstMat, cv.RANSAC);
    
    const resultRectangles = rectangles.map(rect => {
        // gather coords
        const pts = [
            rect.tl_x, rect.tl_y,
            rect.tr_x, rect.tr_y,
            rect.br_x, rect.br_y,
            rect.bl_x, rect.bl_y
        ];
        
        // 2a) create a mat for these corners
        const rectCorners = new cv.Mat(4, 1, cv.CV_32FC2);
        rectCorners.data32F.set(pts);
        
        // 2b) reproject
        const transformedCorners = new cv.Mat();
        cv.perspectiveTransform(rectCorners, transformedCorners, homographyMatrix);
        
        // 3) Extract new coords
        const data = transformedCorners.data32F;
        const newRect = {
            tl_x: data[0], tl_y: data[1],
            tr_x: data[2], tr_y: data[3],
            br_x: data[4], br_y: data[5],
            bl_x: data[6], bl_y: data[7]
        };
        
        // cleanup mats
        rectCorners.delete();
        transformedCorners.delete();
        return newRect;
    });
    
    // Cleanup
    srcMat.delete();
    dstMat.delete();
    homographyMatrix.delete();
    
    return resultRectangles;
}


/***********************************************************************
* project_table_template(rectangles, dst_points)
* 
* Takes the original table_template.rectangles definitions (x0,y0,w,h)
* and projects them onto 'dst_points' with reproject().
* Returns an array of reprojected rectangles with .rect_id, .data_type, etc.
***********************************************************************/
function project_table_template(rectangles, dst_points) {
    // 1) Determine the bounding box of the table template
    const width  = Math.max(...rectangles.map(r => r.w + r.x0));
    const height = Math.max(...rectangles.map(r => r.h + r.y0));
    
    // 2) src_points: the corners of the bounding box in "table template" space
    const src_points = [0, 0, width, 0, width, height, 0, height];
    
    // 3) Convert each rectangle (x0,y0,w,h) to corner coords
    const rectsForReproj = rectangles.map(r => {
        const { x0, y0, w, h } = r;
        return {
            tl_x: x0,
            tl_y: y0,
            tr_x: x0 + w,
            tr_y: y0,
            br_x: x0 + w,
            br_y: y0 + h,
            bl_x: x0,
            bl_y: y0 + h
        };
    });
    
    // 4) Use reproject
    const projected = reproject(src_points, dst_points, rectsForReproj);
    
    // 5) Attach IDs and data
    projected.forEach((pRect, i) => {
        pRect.rect_id   = rectangles[i].id;
        pRect.data_type = rectangles[i].data_type;
        pRect.opts      = rectangles[i].opts;
        delete pRect.value; // remove any stale 'value'
    });
    
    return projected;
}


/***********************************************************************
* saveCells(image_id, table_templates, corners)
* 
* For the given image, reprojects the table_template to the new 'corners'
* then POSTs the resulting rectangles. If the image has no table_template, 
* or if something goes wrong, returns null.
***********************************************************************/
export async function saveCells(image_id, table_templates, corners) {
    // 1) Get image info
    const response_image = await reqGET(server, ENDPOINT_IMAGE(image_id));
    if (!response_image || !isObject(response_image) || response_image.status !== 200) {
        return null;
    }
    const imageData = response_image.data;
    const table_template_id = imageData.table_template_id;
    
    // 2) If no table template, bail
    if (!isNumber(table_template_id)) return null;
    
    // 3) Find the correct table template
    const table_template = table_templates.find(tt => +tt.id === +table_template_id);
    if (!isObject(table_template) || !isArrayNonEmpty(table_template.rectangles)) return null;
    
    // 4) Reproject
    // 'corners' is presumably a 2D array of form [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]
    const corners_flat = corners.flat(); // e.g. [x0,y0, x1,y1, x2,y2, x3,y3]
    const rectangles   = project_table_template(table_template.rectangles, corners_flat);
    
    // 5) Send to server
    const response_cells = await reqPOST(server, ENDPOINT_CELL(image_id), { rectangles });
    if (!response_cells || !isObject(response_cells) || response_cells.status !== 200) {
        return null;
    }
    // If success, we return nothing. Could return true if needed.
}


/***********************************************************************
* loadCells(image_id, table_templates)
* 
* Fetches the image & table_template, then fetches existing cell corners.
* If no cell data is found, we compute an initial layout by scaling 
* the table template to fit the image. Otherwise, we reproject the corners 
* to get the final rectangles. 
* 
* Returns [rectangles, table_template] or null if something fails.
***********************************************************************/
export async function loadCells(image_id, table_templates) {
    
    // 1) Get image info
    const response_image = await reqGET(server, ENDPOINT_IMAGE(image_id));
    if (!response_image || !isObject(response_image) || response_image.status !== 200) return null;
    const imageData = response_image.data;
    const table_template_id = imageData.table_template_id;

    const response_cells = await reqGET(server, ENDPOINT_CELL(imageData.id));
    if (!response_cells || response_cells.status !== 200) return null;
    
    // 2) If no table template, bail
    if (!isNumber(table_template_id) && !isArrayNonEmpty(response_cells.data)) return null;
    if (!isNumber(table_template_id) && isArrayNonEmpty(response_cells.data)) {

        // Get cells
        const cells = response_cells.data;

        // Default template
        const table_template = {
            'id': null,
            'name': 'default',
            'rectangles': [
                { "id": 0, "h": 10, "w": 10, "x0": 0, "y0": 0, "opts": "", "data_type": "integer" }
            ]
        };

        return [ cells, table_template ];
    }
    
    // 3) Find the correct table template
    const table_template = table_templates.find(tt => +tt.id === +table_template_id);
    if (!isObject(table_template) || !isArrayNonEmpty(table_template.rectangles)) {
        return null;
    }
    
    // 4) Get existing cell data & image metadata
    const response_metadata  = await reqGET(server, ENDPOINT_FILE_METADATA(imageData.id));
    
    if (!response_metadata || response_metadata.status !== 200) return null;
    
    const cells    = response_cells.data;
    const metadata = response_metadata.data;
    const width_image  = metadata.width;
    const height_image = metadata.height;
    
    // 5) If no existing cells, scale the table template to fit the image
    if (!isArrayNonEmpty(cells)) {
        const width_template  = Math.max(...table_template.rectangles.map(r => r.w + r.x0));
        const height_template = Math.max(...table_template.rectangles.map(r => r.h + r.y0));
        
        // Determine scale
        const factor = 0.8 * Math.min(width_image / width_template, height_image / height_template);
        const offsetLeft = (width_image - width_template * factor) / 2;
        const offsetTop  = (height_image - height_template * factor) / 2;
        
        // Build the new rectangles array
        const scaledRectangles = table_template.rectangles.map(rect => {
            const { x0, y0, w, h, data_type, opts, id } = rect;
            
            // Scale each corner
            const x0_new = x0 * factor + offsetLeft;
            const y0_new = y0 * factor + offsetTop;
            const w_new  = w * factor;
            const h_new  = h * factor;
            
            return {
                tl_x: x0_new,
                tl_y: y0_new,
                tr_x: x0_new + w_new,
                tr_y: y0_new,
                br_x: x0_new + w_new,
                br_y: y0_new + h_new,
                bl_x: x0_new,
                bl_y: y0_new + h_new,
                data_type,
                opts,
                rect_id: id,
                value: null
            };
        });
        
        return [scaledRectangles, table_template];
    }
    
    // 6) Otherwise, we have stored cells
    //    Map rect_id -> value
    const cells_value_map = {};
    cells.forEach(cell => {
        cells_value_map[cell.rect_id] = cell.value;
    });
    
    // 7) Find corners of the entire table
    const corners = getCornerPoints(table_template.rectangles, cells);
    const corners_flat = corners.flat(); // [x0,y0, x1,y1, x2,y2, x3,y3]
    
    // 8) Reproject rectangles
    const rectangles = project_table_template(table_template.rectangles, corners_flat);
    
    // 9) Assign cell values
    rectangles.forEach(r => {
        r.value = cells_value_map[r.rect_id];
    });
    
    return [rectangles, table_template];
}
