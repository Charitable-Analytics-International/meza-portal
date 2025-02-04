// dashboard.js

/********************************************************************
* Configuration and Constants
********************************************************************/
import { 
    DEFAULT_SERVER, 
    ENDPOINT_PROJECT,
    ENDPOINT_BRANCHES,
    ENDPOINT_IMAGES,
    ENDPOINT_TABLE_TEMPLATES,
    ENDPOINT_IMAGES_STATISTICS,
    ENDPOINT_EXPORT,
    ENDPOINT_FILE,
    ENDPOINT_FILE_CELL,
    ENDPOINT_CELLS,
    IMAGE_STATUS,
    URL_LOGIN
} from '../../config.js';


// Reverse IMAGE_STATUS to easily map numeric codes -> string keys
const IMAGE_STATUS_REVERSE = {};
for (const key in IMAGE_STATUS) {
    IMAGE_STATUS_REVERSE[IMAGE_STATUS[key]] = key;
}


/********************************************************************
* Imports: Utilities & Libs
********************************************************************/
import {
    isNumber,
    isObject,
    isArray,
    isArrayNonEmpty,
    isString,
    isStringNonEmpty, 
    uuidValidateV4
} from '../../assets/libs/datatypes.js';

import { freeze, unfreeze } from '../../assets/libs/ui.js';
import { reqGET, reqPUT } from '../../assets/libs/http.js';
import { getUrlParams } from '../../assets/libs/url.js';
import { getFormattedDateTime, formatDateToYYYYMMDD } from '../../assets/libs/datetime.js';

// Components
import { createImageContainer } from './components/ImageBox.js';
import { ImageEditor } from './components/ImageEditor.js';

/********************************************************************
* State: Local Variables for Dashboard Data
********************************************************************/
let project = null;
let branches = [];
let images = [];
let table_templates = [];
let statistics = [];
let branchIdFilter = null;

/********************************************************************
 * We'll store an instance of ImageEditor so we can open it easily
 ********************************************************************/
let editor = null;

/********************************************************************
* URL Params: Check if an image_id is present
********************************************************************/
const { image_id, rect_id } = getUrlParams(window.location.href);


/********************************************************************
* Data Fetching
********************************************************************/
/**
* Fetches all required data from the server (project, branches, images, etc.)
* Returns an array [project, branches, images, table_templates, statistics]
* or null if something went wrong.
*/
async function getData() {
    const promises = [
        reqGET(DEFAULT_SERVER, ENDPOINT_PROJECT),
        reqGET(DEFAULT_SERVER, ENDPOINT_BRANCHES),
        reqGET(DEFAULT_SERVER, ENDPOINT_IMAGES),
        reqGET(DEFAULT_SERVER, ENDPOINT_TABLE_TEMPLATES),
        reqGET(DEFAULT_SERVER, ENDPOINT_IMAGES_STATISTICS)
    ];
    
    let responses = null;
    try {
        responses = await Promise.all(promises);
    } catch (error) {
        console.error("Error during data fetching:", error);
        return null;
    }
    
    // Basic validation
    if (!isArray(responses) || responses.length !== promises.length) {
        console.error("Could not load the data. Unexpected response array.");
        return null;
    }
    
    // Check HTTP statuses
    const statuses = responses.map(r => +r.status);
    if (statuses.includes(401)) {
        console.error("Session expired (401). Reloading...");
        window.location.href = URL_LOGIN;
        return null;
    }
    if (statuses.some(s => s >= 400)) {
        console.error("One or more requests failed (>=400).");
        return null;
    }
    
    // Unpack data from each response
    return responses.map(r => r.data);
}


/********************************************************************
* Downloading Data
********************************************************************/
/**
* Downloads a CSV containing all relevant cells from the images displayed.
*/
async function downloadData() {
    freeze();
    const results = await reqGET(DEFAULT_SERVER, ENDPOINT_EXPORT);
    unfreeze();
    
    if (!isObject(results)) {
        console.error("Failed to retrieve data (not an object).");
        return;
    }
    
    const { status, data } = results;
    if (!isNumber(status) || +status >= 400) {
        console.error("Failed to retrieve data (HTTP error).");
        return;
    }
    
    // Convert the returned data to CSV
    const csv = data.map(row => `"${row.join('","')}"`).join('\n');
    const filename = "meza_" + getFormattedDateTime() + ".csv";
    const blob = new Blob([csv], { type: "text/csv" });
    
    if (window.navigator.msSaveOrOpenBlob) {
        // IE11 support
        window.navigator.msSaveBlob(blob, filename);
    } else {
        // Standard browsers
        const elem = document.createElement("a");
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}
// Hook up the download button
document.getElementById("download-button").addEventListener("click", downloadData);


/********************************************************************
* Main Page Initialization (DOMContentLoaded)
********************************************************************/
window.addEventListener("DOMContentLoaded", async () => {
    freeze();
    
    // 1) Fetch data
    const data = await getData();
    if (!data || !isArray(data)) {
        console.error("Could not load the data. Aborting.");
        unfreeze();
        return;
    }
    
    // 2) Unpack results
    [project, branches, images, table_templates, statistics] = data;
    
    // 3) Convert branches to a map of id -> name
    const branch_id_to_name = {};
    branches.forEach(br => {
        branch_id_to_name[br.id] = br.name;
    });
    
    // 4) Add 'branch_name' to each image
    images.forEach(img => {
        img.branch_name = (img.branch_id === null)
        ? "Unknown"
        : branch_id_to_name[img.branch_id];
    });
    
    // 5) Sort images descending by created_at
    images.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 6) Merge in statistics data: find matching stats by image.id
    images = images.map(image => {
        const image_statistics = statistics.find(s => s.image_id === image.id);
        return { ...image, ...image_statistics };
    });
    
    // 7) Filter images: keep last 4 months
    const now = new Date();
    const dateCutoff = new Date(now.getFullYear(), now.getMonth() - 4, 1);
    images = images.filter(img => new Date(img.created_at) >= dateCutoff);
    console.log(`Displaying ${images.length} images, since ${dateCutoff.toDateString()}`);
    
    // 8) Show relevant sections now that data is ready
    document.getElementById("labels-container").style.display = "flex";
    document.getElementById("filter-branch").style.display = "inline-block";
    document.getElementById("imageGallery").style.display = "flex";
    document.getElementById("download-button").style.display = "block";
    
    // 9) Populate the branch filter (select dropdown)
    populateSelectBranch(branches);
    
    // 10) Build (render) the gallery
    buildImageGallery(images);
    
    // 11) Create the editor instance
    editor = new ImageEditor({
        branches,
        table_templates
    });
    
    // 12) Unfreeze
    unfreeze();
    
    // 13) If there's a valid image_id in URL, open that image right away
    if (uuidValidateV4(image_id)) {
        // Clear the URL params in the browser bar
        window.history.replaceState(null, null, window.location.pathname);
        
        // Now open the image box
        openImageBox(image_id, rect_id);
    }
});


/********************************************************************
* populateSelectBranch(branches): fill the <select> for branch filter
********************************************************************/
function populateSelectBranch(branches) {
    const selectBranch = document.getElementById("filter-branch");
    
    // 1) Add an "All Branches" option
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All Branches";
    selectBranch.appendChild(optAll);
    
    // 2) Add each branch
    branches.forEach(br => {
        const opt = document.createElement("option");
        opt.value = br.id;
        opt.textContent = br.name;
        selectBranch.appendChild(opt);
    });
    
    // 3) Listen for changes -> filter displayed images
    selectBranch.addEventListener("change", (e) => {
        const val = e.target.value;
        branchIdFilter = (val === "") ? null : parseInt(val, 10);
        
        const gallery = document.getElementById("imageGallery");
        const containers = gallery.querySelectorAll(".imageContainer");
        containers.forEach(cont => {
            const imageBranchId = cont.getAttribute("data-branchid");
            if (!branchIdFilter) {
                cont.style.display = "flex";
            } else {
                // Compare numeric IDs
                if (parseInt(imageBranchId, 10) === branchIdFilter) {
                    cont.style.display = "flex";
                } else {
                    cont.style.display = "none";
                }
            }
        });
    });
}


/********************************************************************
* buildImageGallery(imagesArr): Build out the DOM elements for images
********************************************************************/
function buildImageGallery(imagesArr) {
    const galleryDiv = document.getElementById("imageGallery");
    // Clear existing
    galleryDiv.innerHTML = "";
    
    imagesArr.forEach(img => {
        const containerEl = createImageContainer(img, table_templates, openImageBox);
        galleryDiv.appendChild(containerEl);
    });
}


/********************************************************************
* openImageBox(imageID, rectID): Show the aside popup (editor)
********************************************************************/
const openImageBox = async function(_image_id, _rect_id = null) {
    if (!editor) {
        console.error("Editor is not initialized yet!");
        return;
    }
    editor.show(_image_id, _rect_id);
};

// If you have a "Close" button in the HTML for the aside, you could let the editor attach it internally
// or you can do something like:
const closeBtn = document.getElementById("close_image_box");
if (closeBtn) {
    closeBtn.addEventListener("click", () => {
        // Hide <aside>
        document.getElementById("image_box").style.display = "none";
    });
}
