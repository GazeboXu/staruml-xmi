/*
 * Copyright (c) 2024-2024 gazebo. All rights reserved.
 */

const Fuse = require('fuse.js')


var oldSearch;
var oldOpenDiagram;

var diagramHistory = [];
var diagramIndex = -1;

async function _handleSelectDiagramInExplorer () {
    app.modelExplorer.select(app.diagrams.getCurrentDiagram(), true);
}

function changeNavigateMenuState() {
    app.menu.updateStates(null, {
        "xmi:navigate.back": isNavigateBackEnabled(),
        "xmi:navigate.forward": isNavigateForwardEnabled()
    }, null);
}

function isNavigateBackEnabled() {
    return diagramIndex >= 1;
}

function _handleNavigateBack() {
    if (isNavigateBackEnabled()) {
        diagramIndex--;
        oldOpenDiagram.call(app.diagrams, diagramHistory[diagramIndex]);
        app.diagrams.setCurrentDiagram(diagramHistory[diagramIndex], false);
        changeNavigateMenuState();
    }
}

function isNavigateForwardEnabled() {
    return diagramIndex < diagramHistory.length - 1;
}

function _handleNavigateForward() {
    if (isNavigateForwardEnabled()) {
        diagramIndex++;
        oldOpenDiagram.call(app.diagrams, diagramHistory[diagramIndex]);
        app.diagrams.setCurrentDiagram(diagramHistory[diagramIndex], false);
        changeNavigateMenuState();
    }
}

function init () {
    app.commands.register('xmi:diagram.select-in-explorer', _handleSelectDiagramInExplorer)
    app.commands.register('xmi:navigate.back', _handleNavigateBack)
    app.commands.register('xmi:navigate.forward', _handleNavigateForward)

    oldSearch = Object.getPrototypeOf(app.repository).search;
    Object.getPrototypeOf(app.repository).search = searchPrioritized;

    oldOpenDiagram = Object.getPrototypeOf(app.diagrams).openDiagram;
    Object.getPrototypeOf(app.diagrams).openDiagram = openDiagram;
}

function openDiagram(diagram) {
    oldOpenDiagram.call(app.diagrams, diagram);
    diagramIndex++;
    if (diagramIndex > 0) {
        diagramHistory = diagramHistory.slice(0, diagramIndex)
    }
    diagramHistory.push(diagram);
    changeNavigateMenuState();
}

function searchPrioritized(keyword, typeFilter) {
    keyword = keyword.toLowerCase();
    typeFilter = typeFilter || type.Element;
    var results = this.findAll((elem) => {
      var name = elem.name ? elem.name.toLowerCase() : "";
      return name.indexOf(keyword) > -1 && elem instanceof typeFilter;
    });
    const fuse = new Fuse(results, {
      keys: ["name"],
      includeScore: true,
      threshold: 0.5
    });
    results = fuse.search(keyword);
    return results.map(item => item.item);
  }

exports.init = init;
