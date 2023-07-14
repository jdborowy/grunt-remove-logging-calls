grunt-remove-logging-calls
==========================

## About

This plugin removes/replaces all or any part of console logging statements from javascript code.
It handles complex cases like `console.log('hello: ' + foo(), bar())` because it's based on the syntax tree given by Esprima.


## Getting Started

This plugin requires Grunt.
Install this plugin with the command:

```js
npm install grunt-remove-logging-calls
```

Once the plugin has been installed, enable it inside the Gruntfile: 

```js
grunt.loadNpmTasks('grunt-remove-logging-calls');
```

Finally, add some configuration.

## Configuration

```js
grunt.initConfig({
	// ...

	removeLoggingCalls: {
		// the files inside which you want to remove the console statements
 		files: ['src/**/*.js'],
 		options: {
 		    // an array of namespaces to remove
 		    namespaces: ['console', 'window.console'],
 			// an array of method names to remove
			methods: ['log', 'info', 'assert'], 
			
			// replacement strategy
			strategy: function(consoleStatement) {
				// comments console calls statements
				return '/* ' + consoleStatement + '*/';

				// return ''; // to remove 
			},
			
			// when the logging statement is ended by a semicolon ';'
			// include it in the 'consoleStatement' given to the strategy
			removeSemicolonIfPossible: true
		
		}
	}

    // ...
});
```

If you want to integrate this with grunt usemin, here the [blog post](http://grunt-tasks.com/grunt-remove-logging-calls/ "grunt remove logging calls") explaining it.
