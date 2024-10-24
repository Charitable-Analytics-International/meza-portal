'use strict'

// import lib
import { autoComplete } from './auto-complete.min.js';
import * as d3 from 'd3';


export const searchBar = function(sources, selector_input, selector_button) {
    "use strict";

    var self = {};
    var isSearching = false;

    self.search = function() {};
    self.reset = function() {};

    // grab elements
    var searchBarInput = d3.select(selector_input);
    var searchBarButton = d3.select(selector_button);

    // Initialize auto-completion
    new autoComplete({
        selector: selector_input,
        minChars: 1,
        source: function(term, suggest) {
            term = term.toLowerCase();
            var matches = [];
            sources.forEach(function(d) {
                if (~d.name.toLowerCase().indexOf(term)) {
                    matches.push(d);
                }
            });
            suggest(matches);
        },
        renderItem: function(item, search) {
            var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
            const html = "<div class='autocomplete-suggestion' data-id='" + item.id + "' data-val='"
            + item.name + "'>" + item.name.replace(re, "<b>$1</b>") + "</div>";
            return html;
        },
        onSelect: function(e, term, item) {
            isSearching = true;
            self.search(+item.getAttribute("data-id"), item.getAttribute("data-val"));
        }
    });

    // Add the event on the search bar and the button
    searchBarInput.on("keydown", function (e) {
        if (e.code === "Enter") {
            validateInput();
        } else {
            isSearching = false;
            self.reset();
            searchBarInput.classed("error", false);
        }
    });

    searchBarButton.on("click", validateInput);

    /**
    * Validate the input value before performing the search
    */
    function validateInput() {
        if (isSearching) {
            return;
        }
        function normalize(str) {
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }
        var value = searchBarInput.node().value.toLowerCase();
        if (!value) {
            return;
        }
        var currentValue = normalize(value);
        const valueFound = sources.find(function(zone) {
            return normalize(zone.name.toLowerCase()) === currentValue;
        });
        if (valueFound) {
            isSearching = true;
            self.search(valueFound.id, valueFound.name);
        } else {
            isSearching = false;
            self.reset();
            searchBarInput.classed("error", true);
        }
    }

    return self;
};
