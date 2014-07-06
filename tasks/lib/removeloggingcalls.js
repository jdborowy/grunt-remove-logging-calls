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

    /**
     * Compute the breadth first search on syntax tree to get the list of nodes
     * @param {Node} rootNode the root node of the tree
     * @return {Node[]} the list of all the tree nodes
     */
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

    /**
     * Identify nodes that relate to console statements
     * @param {Node[]} nodes the list of nodes
     * @param {Node[]} methods the methods to identify
     * @param {String[]} methods the properties (functions) to catch for blanking
     */
    var getSegmentsToReplace = function(nodes, methods) {
        var segmentsToBlank = [];

        for (var i = 0, ii = nodes.length; i < ii; ++i) {
            // checks if the statement is a CallExpression
            if (nodes[i].type === 'CallExpression' &&
                    nodes[i].callee.type === 'MemberExpression') {
                var nodeExpression = nodes[i];
                // checks if the called function is a property of console or window.console
                if (nodeExpression.callee.object.name === 'console' || (
                        nodeExpression.callee.object.property !== undefined &&
                        nodeExpression.callee.object.object !== undefined &&
                        nodeExpression.callee.object.property.name === 'console' &&
                        nodeExpression.callee.object.object.name === 'window'
                )) {
                    // push the node if the current function is within the methods array
                    if (methods.indexOf(nodeExpression.callee.property.name) > -1) {
                        segmentsToBlank.push(nodeExpression.range);
                    }
                }
            }
        }
        // sort the range segments list
        segmentsToBlank.sort(function(a, b) {
            return a[0] - b[0];
        });
        // handle the case of nested segments : "console.log(console.log('foo'))"
        removeNestedSegments(segmentsToBlank);
        return segmentsToBlank;
    };

    /**
     * Remove segments that are nested in other
     * @param {Node[]} node the console calls nodes
     */
    var removeNestedSegments = function(segments) {
        var previousSegment = [-1, -1];
        var segmentIndicesToRemove = [];
        var cleanedSegmentArray = [];
        var i, ii;
        for (i = 0, ii = segments.length; i < ii; ++i) {
            if (!(previousSegment[0] <= segments[i][0] &&
                    previousSegment[1] >= segments[i][1])) {
                cleanedSegmentArray.push(segments[i]);
            }
            previousSegment = segments[i];
        }

        segments.length = 0;
        for (i = 0, ii = cleanedSegmentArray.length; i < ii; ++i) {
            segments.push(cleanedSegmentArray[i]);
        }
    };

    /**
     * 
     * @param {String} sourceCode the javascript source code to be cleaned
     * @param {String[]} methodNames the methods to catch on the console object for blanking
     * @param {function} strategy the strategy to replace console calls
     * @return {}
     */
    var process = function(sourceCode, methodNames, strategy) {
        // default console calls to replace
        methodNames = methodNames === undefined ? ['log', 'info', 'assert'] : methodNames;
        methodNames = Array.isArray(methodNames) ? methodNames : [methodNames];
        if (strategy === undefined) {
            // default strategy to replace console statements
            strategy = function(loggingStatement) {
                return 'null /* ' + loggingStatement + ' */';
            };
        }

        var syntaxTree = esprima.parse(sourceCode, { range: true });
        var nodes = breadthFirstSearch(syntaxTree);
        var segments = getSegmentsToReplace(nodes, methodNames);
        var result = '';
        var previousSegment = [0, 0];
        for (var i = 0, ii = segments.length; i < ii; ++i) {
            result += sourceCode.slice(previousSegment[1], segments[i][0]);
            result += strategy(sourceCode.slice(segments[i][0], segments[i][1]));
            previousSegment = segments[i];
        }
        result += sourceCode.slice(previousSegment[1], sourceCode.length);
        return result;
    };

    return {
        process: process
    };
};