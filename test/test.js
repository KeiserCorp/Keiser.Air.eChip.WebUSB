"use strict";
exports.__esModule = true;
var index_1 = require("../src/echip/index");
document.addEventListener('DOMContentLoaded', function (event) {
    var connectButton = document.querySelector('#connect');
    if (connectButton) {
        connectButton.addEventListener('click', function () {
            console.log(index_1["default"].name);
        });
    }
});
