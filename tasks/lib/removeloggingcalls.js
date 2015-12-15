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
     * Recursive function to get the namespace and the method
     * @param {Node} obj expression
     * @param {String} stack variable to store hierarchy
     * @returns {string}
     */
    var getNamespace = function(obj, stack) {
        if(obj.object.object) {
            return getNamespace(obj.object, stack) + '.' + obj.property.name
        } else if(obj.object){
            return obj.object.name + "." + obj.property.name;
        }
    };

    /**
     * returns the namespace and the method name as an object
     * @param {Node} obj expression
     * @returns {{namespace: string, method: string}}
     */
    var getNamespaceAndMethod = function(obj) {
        var namespace = getNamespace(obj, '');

        return {
            namespace : namespace.substring(0, namespace.lastIndexOf(".")),
            method: namespace.substr(namespace.lastIndexOf(".") + 1)
        }
    };

    /**
     * Identify nodes that relate to console statements
     * @param {Node[]} nodes the list of nodes
     * @param {String[]} namespaces namespaces to identify
     * @param {String[]} methods the methods to identify
     * @return {String[]} methods the properties (functions) to catch for blanking
     */
    var getSegmentsToReplace = function(nodes, namespaces, methods) {
        var segmentsToBlank = [];

        for (var i = 0, ii = nodes.length; i < ii; ++i) {
            // checks if the statement is a CallExpression
            if (nodes[i].type === 'CallExpression' &&
                nodes[i].callee.type === 'MemberExpression') {
                var nodeExpression = nodes[i];
                // checks if the called function is a property of namespace
                var namespaceMethod = getNamespaceAndMethod(nodeExpression.callee);
                // push the node if the current function is within the namespaces and methods array
                if (namespaces.indexOf(namespaceMethod.namespace)!==-1 &&
                    methods.indexOf(namespaceMethod.method)!==-1) {
                    segmentsToBlank.push(nodeExpression.range);
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
     * @param {Node[]} segments the console calls nodes
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


    var spaceCode = ' '.charCodeAt(0);
    var tabCode = '\t'.charCodeAt(0);
    var semicolonCode = ';'.charCodeAt(0);

    /**
     *
     * @param {String} sourceCode the javascript source
     * @param {Number} start the start index
     * @param {Number} end the end index
     */
    var jumpAfterSemicolon = function(sourceCode, start, end) {

        for (var i = start; i < end; ++i) {
            switch (sourceCode.charCodeAt(i)) {
                case semicolonCode:
                    return i + 1;
                case spaceCode:
                case tabCode:
                    continue;
                default:
                    return start;
            }
        }
        return start;
    };

    /**
     *
     * @param {String} sourceCode the javascript source code to be cleaned
     * @param {String} namespaces the namespaces to catch the methods for blanking
     * @param {String[]} methodNames the methods to catch on the namespaces for blanking
     * @param {function} strategy the strategy to replace console calls
     * @param {Boolean} removeSemicolonIfPossible
     * @return {Object}
     */
    var process = function(sourceCode, namespaces, methodNames, strategy, removeSemicolonIfPossible) {
        // default namespace to replace
        namespaces = namespaces === undefined ? ['console', 'window.console'] : namespaces;
        // default console calls to replace
        methodNames = methodNames === undefined ? ['log', 'info', 'assert'] : methodNames;
        methodNames = Array.isArray(methodNames) ? methodNames : [methodNames];
        // by default do not remove the semicolon
        removeSemicolonIfPossible = removeSemicolonIfPossible !== undefined;
        if (strategy === undefined) {
            // default strategy to replace console statements
            if (removeSemicolonIfPossible) {
                strategy = function(loggingStatement) {
                    return '/* ' + loggingStatement + ' */';
                };
            } else {
                strategy = function(loggingStatement) {
                    return 'null /* ' + loggingStatement + ' */';
                };
            }

        }

        var syntaxTree = esprima.parse(sourceCode, { range: true });
        var nodes = breadthFirstSearch(syntaxTree);
        var segments = getSegmentsToReplace(nodes, namespaces, methodNames);
        var result = '';
        var previousSegment = [0, 0];
        for (var i = 0, ii = segments.length; i < ii; ++i) {
            result += sourceCode.slice(previousSegment[1], segments[i][0]);
            if (removeSemicolonIfPossible) {
                segments[i][1] = jumpAfterSemicolon(sourceCode, segments[i][1],
                        i + 1 < ii ? segments[i + 1][0] : sourceCode.length);
            }

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