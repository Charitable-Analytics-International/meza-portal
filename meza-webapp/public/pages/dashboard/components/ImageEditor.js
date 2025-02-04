/**************************************************************
* ImageEditor.js – Single Coherent File (Refactored/Improved)
**************************************************************/

// ----- Config & Constants -----
import {
    DEFAULT_SERVER,
    ENDPOINT_IMAGE,
    ENDPOINT_FILE,
    ENDPOINT_CELLS,
    IMAGE_STATUS,
    THUMBNAIL_WIDTH
} from '../../../config.js';

// ----- External libs / Utility imports -----
import { freeze, unfreeze } from '../../../assets/libs/ui.js';
import { getShortMonthDay } from '../../../assets/libs/datetime.js';
import {
    isObject,
    isStringNonEmpty,
    isNumber,
    isString,
    isArrayNonEmpty
} from '../../../assets/libs/datatypes.js';
import { reqGET, reqPUT } from '../../../assets/libs/http.js';

// Local libs
import {
    loadImage,
    loadCells,
    saveCells,
    getCornerPoints,
    reproject
} from './libs.js';
import {
    set_box_border_color,
    set_box_cells
} from './ImageBox.js';
import { promptForCellValue } from './prompt.js';


/**************************************************************
* A simple “popup” or “toast” function
**************************************************************/
export async function popup(text, type = 'info') {
    console.log(`[POPUP/${type}] ${text}`);
}

// Build a reverse lookup for IMAGE_STATUS
const IMAGE_STATUS_REVERSE = {};
for (const key in IMAGE_STATUS) {
    IMAGE_STATUS_REVERSE[IMAGE_STATUS[key]] = key;
}

/**************************************************************
* The ImageEditor class replicates your original Svelte logic:
* - Shows/hides <aside id="image_box">
* - Loads the image + cells
* - Renders the canvases & overlay
* - Allows setting template, approval, etc.
**************************************************************/
export class ImageEditor {
    /**
    * constructor({ branches, table_templates })
    * @param {array} branches        – array of all branches
    * @param {array} table_templates – array of all table templates
    */
    constructor({ branches, table_templates }) {
        this.branches = branches;
        this.table_templates = table_templates;
        
        // The server endpoint
        this.server = DEFAULT_SERVER;
        
        // Internal state
        this.display = false;
        this.ready = false;
        this.reprocess = false;
        
        this.image_id = null;
        this.image = null;          // image object from server
        this.cells = null;          // cell definitions from loadCells
        this.table_template = null; // chosen table template
        
        // <aside> ID in the DOM
        this.asideBox = document.getElementById('image_box');
        if (!this.asideBox) {
            console.warn("#image_box not found in DOM. Make sure it exists.");
        }
        
        // The "Close" button inside the aside
        const closeBtn = this.asideBox?.querySelector("#close");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                this.close();
            });
        }
    }
    
    /**
    * close(): Hides the editor, clears canvas, reprocesses if needed
    */
    close() {
        this.display = false;
        if (this.asideBox) {
            this.asideBox.style.display = "none";
        }
        
        // Clear workspace
        clear();
        
        // If we had an image, reset its box color/cells
        if (this.image) {
            set_box_border_color(this.image);
            set_box_cells(this.image, this.table_templates);
        }
        
        // If reprocessing is necessary
        if (this.reprocess && this.image_id) {
            console.log("Info: reprocessing image on server...");
            reqPUT(this.server, ENDPOINT_IMAGE(this.image_id), {
                status: IMAGE_STATUS.CUTTING
            });
        }
    }
    
    /**
    * updateTemplate(tableTemplate):
    *   Assign a new table_template_id to this image, save corners, re-draw
    */
    async updateTemplate(tableTemplate) {
        if (!isObject(tableTemplate) || !isNumber(tableTemplate.id)) {
            console.error("Invalid table template argument.");
            return;
        }
        if (!this.image_id) {
            console.error("No image_id set; cannot update template.");
            return;
        }
        
        freeze();
        const response = await reqPUT(
            this.server,
            ENDPOINT_IMAGE(this.image_id),
            { table_template_id: tableTemplate.id }
        );
        unfreeze();
        
        if (!response || !isObject(response) || !isNumber(response.status) || response.status !== 200) {
            console.error("Could not update image with new table_template.");
            return;
        }
        
        // Mark that we need to reprocess on close
        this.reprocess = true;
        
        // Update local state
        this.table_template = tableTemplate;
        this.image.table_template_id = tableTemplate.id;
        this.image.status = IMAGE_STATUS.CUTTING;
        
        // Next, read the corner positions from #svgbox circles
        const imgCanvas = document.getElementById("img-canvas");
        if (!imgCanvas) {
            console.warn("No #img-canvas found to read corners from.");
            return;
        }
        const image_width = imgCanvas.width;
        const image_height = imgCanvas.height;
        
        // figure out offset + resizeFactor
        const { resizeFactor, offsetTop, offsetLeft } =
        computeImageResizeFactor(image_width, image_height);
        
        // read the circle coords from #svgbox
        const svg = d3.select("#svgbox");
        const circleNodes = svg.selectAll("circle").nodes();
        
        // convert to numeric
        const corners = circleNodes.map(circle => ([
            (Number(circle.getAttribute("cx")) - offsetLeft) / resizeFactor,
            (Number(circle.getAttribute("cy")) - offsetTop) / resizeFactor
        ]));
        
        if (!Array.isArray(corners) || corners.length !== 4) {
            console.log("Error: we need exactly 4 corners to update template.");
            return;
        }
        
        // Save & re-draw
        freeze();
        await saveCells(this.image_id, this.table_templates, corners);
        const results_cells = await loadCells(this.image_id, this.table_templates);
        if (results_cells) {
            const [newCells] = results_cells;
            this.cells = newCells;
            drawTableTemplate(this.table_template, this.cells, this.image_id);
        }
        unfreeze();
    }
    
    /**
    * updateApproved(approved): sets image.approved = true/false on the server
    */
    async updateApproved(approved) {
        if (!this.image_id) return;
        freeze();
        const response = await reqPUT(
            this.server,
            ENDPOINT_IMAGE(this.image_id),
            { approved }
        );
        unfreeze();
        
        if (!response || !isObject(response)) {
            console.error("Could not update 'approved' status on server.");
            return;
        }
        this.image.approved = approved;
    }

    /**
     * renderLeftPanel():
     *   Rebuild the #image_box_left contents based on the current
     *   this.image, this.table_template, etc.
     */
    renderLeftPanel() {
        // If the DOM is missing or we have no image loaded, bail
        if (!this.asideBox || !this.image) return;
        const leftPanel = this.asideBox.querySelector("#image_box_left");
        if (!leftPanel) return;

        // Clear any existing contents
        leftPanel.innerHTML = "";

        // ----------------------------------
        // 1) Title: date + branch name
        // ----------------------------------
        // A small utility to safely get the date string
        let createdDateStr = "";
        if (this.image.created_at) {
            const dt = new Date(this.image.created_at);
            createdDateStr = getShortMonthDay(dt);  
            // e.g. "Sep 14"
        }

        // If branch_name is missing, we can show a placeholder
        const branchName = this.image.branch_name || "(No branch)";

        // Create H1 elements for the date and the branch
        const h1Date = document.createElement("h1");
        h1Date.style.margin = "0px";
        h1Date.style.marginBottom = "2px";
        h1Date.textContent = createdDateStr;

        const h1Branch = document.createElement("h1");
        h1Branch.style.margin = "0px";
        h1Branch.style.marginBottom = "24px";
        h1Branch.textContent = branchName;

        leftPanel.appendChild(h1Date);
        leftPanel.appendChild(h1Branch);

        // ----------------------------------
        // 2) Status
        // ----------------------------------
        const h2Status = document.createElement("h2");
        h2Status.textContent = "Status";
        const h3Status = document.createElement("h3");

        // If we have this.image.status, try to map via IMAGE_STATUS_REVERSE
        let statusText = "Unknown";
        if (
            typeof this.image.status === "number" &&
            IMAGE_STATUS_REVERSE[this.image.status]
        ) {
            statusText = IMAGE_STATUS_REVERSE[this.image.status];
        }
        h3Status.textContent = statusText;

        leftPanel.appendChild(h2Status);
        leftPanel.appendChild(h3Status);

        leftPanel.appendChild(document.createElement("br"));

        // ----------------------------------
        // 3) Template
        // ----------------------------------
        const h2Template = document.createElement("h2");
        h2Template.textContent = "Template";
        const h3TemplateName = document.createElement("h3");
        h3TemplateName.id = "title-template";

        // If we have a valid table_template, show its name
        let currentTemplateName = "-";
        if (
            isObject(this.table_template) &&
            isStringNonEmpty(this.table_template.name)
        ) {
            currentTemplateName = this.table_template.name;
        }
        h3TemplateName.textContent = currentTemplateName;

        leftPanel.appendChild(h2Template);
        leftPanel.appendChild(h3TemplateName);

        // A div that contains all the template options
        const templateSelect = document.createElement("div");
        templateSelect.id = "template-select";
        templateSelect.classList.add("vertical-menu");
        templateSelect.style.display = "inline-block";

        // For each table_template, create a <p> with event listeners
        if (Array.isArray(this.table_templates)) {
            this.table_templates.forEach((_table_template) => {
                const p = document.createElement("p");
                p.classList.add("vertical-menu-entry");
                p.style.cursor = "pointer";
                p.textContent = _table_template.name || "-";

                // Mouseover: draw table without saving
                p.addEventListener("mouseover", () => {
                    drawTableTemplate(_table_template, this.cells, this.image_id);
                });
                // Mouseout: revert to the currently selected template
                p.addEventListener("mouseout", () => {
                    drawTableTemplate(this.table_template, this.cells, this.image_id);
                });
                // Click: actually update the image's template
                p.addEventListener("click", () => {
                    drawTableTemplate(_table_template, this.cells, this.image_id);
                    this.updateTemplate(_table_template)
                        .then(() => {
                            // After updating, re-render left panel so the name & status update
                            this.renderLeftPanel();
                        })
                        .catch((err) => console.error(err));
                });

                templateSelect.appendChild(p);
            });
        }

        leftPanel.appendChild(templateSelect);

        leftPanel.appendChild(document.createElement("br"));
        leftPanel.appendChild(document.createElement("br"));

        // ----------------------------------
        // 4) Review
        // ----------------------------------
        const h2Review = document.createElement("h2");
        h2Review.textContent = "Review";
        const h3Review = document.createElement("h3");
        h3Review.id = "title-actions";

        // Logic to display the “approved” text
        let reviewText = "None";
        if (this.image.approved === true) {
            reviewText = "Approved";
        } else if (this.image.approved === false) {
            reviewText = "Refused";
        }
        h3Review.textContent = reviewText;

        leftPanel.appendChild(h2Review);
        leftPanel.appendChild(h3Review);

        // Action buttons
        const actionsSelect = document.createElement("div");
        actionsSelect.id = "actions-select";

        const approveBtn = document.createElement("button");
        approveBtn.id = "approve";
        approveBtn.textContent = "Approve";
        approveBtn.addEventListener("click", () => {
            this.updateApproved(true)
                .then(() => {
                    this.renderLeftPanel(); // Re-render to update "Approved" text
                })
                .catch((err) => console.error(err));
        });

        const refuseBtn = document.createElement("button");
        refuseBtn.id = "refuse";
        refuseBtn.textContent = "Reject";
        refuseBtn.addEventListener("click", () => {
            this.updateApproved(false)
                .then(() => {
                    this.renderLeftPanel(); // Re-render to update "Refused" text
                })
                .catch((err) => console.error(err));
        });

        actionsSelect.appendChild(approveBtn);
        actionsSelect.appendChild(refuseBtn);

        leftPanel.appendChild(actionsSelect);

        leftPanel.appendChild(document.createElement("br"));

        // ----------------------------------
        // 5) Reminder
        // ----------------------------------
        const pReminder = document.createElement("p");
        pReminder.style.fontStyle = "italic";
        pReminder.textContent = "Modifications will be saved upon closing of the window.";
        leftPanel.appendChild(pReminder);
    }
    
    /**
    * show(image_id, rect_id?): 
    *   Open the editor for a given image. 
    *   1) fetch image from server
    *   2) loadImage + loadCells
    *   3) draw
    */
    async show(image_id, rect_id = null) {
        if (!isStringNonEmpty(image_id)) {
            popup("Invalid image ID", "error");
            return;
        }
        this.image_id = image_id;
        
        // show the aside
        this.display = true;
        if (this.asideBox) {
            this.asideBox.style.display = "block";
        }
        
        // 1) get image info
        freeze();
        const response_image = await reqGET(this.server, ENDPOINT_IMAGE(this.image_id));
        unfreeze();
        
        if (!response_image || !isObject(response_image) || !isNumber(response_image.status) || response_image.status !== 200) {
            popup("Invalid image from server", "error");
            return;
        }
        this.image = response_image.data;
        
        // 2) set branch_name if we have a matching branch
        if (this.branches && Array.isArray(this.branches)) {
            const branch = this.branches.find(b => b.id === this.image.branch_id);
            if (branch && isObject(branch)) {
                this.image.branch_name = branch.name;
            }
        }
        
        // 3) build link
        const linkToImage = `${ENDPOINT_FILE(this.image_id)}?rotation=${this.image.rotation || 0}`;
        
        // 4) load the actual image
        freeze();
        const loaded = await loadImage(linkToImage);
        unfreeze();
        
        if (!loaded || !loaded.asset) {
            popup("Could not load image asset", "error");
            return;
        }
        
        // 5) load cells
        freeze();
        const results_cells = await loadCells(this.image_id, this.table_templates);
        unfreeze();
        if (results_cells) {
            const [ newCells, _ ] = results_cells;
            this.cells = newCells;
        }
        
        // 6) pick table_template
        if (Array.isArray(this.table_templates)) {
            this.table_template = this.table_templates.find(
                tpl => tpl.id === this.image.table_template_id
            );
        }
        
        // 7) prepare callbacks
        //    replaced callback_drag -> callbackDrag, callback_end -> callbackEnd 
        //    so we handle D3 pointer properly below
        const callbackDrag = () => {
            drawTableTemplate(this.table_template, this.cells, this.image_id);
        };
        const callbackEnd = async () => {
            this.updateTemplate(this.table_template);
        };
        
        // 8) run
        run(
            this.image,
            this.table_template,
            this.cells,
            loaded.asset,
            callbackDrag,
            callbackEnd
        );

        // Finally, after the image/cells are loaded & set:
        this.renderLeftPanel();
        
        // 9) done
        this.ready = true;
        
        if (rect_id) {
            // If you want to do something special with a given rect
            console.log("rect_id provided:", rect_id);
        }
    }
}

/**************************************************************
* Canvas config and styling
**************************************************************/
const ID_CANVAS_CONTAINER = 'canvas-container';
const ID_CANVAS_IMG = 'img-canvas';
const ID_CANVAS_OVERLAY = 'overlay-canvas';
const ID_CANVAS_VALUE = 'value-canvas';
const ID_CANVAS_SKETCH = 'sketch-canvas';

// styling
const textBottomPadding = 2;
const textFontStyle = 'bold 14px Arial';
const overlayBlackout_color = 'black';
const overlayBlackout_opacity = '1.0';
const overlayFailed_color = 'red';
const overlayFailed_opacity = '0.2';
const overlayNull_color = 'orange';
const overlayNull_opacity = '0.2';
const overlayString_color = 'SaddleBrown';
const overlayString_opacity = '0.2';
const overlayEmpty_color = 'SkyBlue';
const overlayEmpty_opacity = '0.4';
const overlayDecoded_color = 'green';
const overlayDecoded_opacity = '0.2';
const overlayOnMouseOver_color = 'white';
const overlayOnMouseOver_opacity = '0.8';

const color_main = '#085287';
const corner_circle_radius = 5;

/**************************************************************
* computeImageResizeFactor(image_width, image_height)
*   Figures out how to fit the image into #canvas-container
**************************************************************/
export function computeImageResizeFactor(image_width, image_height) {
    const container = document.getElementById(ID_CANVAS_CONTAINER);
    if (!container) {
        return {
            offsetLeft: 0,
            offsetTop: 0,
            width: image_width,
            height: image_height,
            resizeFactor: 1
        };
    }
    const { clientWidth, clientHeight } = container;
    
    let offsetLeft, offsetTop, w, h, resizeFactor;
    
    if (image_width < clientWidth && image_height < clientHeight) {
        offsetLeft = Math.round((clientWidth - image_width) / 2.0);
        offsetTop  = Math.round((clientHeight - image_height) / 2.0);
        w = image_width;
        h = image_height;
        resizeFactor = 1.0;
    } else {
        resizeFactor = Math.min(clientWidth / image_width, clientHeight / image_height);
        w = Math.floor(image_width * resizeFactor);
        h = Math.floor(image_height * resizeFactor);
        offsetLeft = Math.round((clientWidth - w) / 2.0);
        offsetTop  = Math.round((clientHeight - h) / 2.0);
    }
    
    return { offsetLeft, offsetTop, width: w, height: h, resizeFactor };
}

/**************************************************************
* init(image_width, image_height, image_resized_width, image_resized_height)
**************************************************************/
export function init(image_width, image_height, image_resized_width, image_resized_height) {
    const imgCanvas = document.getElementById(ID_CANVAS_IMG);
    const overlayCanvas = document.getElementById(ID_CANVAS_OVERLAY);
    const valueCanvas = document.getElementById(ID_CANVAS_VALUE);
    const sketchCanvas = document.getElementById(ID_CANVAS_SKETCH);
    
    // set base width/height
    imgCanvas.width = image_width;
    imgCanvas.height = image_height;
    
    // style-resize the canvases
    imgCanvas.style.width = `${image_resized_width}px`;
    imgCanvas.style.height = `${image_resized_height}px`;
    overlayCanvas.width = image_resized_width;
    overlayCanvas.height = image_resized_height;
    valueCanvas.width = image_resized_width;
    valueCanvas.height = image_resized_height;
    sketchCanvas.width = image_resized_width;
    sketchCanvas.height = image_resized_height;
}

/**************************************************************
* clear(): Clears all 4 canvases + the #svgbox
**************************************************************/
export function clear() {
    const imgCanvas = document.getElementById(ID_CANVAS_IMG);
    const overlayCanvas = document.getElementById(ID_CANVAS_OVERLAY);
    const valueCanvas = document.getElementById(ID_CANVAS_VALUE);
    const sketchCanvas = document.getElementById(ID_CANVAS_SKETCH);
    
    if (!imgCanvas || !overlayCanvas || !valueCanvas || !sketchCanvas) return;
    
    // 2D contexts
    const imgContext = imgCanvas.getContext('2d');
    const overlayContext = overlayCanvas.getContext('2d');
    const valueContext = valueCanvas.getContext('2d');
    const sketchContext = sketchCanvas.getContext('2d');
    
    // Clear each
    imgContext.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    valueContext.clearRect(0, 0, valueCanvas.width, valueCanvas.height);
    sketchContext.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
    
    // Clear the svg
    d3.select('#svgbox').selectAll('*').remove();
    
    // Remove event listeners from valueCanvas
    d3.select(valueCanvas).on('mousedown', null);
    d3.select(valueCanvas).on('mouseup', null);
    d3.select(valueCanvas).on('mousemove', null);
    d3.select(valueCanvas).on('mouseout', null);
    d3.select(valueCanvas).on('mouseover', null);
}

/**************************************************************
* renderOverlay(rectangles): draws rectangles with color-coded fills
**************************************************************/
export function renderOverlay(rectangles) {
    const overlayCanvas = document.getElementById(ID_CANVAS_OVERLAY);
    if (!overlayCanvas) return;
    
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    for (const rect of rectangles) {
        const {
            value,
            data_type,
            tl_x, tl_y,
            tr_x, tr_y,
            br_x, br_y,
            bl_x, bl_y
        } = rect;
        if (!data_type || data_type === 'info') continue;
        
        ctx.beginPath();
        ctx.moveTo(tl_x, tl_y);
        ctx.lineTo(tr_x, tr_y);
        ctx.lineTo(br_x, br_y);
        ctx.lineTo(bl_x, bl_y);
        ctx.closePath();
        
        if (data_type === 'blackout') {
            ctx.globalAlpha = overlayBlackout_opacity;
            ctx.fillStyle = overlayBlackout_color;
            ctx.fill();
        } else if (value === 'failed') {
            ctx.globalAlpha = overlayFailed_opacity;
            ctx.fillStyle = overlayFailed_color;
            ctx.fill();
        } else if (value === '') {
            ctx.globalAlpha = overlayEmpty_opacity;
            ctx.fillStyle = overlayEmpty_color;
            ctx.fill();
        } else if (isStringNonEmpty(value)) {
            ctx.globalAlpha = overlayDecoded_opacity;
            ctx.fillStyle = overlayDecoded_color;
            ctx.fill();
        } else if (data_type === 'string') {
            ctx.globalAlpha = overlayString_opacity;
            ctx.fillStyle = overlayString_color;
            ctx.fill();
        } else if (value === undefined || value === null) {
            ctx.globalAlpha = overlayNull_opacity;
            ctx.fillStyle = overlayNull_color;
            ctx.fill();
        }
    }
}

/**************************************************************
* renderValue(rectanglesToRender): draws text overlay
**************************************************************/
export function renderValue(rectanglesToRender) {
    const valueCanvas = document.getElementById(ID_CANVAS_VALUE);
    if (!valueCanvas) return;
    
    const ctx = valueCanvas.getContext('2d');
    ctx.clearRect(0, 0, valueCanvas.width, valueCanvas.height);
    
    if (!isArrayNonEmpty(rectanglesToRender)) return;
    
    for (const rect of rectanglesToRender) {
        const {
            value,
            data_type,
            tl_x, tl_y,
            tr_x, tr_y,
            br_x, br_y,
            bl_x, bl_y
        } = rect;
        
        if (!data_type || data_type === 'info' || data_type === 'blackout') continue;
        
        const ave_x0 = (tl_x + bl_x) / 2;
        const ave_x1 = (tr_x + br_x) / 2;
        const c_x = Math.round(ave_x0 + (ave_x1 - ave_x0) / 2);
        const bottom_y = Math.round((bl_y + br_y) / 2);
        
        // Draw a highlight
        ctx.beginPath();
        ctx.moveTo(tl_x, tl_y);
        ctx.lineTo(tr_x, tr_y);
        ctx.lineTo(br_x, br_y);
        ctx.lineTo(bl_x, bl_y);
        ctx.closePath();
        
        ctx.globalAlpha = overlayOnMouseOver_opacity;
        ctx.fillStyle = (value === 'failed') ? 'red' : overlayOnMouseOver_color;
        ctx.fill();
        
        // Draw text (if any)
        if (value === null) continue;
        ctx.font = textFontStyle;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText(value, c_x, bottom_y - textBottomPadding);
    }
}

/**************************************************************
* setInteractivity(image_id, rectangles)
*   Allows user to click on overlay & edit cell values
**************************************************************/
export function setInteractivity(image_id, rectangles) {
    const valueCanvas = document.getElementById(ID_CANVAS_VALUE);
    if (!valueCanvas) return;
    
    let mouseDown = 0;
    let rect_ids = new Set();
    
    d3.select(valueCanvas).on('mousedown', (e) => {
        mouseDown += 1;
        const rect_id = getPointedRectId(e, rectangles);
        if (rect_id !== -1) {
            rect_ids.clear();
            rect_ids.add(+rect_id);
        }
    });
    
    d3.select(valueCanvas).on('mousemove', (e) => {
        const rect_id = getPointedRectId(e, rectangles);
        if (rect_id === -1) return;
        
        // If mouse not pressed, just show value on hover
        if (mouseDown <= 0) {
            const m_rects = filterRectanglesByRectId(rect_id, rectangles);
            renderValue(m_rects);
            return;
        }
        
        // If pressed, multi-select
        rect_ids.add(+rect_id);
        const m_rects = filterRectanglesByRectId(rect_ids, rectangles);
        renderValue(m_rects);
    });
    
    d3.select(valueCanvas).on('mouseup', () => {
        const m_rect_ids = [...rect_ids];
        const m_rects = filterRectanglesByRectId(m_rect_ids, rectangles);
        
        mouseDown = 0;
        rect_ids.clear();
        renderValue();  // clear
        
        // On success
        const successAction = (newvalue) => {
            rectangles.forEach(r => {
                if (m_rect_ids.includes(+r.rect_id)) r.value = newvalue;
            });
            renderOverlay(rectangles);
            renderValue(m_rect_ids);
        };
        
        // Modify
        updateCells(image_id, m_rects, successAction);
    });
}

/**************************************************************
* run(image, table_template, rectangles, asset, callbackDrag, callbackEnd)
*   Main "draw" routine that sets up the canvases & corners
**************************************************************/
export function run(image, table_template, rectangles, asset, callbackDrag, callbackEnd) {
    // deep copy to avoid mutating original
    image = JSON.parse(JSON.stringify(image));
    rectangles = isArrayNonEmpty(rectangles) ? JSON.parse(JSON.stringify(rectangles)) : null;
    
    const image_width = asset.width;
    const image_height = asset.height;
    
    const container = document.getElementById(ID_CANVAS_CONTAINER);
    if (!container) return;
    
    const { clientWidth, clientHeight } = container;
    
    // compute best fit
    const { offsetTop, offsetLeft, width, height, resizeFactor } =
    computeImageResizeFactor(image_width, image_height);
    
    // init canvases
    init(image_width, image_height, width, height);
    clear();
    
    // draw image
    const imgCanvas = document.getElementById(ID_CANVAS_IMG);
    const ctx = imgCanvas.getContext('2d');
    ctx.drawImage(asset, 0, 0, image_width, image_height);
    
    // Default corners in the middle
    let corners = [
        [ (image_width * resizeFactor) / 4, (image_height * resizeFactor) / 4 ],
        [ (image_width * resizeFactor) * 3/4, (image_height * resizeFactor) / 4 ],
        [ (image_width * resizeFactor) * 3/4, (image_height * resizeFactor) * 3/4 ],
        [ (image_width * resizeFactor) / 4, (image_height * resizeFactor) * 3/4 ]
    ];
    
    // Add circles via d3
    const svg = d3.select('#svgbox');
    svg.selectAll('circle')
    .data(corners)
    .enter()
    .append('circle')
    .attr('cx', d => d[0])
    .attr('cy', d => d[1])
    .attr('r', corner_circle_radius)
    .attr('fill', color_main)
    .attr('stroke', color_main)
    .attr('stroke-width', 1)
    .attr('pointer-events', 'auto')
    .attr('cursor', 'pointer')
    .call(
        d3.drag()
        .on('drag', function (event, d) {
            // In D3 v6+, the new position comes from the event
            const [x, y] = d3.pointer(event, this);
            d3.select(this).attr('cx', x).attr('cy', y);
            callbackDrag();
        })
        .on('end', function () {
            callbackEnd();
        })
    );
    
    // If image not yet processed, we stop
    if (!isArrayNonEmpty(rectangles)) {
        return;
    }
    
    // Scale rectangles
    rectangles.forEach(r => {
        r.tl_x *= resizeFactor; r.tl_y *= resizeFactor;
        r.tr_x *= resizeFactor; r.tr_y *= resizeFactor;
        r.br_x *= resizeFactor; r.br_y *= resizeFactor;
        r.bl_x *= resizeFactor; r.bl_y *= resizeFactor;
    });
    
    // get corner points from the rectangles
    if (table_template) {
        corners = getCornerPoints(table_template.rectangles, rectangles);
    } else if (rectangles.length === 1) {
        corners = [
            [rectangles[0].tl_x, rectangles[0].tl_y],
            [rectangles[0].tr_x, rectangles[0].tr_y],
            [rectangles[0].br_x, rectangles[0].br_y],
            [rectangles[0].bl_x, rectangles[0].bl_y]
        ];
    }
    
    // update circle positions
    svg.selectAll('circle')
    .data(corners)
    .attr('cx', d => {
        const cx = d[0] + offsetLeft;
        if (cx < 0) return corner_circle_radius;
        if (cx > clientWidth) return clientWidth - corner_circle_radius;
        return cx;
    })
    .attr('cy', d => {
        const cy = d[1] + offsetTop;
        if (cy < 0) return corner_circle_radius;
        if (cy > clientHeight) return clientHeight - corner_circle_radius;
        return cy;
    });
    
    // render + set interactivity
    renderOverlay(rectangles);
    renderValue();
    setInteractivity(image.id, rectangles);
    
    // final
    callbackDrag();
}

/**************************************************************
* Helpers for setInteractivity: getPointedRectId, ...
**************************************************************/
function isPointInsidePolygon(pt, corners) {
    let inside = false;
    const [x, y] = pt;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const xi = corners[i][0], yi = corners[i][1];
        const xj = corners[j][0], yj = corners[j][1];
        const intersect = ((yi > y) !== (yj > y)) &&
        (x < ( (xj - xi) * (y - yi) / (yj - yi) + xi ));
        if (intersect) inside = !inside;
    }
    return inside;
}

function getPointedRectId(mousePos, rectangles) {
    const x = mousePos.layerX;
    const y = mousePos.layerY;
    for (const rect of rectangles) {
        const corners = [
            [rect.tl_x, rect.tl_y],
            [rect.tr_x, rect.tr_y],
            [rect.br_x, rect.br_y],
            [rect.bl_x, rect.bl_y]
        ];
        if (isPointInsidePolygon([x, y], corners)) {
            return rect.rect_id;
        }
    }
    return -1;
}

function filterRectanglesByRectId(rect_ids, rectangles) {
    if (isNumber(rect_ids)) {
        return rectangles.filter(r => +r.rect_id === +rect_ids);
    }
    if (isArrayNonEmpty(rect_ids)) {
        const asNums = rect_ids.map(id => +id);
        return rectangles.filter(r => asNums.includes(+r.rect_id));
    }
    if (rect_ids instanceof Set) {
        return rectangles.filter(r => rect_ids.has(+r.rect_id));
    }
    return [];
}

async function updateCells(image_id, cells, successAction) {
    if (!isArrayNonEmpty(cells)) return;
    
    // Ask user for a new value
    const value = await promptForCellValue(image_id, cells);
    // let value = window.prompt("Enter new value", "");
    // value = value ? value.trim() : null;
    if (!isString(value)) return;
    
    const payload = {
        rect_ids: cells.map(c => `${c.rect_id}`),
        image_id,
        value
    };
    
    const results = await reqPUT(DEFAULT_SERVER, ENDPOINT_CELLS, payload);
    if (!results || !isObject(results)) return;
    
    successAction(value);
}

/**************************************************************
* projectRectangles(table_template)
**************************************************************/
export function projectRectangles(table_template) {
    // Get DOM element
    const imgCanvas = document.getElementById(ID_CANVAS_IMG);
    if (!imgCanvas) return [];
    
    // Get the canvas width and height
    const image_width = imgCanvas.width;
    const image_height = imgCanvas.height;
    
    // compute image position and size in relation to the canvas
    const { offsetTop, offsetLeft } = computeImageResizeFactor(image_width, image_height);
    
    // get the circles position from the svg
    const svg = d3.select('#svgbox');
    const circles = svg.selectAll('circle').nodes();
    const corners = circles.map(circle => [
        Number(circle.getAttribute('cx')) - offsetLeft,
        Number(circle.getAttribute('cy')) - offsetTop
    ]);
    
    // check that we have 4 corners
    if (!Array.isArray(corners) || corners.length !== 4) {
        console.log('Error: we need 4 corners');
        return [];
    }
    
    // deep copy rectangles
    // table_template.rectangles = [{ x0, y0, w, h, ... }]
    const rectangles = JSON.parse(JSON.stringify(table_template.rectangles));
    
    // get the width and height of the entire rectangle region
    const width = Math.max(...rectangles.map(rect => rect.w + rect.x0));
    const height = Math.max(...rectangles.map(rect => rect.h + rect.y0));
    
    // projection matrix
    const src_points = [0, 0, width, 0, width, height, 0, height];
    const dst_points = [
        corners[0][0], corners[0][1],
        corners[1][0], corners[1][1],
        corners[2][0], corners[2][1],
        corners[3][0], corners[3][1]
    ];
    
    // build points for reproject
    const points = rectangles.map(rect => ({
        tl_x: rect.x0,
        tl_y: rect.y0,
        tr_x: rect.x0 + rect.w,
        tr_y: rect.y0,
        br_x: rect.x0 + rect.w,
        br_y: rect.y0 + rect.h,
        bl_x: rect.x0,
        bl_y: rect.y0 + rect.h
    }));
    
    // project
    const rectangles_projected = reproject(src_points, dst_points, points);
    
    // set other attributes
    rectangles_projected.forEach((rectangle, i) => {
        rectangle.rect_id = rectangles[i].id;
        rectangle.data_type = rectangles[i].data_type;
        rectangle.opts = rectangles[i].opts;
    });
    
    return rectangles_projected;
}

/**************************************************************
* drawTableTemplate(table_template, cells, image_id)
**************************************************************/
export function drawTableTemplate(table_template, cells, image_id) {
    // get the canvas and context
    const sketchCanvas = document.getElementById(ID_CANVAS_SKETCH);
    if (!sketchCanvas) return;
    const sketchContext = sketchCanvas.getContext('2d');
    
    sketchContext.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
    
    // check input variables
    if (!table_template) return;
    
    // get the reprojected rectangles
    const rectangles_proj = projectRectangles(table_template);
    if (!rectangles_proj.length) return;
    
    // draw all rectangles
    rectangles_proj.forEach(rect => {
        sketchContext.beginPath();
        sketchContext.strokeStyle = color_main;
        sketchContext.moveTo(rect.tl_x, rect.tl_y);
        sketchContext.lineTo(rect.tr_x, rect.tr_y);
        sketchContext.lineTo(rect.br_x, rect.br_y);
        sketchContext.lineTo(rect.bl_x, rect.bl_y);
        sketchContext.closePath();
        sketchContext.stroke();
    });
    
    // render overlay
    renderOverlay(rectangles_proj);
    
    if (!cells || !Array.isArray(cells) || !isString(image_id)) return;
    
    // map cell values, by id
    const cellsValueMap = {};
    cells.forEach(cell => {
        cellsValueMap[cell.rect_id] = cell.value;
    });
    
    // set values
    rectangles_proj.forEach(rect => {
        rect.value = cellsValueMap[rect.rect_id];
    });
    
    // re-render overlays
    renderOverlay(rectangles_proj);
    renderValue();
    
    // set interactivity
    setInteractivity(image_id, rectangles_proj);
}
