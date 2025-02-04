'use strict';

// import datatype lib
import { isNumber, isStringNonEmpty, isDate, isArray } from './datatypes.js';

// months
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


export function ordinal_suffix(day){
    if (day === 1 || day === 21 || day === 31) return 'st';
    if (day === 2 || day === 22) return 'nd';
    if (day === 3 || day === 23) return 'rd';
    return 'th';
}


export function is_valid_day(value){
    if (!isNumber(value)) return false;
    if (+value < 0 || +value > 31) return false;    // we allow 0
    return true;
}

export function is_valid_month(value){
    if (!isNumber(value)) return false;
    if (+value < 0 || +value > 12) return false;    // we allow 0
    return true;
}

export function is_valid_year(value){
    if (!isNumber(value)) return false;
    const now_plus_5 = (new Date()).getFullYear() + 5;
    if (+value < 1900 || +value > now_plus_5) return false;    // we allow 0
    return true;
}


export function month_to_monthstr(month_index){
    return monthNames[month_index];
}


export function getShortMonthDay(datetime){
    if(!(datetime instanceof Date)){
        datetime = new Date(datetime);
    }

    const month = monthNames[(datetime.getMonth() + 1) - 1];
    const day = datetime.getDate();

    return `${month}, ${day}`;
}


export function unixToDate(unix){
    let date = null, day = null, month = null, year = null;

    // try to convert to date
    try{
        date = new Date(unix);
        day = date.getDate();
        month = date.getMonth() + 1;
        year = date.getFullYear();
    }catch(err){
        console.error(err);
    }

    // check
    if (!isNumber(day) || !isNumber(month) || !isNumber(year)) return null;

    // format
    day = day > 10 ? `${day}` : `0${day}`;
    month = month > 10 ? `${month}` : `0${month}`;

    return `${day}-${month}-${year}`
}


export function sortByDate(arr, index){
    if (!isArray(arr)) return null;
    if (arr.filter(el => !isDate(el[index])).length > 0) return null;
    if (arr.length <= 1) return arr;

    return arr.sort((a, b) => new Date(a[index]) - new Date(b[index]));
}

export function getFormattedDateTime(extra_seconds) {

    // Get datetime now
    let today = new Date();

    // Format time
    let second = String((today.getSeconds() + extra_seconds) % 60);
    if(second.length !== 2){
        second = "0" + second;
    }

    let extra_minute = Math.floor((today.getSeconds() + extra_seconds)/60.0);
    let minute = String((today.getMinutes() + extra_minute) % 60);
    if(minute.length !== 2){
        minute = "0" + minute;
    }

    let extra_hour = Math.floor((today.getMinutes() + extra_minute)/60.0);
    let hour = String((today.getHours() + extra_hour) % 24);
    if(hour.length !== 2){
        hour = "0" + hour;
    }

    // Format date
    let extra_day = Math.floor((today.getHours() + extra_hour)/24.0);
    let day = String(today.getDate() + extra_day);
    if(day.length !== 2){
        day = "0" + day;
    }

    let month = String(today.getMonth() + 1);   // JavaScript months are 0-based.
    if(month.length !== 2){
        month = "0" + month;
    }

    let year = String(today.getFullYear());

    // Return full datetime
    return year + "-" + month + "-" + day + "_" + hour + ":" + minute + ":" + second;
}


export function formatDateToYYYYMMDD(dstr) {
    const d = new Date(dstr);
    const yyyy = d.getFullYear();
    let mm = (d.getMonth()+1).toString().padStart(2,"0");
    let dd = d.getDate().toString().padStart(2,"0");
    return `${yyyy}-${mm}-${dd}`;
}


export function date_to_month_year(date){

    // months
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    let month = monthNames[(date.getMonth() + 1) - 1];   // JavaScript months are 0-based.
    let year = String(date.getFullYear());

    return `${month}, ${year}`;
}


export function dateToFormattedString(date) {
    if(typeof date === 'string'){
        return date;
    }
    if(typeof date !== 'object'){
        throw Error('invalid date format');
    }

    var month = '' + (date.getMonth() + 1),
        day = '' + date.getDate(),
        year = date.getFullYear();

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;

    return [year, month, day].join('-');
}


export function month_to_nbr(month){
    if(month.substring(0, 3).toLowerCase() === 'jan'){
        return `01`;
    }else if(month.substring(0, 3).toLowerCase() === 'feb'){
        return `02`;
    }else if(month.substring(0, 3).toLowerCase() === 'mar'){
        return `03`;
    }else if(month.substring(0, 3).toLowerCase() === 'apr'){
        return `04`;
    }else if(month.substring(0, 3).toLowerCase() === 'may'){
        return `05`;
    }else if(month.substring(0, 3).toLowerCase() === 'jun'){
        return `06`;
    }else if(month.substring(0, 3).toLowerCase() === 'jul'){
        return `07`;
    }else if(month.substring(0, 3).toLowerCase() === 'aug'){
        return `08`;
    }else if(month.substring(0, 3).toLowerCase() === 'sep'){
        return `09`;
    }else if(month.substring(0, 3).toLowerCase() === 'oct'){
        return `10`;
    }else if(month.substring(0, 3).toLowerCase() === 'nov'){
        return `11`;
    }else if(month.substring(0, 3).toLowerCase() === 'dec'){
        return `12`;
    }else{
        return null;
    }
}


export const parse_XX_XX_XXXX_date = function(value){

    // validate input
    if (!isStringNonEmpty(value)) return null;

    // is dd-mm-yyyy date
    if (/^\d{1,2}[-,\/]\d{1,2}[-,\/]\d{4}$/.test(value)){
        const [ day, month, year ] = value.includes('-') ? value.split('-') : value.split('/');
        if (is_valid_day(day) && is_valid_month(month) && is_valid_year(year)) {
            return `${+day}/${+month}/${+year}`;
        }
    }

    // is yyyy-mm-dd date
    if (/^\d{4}[-,\/]\d{1,2}[-,\/]\d{1,2}$/.test(value)){
        const [ year, month, day ] = value.includes('-') ? value.split('-') : value.split('/');
        if (is_valid_day(day) && is_valid_month(month) && is_valid_year(year)) {
            return `${+day}/${+month}/${+year}`;
        }
    }

    // is yy-mm-dd OR dd-mm-yy date
    if (/^\d{1,2}[-,\/]\d{1,2}[-,\/]\d{1,2}$/.test(value)){
        let [ day_or_year_1, month, day_or_year_2 ] = value.includes('-') ? value.split('-') : value.split('/');
        if ( is_valid_day(day_or_year_1) && is_valid_month(month) && is_valid_year(2000 + (+day_or_year_2)) ) {
            return `${+day_or_year_1}/${+month}/${2000 + (+day_or_year_2)}`;
        }
        if ( is_valid_day(day_or_year_2) && is_valid_month(month) && is_valid_year(2000 + (+day_or_year_1)) ) {
            return `${+day_or_year_2}/${+month}/${2000 + (+day_or_year_1)}`;
        }
    }

    return null;
}

export function create_XX_XX_XXXX_date(value){

    // validate
    if (!isStringNonEmpty(parse_XX_XX_XXXX_date(value))) return null;

    // parse
    const parsed_date = parse_XX_XX_XXXX_date(value);

    // split up
    const [day, month, year] = parsed_date.split('/');

    // build date
    return new Date(+year, (+month) - 1, +day);
}


export function todays_date_str(){

    // create date for today
    const today = new Date();

    // destructure
    const day = today.getDate();
    const month = today.getMonth(); // 0 indexed
    const year = today.getFullYear();

    // format
    const day_str = `${day}${ordinal_suffix(day)}`;
    const month_str = month_to_monthstr(month);
    const year_str = `${year}`;

    // assemble
    const today_str = `${month_str} ${day_str}, ${year_str}`;

    return today_str;
}
