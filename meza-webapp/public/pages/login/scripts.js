// login.js

// Load config
import { 
    DEFAULT_SERVER, 
    ENDPOINT_LOGIN_USING_CRED, 
    ENDPOINT_LOGIN_USING_SID,
    URL_DASHBOARD
} from '../../config.js';

// Import needed utilities.
import { 
    isStringNonEmpty, 
    isEmail, 
    isObject, 
    isNumber, 
    uuidValidateV4 
} from '../../assets/libs/datatypes.js';
import { 
    freeze,
    unfreeze
} from '../../assets/libs/ui.js';
import { reqPOST } from '../../assets/libs/http.js';

// Variables
let emailInput, passwordInput, errorMsgEl;


/**
* Attempt auto-login with existing SID (session ID).
*/
async function login_with_sid() {
    
    // Freeze UI (e.g., show spinner) if you want
    freeze();
    
    let response;
    try {
        response = await reqPOST(DEFAULT_SERVER, ENDPOINT_LOGIN_USING_SID, null);
    } catch (err) {
        console.error("Error - http request failed (SID login).", err);
        unfreeze();
        return;
    }
    
    unfreeze();
    
    // Validate response
    if (!isObject(response)) {
        console.error("Error - invalid response for SID login");
        return;
    }
    
    const { status, data } = response;
    if (!isNumber(status) || status !== 200) {
        let message = "http request failed";
        if (data && data.message) message = data.message;
        console.error("Error - " + message);
        return;
    }
    
    // Extract user data
    const access = isNumber(data.access) ? data.access : null;
    const email = isStringNonEmpty(data.email) ? data.email : null;
    
    if (!isNumber(access) || !isStringNonEmpty(email)) {
        console.error("Error - invalid access or email");
        return;
    }
    
    // If we get here, user is considered signed in
    // e.g., redirect to the dashboard
    window.location.href = URL_DASHBOARD;
}

/**
* Attempt login with user-entered credentials.
*/
async function login_with_cred() {
    
    // Clear error message
    errorMsgEl.textContent = "";
    
    const emailVal = emailInput.value.trim();
    const passwordVal = passwordInput.value.trim();
    
    // Validate inputs
    if (!isEmail(emailVal)) {
        errorMsgEl.textContent = "Enter a valid email";
        console.error("Enter a valid email");
        return;
    }
    if (!isStringNonEmpty(passwordVal)) {
        errorMsgEl.textContent = "Enter a valid password";
        console.error("Enter a valid password");
        return;
    }
    
    // Freeze UI
    freeze();
    
    // Send credentials to server
    let response;
    try {
        response = await reqPOST(DEFAULT_SERVER, ENDPOINT_LOGIN_USING_CRED, {
            email: emailVal,
            password: passwordVal
        });
    } catch (err) {
        console.error("Error - http request failed (login_with_cred).", err);
        errorMsgEl.textContent = "http request failed";
        unfreeze();
        return;
    }
    
    // Unfreeze
    unfreeze();
    
    // Check response
    if (!isObject(response)) {
        errorMsgEl.textContent = "http request failed";
        console.error("Error - http request failed");
        return;
    }
    
    const { status, data } = response;
    if (!isNumber(status) || status !== 200) {
        let message = "http request failed";
        if (data && data.message) message = data.message;
        errorMsgEl.textContent = message;
        console.error("Error - " + message);
        return;
    }
    
    // Extract sid
    const sid = data.sid;
    if (!uuidValidateV4(sid)) {
        errorMsgEl.textContent = "invalid sid";
        console.error("Error - invalid sid");
        return;
    }
    
    // If we get here, user is considered signed in.
    // Redirect to dashboard
    window.location.href = URL_DASHBOARD;
}

/**
* Entry point: On DOM ready, we attempt login_with_sid() first.
*/
document.addEventListener("DOMContentLoaded", async () => {
    
    // Grab references to DOM elements
    emailInput = document.getElementById("login-email");
    passwordInput = document.getElementById("login-password");
    errorMsgEl = document.getElementById("error-msg");
    
    // SID-based auto login attempt
    await login_with_sid();
    
    // If user is *not* already logged in after that, we rely on manual input
    
    // Button click => login_with_cred
    const btnSignin = document.getElementById("btn-signin");
    btnSignin.addEventListener("click", () => {
        login_with_cred();
    });
});
