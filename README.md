grunt-remove-logging-calls
==========================

## About

This plugin removes all or any part of console logging statements from javascript code.


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

Then, add some configuration (default configuration bellow):

```js
grunt.initConfig({
	// ...

	removeLoggingCalls: {
 		files: ['src/**/*.js'], // the files inside which you want to remove the console statements
 		options: {
			methods: ['log', 'info', 'assert'], // removes console.log(...), console.info(...) and console.assert(...)
			strategy: function(consoleStatement) { // removing strategy
				return '/* ' + consoleStatement + '*/'; // comments console calls statements
			}
		}
	}

    // ...
});
```