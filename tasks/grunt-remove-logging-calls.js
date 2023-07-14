module.exports = function(grunt) {
    'use strict';

    grunt.registerMultiTask("removeLoggingCalls", "Remove all or any parts of logging statements", function() {
        var removeLoggingCalls = require("./lib/removeloggingcalls").init(grunt);

        var options = this.options();
        this.files.forEach(function(file) {
            file.src.filter(function(filepath) {
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Source file "' + filepath + '" not found.');
                } else {
                    var sourceCode = grunt.file.read(filepath);
                    var result = removeLoggingCalls.process(sourceCode, options.namespaces, options.methods, options.strategy, options.removeSemicolonIfPossible);
                    grunt.file.write(filepath, result);
                }
            });
        });
    });
};