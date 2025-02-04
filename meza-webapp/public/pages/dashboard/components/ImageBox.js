/***************************************************************
* ImageContainer.js
* 
* Provides a createImageContainer(image, table_templates, openImageBox)
* function that returns a DOM element representing one "image container".
* This container:
*   - Lazy-loads its thumbnail when scrolled into view
*   - Displays rotation/rejection buttons
*   - When clicked, calls openImageBox(image_id) to open a detailed editor
***************************************************************/

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------
import {
    DEFAULT_SERVER,
    ENDPOINT_IMAGE,
    IMAGE_STATUS,
    THUMBNAIL_WIDTH         // if not explicitly exported, define it yourself
} from '../../../config.js';

// ------------------------------------------------------------------
// Utilities & Libs
// ------------------------------------------------------------------
import { freeze, unfreeze } from '../../../assets/libs/ui.js';
import { isNumber, isObject } from '../../../assets/libs/datatypes.js';
import { reqPUT } from '../../../assets/libs/http.js';
import { dateToFormattedString } from '../../../assets/libs/datetime.js';
import {
    saveCells,
    loadImage,
    loadCells,
    getCornerPoints
} from './libs.js';

// ------------------------------------------------------------------
// Colors for border & overlays
// ------------------------------------------------------------------
const COLOR_REJECTED        = '#ff0000';
const COLOR_APPROVED        = '#0b75c1';
const COLOR_REVIEW          = '#ff9900';
const COLOR_BEING_PROCESSED = '#aaa';

/**
* createImageContainer(image, table_templates, openImageBox)
* 
* Builds a DOM element that shows:
*  - A canvas for the image
*  - A canvas for the cell overlays
*  - A caption with date, branch, and % decoded
*  - "Rotate" and "Reject" buttons
*  - Lazy-load logic via IntersectionObserver
*/
export function createImageContainer(image, table_templates, openImageBox) {
    /**************************************************************
    * 1) Unpack "image" object
    **************************************************************/
    const image_id     = image.id;
    const branch_name  = image.branch_name;
    const created_at   = image.created_at;
    
    // If image is not "approved=false", store table_template_id
    let table_template_id = -1;
    if (isNumber(image.table_template_id) && image.approved !== false) {
        table_template_id = image.table_template_id;
    }
    
    // Summaries (counts of bubble/float/integer)
    const nbr_bubble           = image.nbr_bubble           || 0;
    const nbr_bubble_decoded   = image.nbr_bubble_decoded   || 0;
    const nbr_float            = image.nbr_float            || 0;
    const nbr_float_decoded    = image.nbr_float_decoded    || 0;
    const nbr_integer          = image.nbr_integer          || 0;
    const nbr_integer_decoded  = image.nbr_integer_decoded  || 0;
    
    const total_cells_decoded = nbr_bubble_decoded + nbr_integer_decoded + nbr_float_decoded;
    const total_cells         = nbr_bubble + nbr_integer + nbr_float;
    
    let percentage_cells_decoded = 0;
    if (total_cells > 0) {
        percentage_cells_decoded = (100 * total_cells_decoded) / total_cells;
        percentage_cells_decoded = Math.round(percentage_cells_decoded * 100) / 100; // 2 decimals
    }
    
    // Format date
    const date_formatted = dateToFormattedString(new Date(created_at));
    
    /**************************************************************
    * 2) Rotation logic
    **************************************************************/
    async function updateRotation() {
        // If there's already a table template, rotate corners first
        if (isNumber(image.table_template_id)) {
            const corners_rotated = get_rotated_corners(image);
            await saveCells(image_id, table_templates, corners_rotated);
        }
        
        // Locally rotate by +90
        image.rotation = ((image.rotation || 0) + 90) % 360;
        
        // Build payload for server
        const payload = {
            rotation: image.rotation,
            status: IMAGE_STATUS.CUTTING
        };
        
        freeze();
        const results = await reqPUT(DEFAULT_SERVER, ENDPOINT_IMAGE(image_id), payload);
        unfreeze();
        
        if (!results || !isObject(results) || !isNumber(results.status)) {
            console.error("Could not update rotation on server.");
            return;
        }
        
        // Re-draw new thumbnail with updated rotation
        await set_box_thumbnail(image, table_templates);
    }
    
    /**************************************************************
    * 3) Rejection logic
    **************************************************************/
    async function rejectImage() {
        const payload = { approved: false };
        
        freeze();
        const results = await reqPUT(DEFAULT_SERVER, ENDPOINT_IMAGE(image_id), payload);
        unfreeze();
        
        if (!results || !isObject(results) || !isNumber(results.status)) {
            console.error("Could not reject the image on server.");
            return;
        }
        
        // Update local state
        image.approved = false;
        
        // Recolor border
        set_box_border_color(image);

        // Re-draw cells
        await set_box_cells(image, table_templates);
    }
    
    /**************************************************************
    * 4) Build DOM structure
    **************************************************************/
    // <div class="imageContainer">
    const container = document.createElement('div');
    container.classList.add('imageContainer');
    container.setAttribute('data-image_id', image_id);
    container.setAttribute('data-table_template_id', table_template_id);
    
    // Two canvases: .canvas-image & .canvas-cells
    const canvas_image = document.createElement('canvas');
    canvas_image.classList.add('canvas-image');
    const canvas_cells = document.createElement('canvas');
    canvas_cells.classList.add('canvas-cells');
    
    // The caption area
    const caption = document.createElement('div');
    caption.classList.add('imageCaption');
    
    // Date line
    const pDate = document.createElement('p');
    pDate.textContent = date_formatted;
    
    // Branch line
    const pBranch = document.createElement('p');
    pBranch.textContent = branch_name;
    
    // Decoded percentage line
    const pDecoded = document.createElement('p');
    pDecoded.textContent = `Decoded: ${percentage_cells_decoded}%`;
    
    caption.appendChild(pDate);
    caption.appendChild(pBranch);
    caption.appendChild(pDecoded);
    
    // "Rotate" button
    const rotateBtn = document.createElement('button');
    rotateBtn.classList.add('rotate');
    rotateBtn.textContent = 'Rotate';
    rotateBtn.addEventListener('click', async (event) => {
        event.stopPropagation(); // avoid container click
        await updateRotation();
    });
    
    // "Reject" button
    const rejectBtn = document.createElement('button');
    rejectBtn.classList.add('reject');
    rejectBtn.textContent = 'Reject';
    rejectBtn.addEventListener('click', async (event) => {
        event.stopPropagation(); // avoid container click
        await rejectImage();
    });
    
    // Assemble container
    container.appendChild(canvas_image);
    container.appendChild(canvas_cells);
    container.appendChild(caption);
    container.appendChild(rotateBtn);
    container.appendChild(rejectBtn);
    
    // On container click => open big editor
    container.addEventListener('click', () => {
        openImageBox(image_id);
    });
    
    /**************************************************************
    * 5) Lazy-load via IntersectionObserver
    **************************************************************/
    const observer = new IntersectionObserver(async (entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {

                // Wait half a second before loading
                await new Promise(r => setTimeout(r, 500));
                
                // Re-check if still in view
                const bbox = entry.target.getBoundingClientRect();
                if (bbox.bottom < 0 || bbox.top > window.innerHeight) {
                    return;  // container is no longer in view
                }
                
                // No longer observe after first load
                observer.unobserve(entry.target);
                
                // Actually load the thumbnail
                await set_box_thumbnail(image, table_templates);

                // Update border color
                set_box_border_color(image);
            }
        }
    }, { root: null, rootMargin: '0px', threshold: 0.0 });
    
    observer.observe(container);
    
    // Initial border color
    set_box_border_color(image);
    
    // Return the container for insertion into the DOM
    return container;
}


// ------------------------------------------------------------------
// set_box_border_color(image):
//   Sets the container's border color based on "approved" & status.
// ------------------------------------------------------------------
export function set_box_border_color(image) {
    const { id: image_id, approved, status } = image;
    
    const imageGallery = document.getElementById('imageGallery');
    if (!imageGallery) return;
    
    const container = imageGallery.querySelector(`[data-image_id="${image_id}"]`);
    if (!container) return;
    
    if (approved === true) {
        container.style.borderColor = COLOR_APPROVED;
    } else if (approved === false) {
        container.style.borderColor = COLOR_REJECTED;
    } else if (status === IMAGE_STATUS.ANNOTATION || status === IMAGE_STATUS.DONE) {
        container.style.borderColor = COLOR_REVIEW;
    } else {
        container.style.borderColor = COLOR_BEING_PROCESSED;
    }
}


// ------------------------------------------------------------------
// set_box_thumbnail(image, table_templates):
//   Loads a resized image from server & draws on .canvas-image.
//   Then calls set_box_cells() to draw overlays on .canvas-cells
// ------------------------------------------------------------------
async function set_box_thumbnail(image, table_templates) {
    const { id: image_id, rotation } = image;
    const imageGallery = document.getElementById('imageGallery');
    if (!imageGallery) return;
    
    const container = imageGallery.querySelector(`[data-image_id="${image_id}"]`);
    if (!container) return;
    
    const canvas_image = container.querySelector('.canvas-image');
    const canvas_cells = container.querySelector('.canvas-cells');
    if (!canvas_image || !canvas_cells) return;
    
    // Build thumbnail URL
    const thumbnailUrl = `${DEFAULT_SERVER}/api/files/${image_id}?resize=${THUMBNAIL_WIDTH}&rotation=${rotation || 0}`;
    
    // Load the image
    const result = await loadImage(thumbnailUrl);
    if (!result) return;
    
    const { asset, ratio } = result; // 'asset' is <img>, 'ratio' is optional
    const w = asset.width;
    const h = asset.height;
    
    // Set canvas sizes
    canvas_image.width = w;
    canvas_image.height = h;
    canvas_cells.width = w;
    canvas_cells.height = h;
    
    // Store ratio if needed
    container.setAttribute('data-ratio', ratio);
    
    // Draw image
    const ctxImg = canvas_image.getContext('2d');
    ctxImg.clearRect(0, 0, w, h);
    ctxImg.drawImage(asset, 0, 0, w, h);
    
    // Draw cells overlay
    await set_box_cells(image, table_templates, ratio);
}


// ------------------------------------------------------------------
// set_box_cells(image, table_templates, ratio):
//   Draws the cell overlays on .canvas-cells (e.g. bounding boxes).
// ------------------------------------------------------------------
export async function set_box_cells(image, table_templates, ratio = null) {
    const image_id = image.id;
    
    const gallery = document.getElementById('imageGallery');
    if (!gallery) return;
    
    const container = gallery.querySelector(`[data-image_id="${image_id}"]`);
    if (!container) return;
    
    const canvas_cells = container.querySelector('.canvas-cells');
    if (!canvas_cells) return;
    
    const ctx = canvas_cells.getContext('2d');
    ctx.clearRect(0, 0, canvas_cells.width, canvas_cells.height);
    
    // If rejected, skip drawing
    if (image.approved === false) return;
    
    // If ratio not passed in, read from data-ratio
    if (ratio === null || typeof ratio !== 'number' || isNaN(ratio)) {
        const ratioAttr = parseFloat(container.getAttribute('data-ratio'));
        if (!isNaN(ratioAttr)) {
            ratio = ratioAttr;
        } else {
            return;
        }
    }
    
    // Load the cell definitions
    const results_cells = await loadCells(image_id, table_templates);
    if (!results_cells) return;
    
    const [ cells, table_template ] = results_cells;
    if (!Array.isArray(cells)) return;
    
    // Draw bounding boxes
    ctx.strokeStyle = COLOR_APPROVED;
    ctx.lineWidth = 1.5;
    cells.forEach(cell => {
        const tlx = cell.tl_x * ratio, tly = cell.tl_y * ratio;
        const trx = cell.tr_x * ratio, try_ = cell.tr_y * ratio;
        const brx = cell.br_x * ratio, bry = cell.br_y * ratio;
        const blx = cell.bl_x * ratio, bly = cell.bl_y * ratio;
        ctx.beginPath();
        ctx.moveTo(tlx, tly);
        ctx.lineTo(trx, try_);
        ctx.lineTo(brx, bry);
        ctx.lineTo(blx, bly);
        ctx.closePath();
        ctx.stroke();
    });
    
    // Compute corners for entire table, store them on container
    const corners = getCornerPoints(table_template.rectangles, cells);
    if (!Array.isArray(corners) || corners.length !== 4) return;
    
    const [tl, tr, br, bl] = corners;
    container.setAttribute('data-tl_x', tl[0]);
    container.setAttribute('data-tl_y', tl[1]);
    container.setAttribute('data-tr_x', tr[0]);
    container.setAttribute('data-tr_y', tr[1]);
    container.setAttribute('data-br_x', br[0]);
    container.setAttribute('data-br_y', br[1]);
    container.setAttribute('data-bl_x', bl[0]);
    container.setAttribute('data-bl_y', bl[1]);
    
    // Draw corner circles
    corners.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x * ratio, y * ratio, 5, 0, 2 * Math.PI);
        ctx.fillStyle = COLOR_APPROVED;
        ctx.fill();
        ctx.closePath();
    });
}


// ------------------------------------------------------------------
// get_rotated_corners(image):
//   Reads existing corners from data- attributes, rotates them 90°.
// ------------------------------------------------------------------
function get_rotated_corners(image) {
    const image_id = image.id;
    const gallery = document.getElementById('imageGallery');
    if (!gallery) return [];
    
    const container = gallery.querySelector(`[data-image_id="${image_id}"]`);
    if (!container) return [];
    
    // Read ratio & corners from container
    const ratio = parseFloat(container.getAttribute('data-ratio'));
    const tl_x = parseFloat(container.getAttribute('data-tl_x'));
    const tl_y = parseFloat(container.getAttribute('data-tl_y'));
    const tr_x = parseFloat(container.getAttribute('data-tr_x'));
    const tr_y = parseFloat(container.getAttribute('data-tr_y'));
    const br_x = parseFloat(container.getAttribute('data-br_x'));
    const br_y = parseFloat(container.getAttribute('data-br_y'));
    const bl_x = parseFloat(container.getAttribute('data-bl_x'));
    const bl_y = parseFloat(container.getAttribute('data-bl_y'));
    
    const corners = [
        [tl_x, tl_y],
        [tr_x, tr_y],
        [br_x, br_y],
        [bl_x, bl_y]
    ];
    
    // If you have a global THUMBNAIL_WIDTH, compute the un-rotated width
    const width = THUMBNAIL_WIDTH / ratio;
    return rotate90(width, corners);
}


/**
* rotate90(width, corners):
*  Each corner is [x,y]. We rotate them by 90° around (0,0)
*  or you might pivot around the center. This depends on your geometry.
*/
function rotate90(width, corners) {
    // Basic approach: new (x, y) => (y, width - x)
    const rotated = corners.map(([x, y]) => [y, width - x]);
    
    // Adjust the order to preserve top-left -> top-right -> bottom-right -> bottom-left
    return [
        rotated[1], // new top-left
        rotated[2], // new top-right
        rotated[3], // new bottom-right
        rotated[0]  // new bottom-left
    ];
}
