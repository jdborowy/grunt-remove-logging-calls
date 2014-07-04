/*
 * grunt-remove-logging-calls
 * http://gruntjs.com/
 *
 * Copyright (c) 2014 Jean-Daniel Borowy
 * Licensed under the MIT license.
 */

exports.init = function(grunt) {
    'use strict';

    var esprima = module.require('esprima');

    var breadthFirstSearch = function(rootNode) {
        // queue to compute de breadth first search
        var queue = [rootNode]; 
        var nodes = [rootNode];

        while (queue.length !== 0) {
            // fetch child nodes of the first node of the queue
            var currentNode = queue.shift();
            for (var property in currentNode) {
                // compute only non-inherited properties
                if (currentNode.hasOwnProperty(property)) { 
                    if (Array.isArray(currentNode[property])) {
                        var nodeArray = currentNode[property];
                        for (var i = 0, ii = nodeArray.length; i < ii; ++i) {
                            // enqueue only if it is a Node instance
                            if (nodeArray[i] instanceof rootNode.constructor) {
                                queue.push(nodeArray[i]);
                                nodes.push(nodeArray[i]);
                            }
                        }
                    } else
                        // enqueue only if it is a Node instance
                        if (currentNode[property] instanceof rootNode.constructor) { 
                            queue.push(currentNode[property]);
                            nodes.push(currentNode[property]);
                        }
                }
            }
        }
        return nodes;
    };

    var getSegmentsToRemove = function(nodes, methods) {
        var segmentsToBlank = [];

        for (var i = 0, ii = nodes.length; i < ii; ++i) {
            if (nodes[i].type === 'CallExpression' &&
                    nodes[i].callee.type === 'MemberExpression') {
                var nodeExpression = nodes[i];
                if (nodeExpression.callee.object.name === 'console' || (
                        nodeExpression.callee.object.property !== undefined &&
                        nodeExpression.callee.object.object !== undefined &&
                        nodeExpression.callee.object.property.name === 'console' &&
                        nodeExpression.callee.object.object.name === 'window'
                )) {
                    if (methods.indexOf(nodeExpression.callee.property.name) > -1) {
                        segmentsToBlank.push(nodeExpression.range);
                    }
                }
            }
        }
        segmentsToBlank.sort(function(a, b) {
            return a[0] >= b[0];
        });
        removeNestedSegments(segmentsToBlank);
        return segmentsToBlank;
    };

    var removeNestedSegments = function(segments) {
        var previousSegment = [-1, -1];
        var segmentIndicesToRemove = [];
        var i, ii;
        for (i = 0, ii = segments.length; i < ii; ++i) {
            if (previousSegment[0] <= segments[i][0] &&
                    previousSegment[1] >= segments[i][1]) {
                segmentIndicesToRemove.push(i);
            }
            previousSegment = segments[i];
        }

        for (i = 0, ii = segmentIndicesToRemove.length; i < ii; ++i) {
            segments.splice(segmentIndicesToRemove[i], 1);
        }
    };

    var process = function(sourceCode, methodNames, strategy) {
        methodNames = methodNames === undefined ? ['log', 'info', 'assert'] : methodNames;
        methodNames = Array.isArray(methodNames) ? methodNames : [methodNames];
        if (strategy === undefined) {
            strategy = function(loggingStatement) {
                return 'null /* ' + loggingStatement + ' */';
            };
        }

        var tree = esprima.parse(sourceCode, { range: true });
        var nodes = breadthFirstSearch(tree);
        var segments = getSegmentsToRemove(nodes, methodNames);
        var result = '';
        var previousSegment = [0, 0];
        for (var i = 0, ii = segments.length; i < ii; ++i) {
            result += sourceCode.slice(previousSegment[1], segments[i][0]) +
            strategy(sourceCode.slice(segments[i][0], segments[i][1]));
            previousSegment = segments[i];
        }
        result += sourceCode.slice(previousSegment[1], sourceCode.length);
        return result;
    };

    return {
        process: process
    };
};