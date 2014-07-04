module.exports = function(grunt) {
    'use strict';

    grunt.registerMultiTask("removeLoggingCalls", "Remove all or any parts of logging statements", function() {
        var removeLoggingCalls = require("./lib/removeloggingcalls").init(grunt);;

        this.files.forEach(function(file) {
            var contents = file.src.filter(function(filepath) {
                // Remove nonexistent files (it's up to you to filter or warn here).
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Source file "' + filepath + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function(filepath) {
                var sourceCode = grunt.file.read(filepath);
                var result = removeLoggingCalls.process(sourceCode);
                grunt.file.write(filepath, result);
            });
        });
    });
};