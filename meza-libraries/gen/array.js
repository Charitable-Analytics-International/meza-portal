'use strict';


export function intersect(a, b) {
    var setA = new Set(a);
    var setB = new Set(b);
    var intersection = new Set([...setA].filter(x => setB.has(x)));
    return Array.from(intersection);
}


export function return_consensus(values){
    if(values === undefined || values === null || !Array.isArray(values) || values.length == 0) return null;
    
    if(values.length == 1){
        return values[0];

    }else if(values.length == 2){
        return (values[0] == values[1]) ? values[0] : null;

    }else if(values.length % 2 == 0){

        // get most frequent element
        const most_frequent = findMostFrequent(values);

        // count number is arr
        const nbr_of_occu = countOccurence(values, most_frequent);

        if(nbr_of_occu >= values.length/2.0){
            return most_frequent[0];
        }else{
            return null;
        }

    }else if(values.length % 2 == 1){

        // get most frequent element
        const most_frequent = findMostFrequent(values);

        // count number is arr
        const nbr_of_occu = countOccurence(values, most_frequent);

        if(nbr_of_occu > values.length/2.0){
            return most_frequent[0];
        }else{
            return null;
        }
    }
}


export function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}


function findMostFrequent(arr) {
    return arr
        .reduce((acc, cur, ind, arr) => {
            if (arr.indexOf(cur) === ind) {
            return [...acc, [cur, 1]];
            } else {
            acc[acc.indexOf(acc.find(e => e[0] === cur))] = [
                cur,
                acc[acc.indexOf(acc.find(e => e[0] === cur))][1] + 1
            ];
            return acc;
            }
        }, [])
        .sort((a, b) => b[1] - a[1])
        .filter((cur, ind, arr) => cur[1] === arr[0][1])
        .map(cur => cur[0]);
}


function countOccurence(arr, el){
    return arr.filter(d => {
        return d == el;
    }).length;
}
