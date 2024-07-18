/*
 * Copyright (c) 2024-2024 gazebo. All rights reserved.
 */

const Fuse = require('fuse.js')


var oldSearch;
var oldSetCurrentDiagram;
var old_toDataItem;

var diagramHistory = [];
var diagramIndex = -1;

async function _handleSelectDiagramInExplorer() {
    app.modelExplorer.select(app.diagrams.getCurrentDiagram(), true);
}

function changeNavigateMenuState() {
    app.menu.updateStates(null, {
        'xmi:navigate.back': isNavigateBackEnabled(),
        'xmi:navigate.forward': isNavigateForwardEnabled(),
        'xmi:navigate.clean': isNavigateBackEnabled() || isNavigateForwardEnabled()
    }, null);

    if (app.preferences.get("gxmi.general.debug")) {
        console.log('diagramIndex=', diagramIndex);
        for (let i = 0; i < diagramHistory.length; i++) {
            console.log(`${i == diagramIndex ? '->\t' : '\t'}${i}:${diagramHistory[i].name}:${diagramHistory[i]._id}`)
        }
    }
}

function isNavigateBackEnabled() {
    return diagramIndex >= 1;
}

function _handleNavigateBack() {
    if (isNavigateBackEnabled()) {
        diagramIndex--;
        // app.diagrams.openDiagram(diagramHistory[diagramIndex]);
        oldSetCurrentDiagram.call(app.diagrams, diagramHistory[diagramIndex], false);
        changeNavigateMenuState();
    }
}

function isNavigateForwardEnabled() {
    return diagramIndex < diagramHistory.length - 1;
}

function _handleNavigateForward() {
    if (isNavigateForwardEnabled()) {
        diagramIndex++;
        // app.diagrams.openDiagram(diagramHistory[diagramIndex]);
        oldSetCurrentDiagram.call(app.diagrams, diagramHistory[diagramIndex], false);
        changeNavigateMenuState();
    }
}

function _handleNavigateClean() {
    diagramHistory = [];
    diagramIndex = -1;
    changeNavigateMenuState();
}

function init() {
    app.commands.register('xmi:diagram.select-in-explorer', _handleSelectDiagramInExplorer)
    app.commands.register('xmi:navigate.back', _handleNavigateBack)
    app.commands.register('xmi:navigate.forward', _handleNavigateForward)
    app.commands.register('xmi:navigate.clean', _handleNavigateClean)

    oldSearch = Object.getPrototypeOf(app.repository).search;
    Object.getPrototypeOf(app.repository).search = searchPrioritized;

    oldSetCurrentDiagram = Object.getPrototypeOf(app.diagrams).setCurrentDiagram;
    Object.getPrototypeOf(app.diagrams).setCurrentDiagram = setCurrentDiagram;

    old_toDataItem = Object.getPrototypeOf(app.elementListPickerDialog)._toDataItem;
    Object.getPrototypeOf(app.elementListPickerDialog)._toDataItem = _toDataItem;
}

function getCurrentDiagramId() {
    return diagramIndex >= 0 && diagramHistory[diagramIndex] ? diagramHistory[diagramIndex]._id : ""
}

function setCurrentDiagram(diagram, skipEvent) {
    oldSetCurrentDiagram.call(app.diagrams, diagram, skipEvent);
    if (diagram && getCurrentDiagramId() != diagram._id) {
        if (diagramHistory.length > diagramIndex + 1 && diagramHistory[diagramIndex + 1]._id == diagram._id) {// same as forward
            diagramIndex++;
        } else if (diagramIndex > 0 && diagramHistory[diagramIndex - 1]._id == diagram._id) { // same as back
            diagramIndex--;
        } else {
            diagramIndex++;
            if (diagramIndex > 0) {
                diagramHistory = diagramHistory.slice(0, diagramIndex)
            }
            diagramHistory.push(diagram);
        }
    }
    changeNavigateMenuState();
}

function searchPrioritized(keyword, typeFilter) {
    keyword = keyword.toLowerCase();
    typeFilter = typeFilter || type.Element;
    var results = this.findAll((elem) => {
        var name = elem.name ? elem.name.toLowerCase() : '';
        return name.indexOf(keyword) > -1 && elem instanceof typeFilter;
    });
    const fuse = new Fuse(results, {
        keys: ['name'],
        includeScore: true,
        threshold: 0.5
    });
    results = fuse.search(keyword);
    return results.map(item => item.item);
}

function _toDataItem(elem) {
    let item = old_toDataItem.call(app.elementListPickerDialog, elem);
    var models = app.selections.getSelectedModels();
    if (models.length > 0) {
        if (models[0]._parent._id == elem._parent._id) {
            item.text = `->${item.text}`;
        }
    }
    return item;
}

exports.init = init;
