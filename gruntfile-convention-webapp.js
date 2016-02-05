module.exports = function(grunt, modifyConfig) {

	var buildTasks = [ 'clean', 'build_bower_dep', 'build_js', 'build_css', 'build_tmpl', 'build_assets', 'build_html', 'build_index' ];
	grunt.task.registerTask('build', buildTasks);
	grunt.task.registerTask('test', [ 'bower', 'karma' ]);
	grunt.task.registerTask('run', [ 'build', 'configureProxies:server', 'connect', 'watch' ]);
	var distTasks = [ 'build', 'uglify', 'cssmin', 'copy:assets_dist', 'includeSource:dist', 'wiredep:dist', 'cacheBust', 'htmlmin' ];
	grunt.task.registerTask('dist', distTasks);

	grunt.task.registerTask('build_bower_dep', [ 'bower', 'copy:bower' ]);
	grunt.task.registerTask('build_js', [ 'jshint', 'copy:js' ]);
	grunt.task.registerTask('build_css', [ 'less' ]);
	grunt.task.registerTask('build_tmpl', [ ]);
	grunt.task.registerTask('build_assets', [ 'copy:assets' ]);
	grunt.task.registerTask('build_html', [ 'htmlangular' ]);
	grunt.task.registerTask('build_index', [ 'includeSource:build', 'wiredep:build' ]);

	grunt.registerMultiTask('wiredep', 'Inject Bower components into your source code.', function () {
		// Like grunt-wiredep, but skips assets/**/*.html
		this.data.src = require('glob').sync(this.data.src).filter(noAssets);
		require('wiredep')(this.options(this.data));
	});

	var config = {
		pkg: grunt.file.readJSON('package.json'),
		bower: {
			// Install bower dependencies
			install: { options: { copy: false } }
		},
		karma: {
			// Run tests
			unit: { configFile: 'node_modules/gruntfile-convention-webapp/karma.conf.js' }
		},
		clean: {
			// Remove build and dist folders
			build: [ 'build', 'dist' ]
		},
		jshint: {
			// Validate JS files
			files: [ 'src/js/**/*.js']
		},
		htmlangular: {
			// Validate html files and angular templates
			build: { options: { reportpath: null, reportCheckstylePath: null, customattrs: [], customtags: [] }, files: [{ src: [ 'src/**/*.html' ], filter: noAssets }] }
		},
		copy: {
			// Copy files to build folder
			bower: { files: [ { expand: true, src: [ 'bower_components/**/*.*' ], dest: 'build', filter: onlyDepsFromWiredep() } ] },
			js: { files: [ { expand: true, cwd: 'src', src: [ 'js/**/*.js' ], dest: 'build', filter: environment } ] },
			assets: { files: [ { expand: true, cwd: 'src', src: [ 'assets/**/*.*' ], dest: 'build' } ] },
			assets_dist: { files: [ { expand: true, cwd: 'build', src: [ 'assets/**/*.*' ], dest: 'dist' } ] }
		},
		less: {
			// Compile less files
			build: { files: { 'build/css/styles.css': 'src/less/styles.less' } }
		},
		includeSource: {
			// Add src style and script tags to index.html
			build: { options: { basePath: 'build' }, files: [ { expand: true, cwd: 'src', src: [ '**/*.html' ], dest: 'build', filter: noAssetsNoTmpl } ] },
			dist: { options: { basePath: 'dist' }, files: [ { expand: true, cwd: 'src', src: [ '**/*.html' ], dest: 'dist', filter: noAssetsNoTmpl } ] }
		},
		wiredep: {
			// Add bower style and script tags to index.html
			build: { src: 'build/**/*.html', ignorePath: /^\.\.\//, bower: {install: true} },
			dist: { src: 'dist/**/*.html', ignorePath: /^\.\.\//, bower: {install: true} }
		},
		watch: {
			// Watch for changes and update build folder
			js: { files: 'src/js/**/*.js', tasks: [ 'build_js', 'build_index' ] },
			css: { files: 'src/less/**/*.less', tasks: [ 'build_css' ] },
			assets: { files: 'src/assets/**/*.*', tasks: [ 'build_assets' ] },
			html: { files: [ 'src/**/*.html', '!src/assets/**/*.html'], tasks: [ 'build_html', 'build_index' ] }
		},
		connect: {
			// Run http server
			server: {
				options: {
					base: 'build',
					middleware: function (connect, options, defaultMiddleware) {
						var proxy = require('grunt-connect-proxy/lib/utils').proxyRequest;
						var singlePageAppRewrite = require('connect-modrewrite')([
							'!^/(bower_components|css|git_modules|js|tmpl|assets)/ /index.html'
						]);
						var configuredSinglePageAppRewrite = function(req, res, next) {
							if (!options.singlePageApp) {
								return next();
							}
							singlePageAppRewrite(req, res, next);
						};
						return [ proxy, configuredSinglePageAppRewrite ].concat(defaultMiddleware);
					}
				}
			}
		},
		uglify: {
			// Move JS files from build to dist and minimize
			js: { files: { 'dist/js/<%= pkg.name %>.js': [ 'build/js/**/*.js'] } },
			bower: { files: [ { expand: true, cwd: 'build', src: 'bower_components/**/*.js', dest: 'dist' } ] }
		},
		cssmin: {
			// Move CSS files from build to dist and minimize
			css: { files: { 'dist/css/<%= pkg.name %>.css': [ 'build/css/**/*.css'] } },
			bower: { files: [ { expand: true, cwd: 'build', src: 'bower_components/**/*.css', dest: 'dist' } ] }
		},
		htmlmin: {
			// Move HTML files from build to dist and minimize
			options: { removeComments: true, collapseWhitespace: true },
			templates: { files: [ { expand: true, src: 'dist/**/*.html', filter: noAssets } ] }
		},
		cacheBust: {
			// Add checksum to JS and CSS files in dist folder and update index.html
			options: { encoding: 'utf8', algorithm: 'md5', deleteOriginals: true },
			assets: { files: [{ baseDir: 'dist', expand: true, cwd: 'dist', src: ['**/*.html'], filter: noAssets }] }
		}
	};


	// START GIT_MODULE SUPPORT

	eachGitModule(function (git_module) {
		var path = 'git_modules/' + git_module;
		config.run_grunt = config.run_grunt || {};
		config.run_grunt[git_module + '_build'] = { options: { task: [ 'build' ] }, src: [ path + '/gruntfile.js' ] };
		'js,css,tmpl,assets'.split(',').forEach(function (type) {
			config.run_grunt[git_module + '_build_' + type] = { options: { task: [ 'build_' + type ] }, src: [ path + '/gruntfile.js' ] };
			config.copy['git_module_' + git_module + '_' + type] = {
				files: [ { expand: true, src: [ path + '/build/' + type + '/**/*.*' ], rename: function (dest, src) {
					return 'build/' + src.replace('/build', '');
				} } ]
			};
			config.watch['git_module_' + git_module + '_' + type] = {
				files: path + '/src/' + (type === 'css' ? 'less' : type) + '/**/*.*',
				tasks: [ 'run_grunt:' + git_module + '_build_' + type, 'copy:git_module_' + git_module + '_' + type, 'build_index' ]
			};
		});

		grunt.task.registerTask('build_git_module_' + git_module, [
			'run_grunt:' + git_module + '_build',
			'copy:git_module_' + git_module + '_assets',
			'copy:git_module_' + git_module + '_css',
			'copy:git_module_' + git_module + '_js',
			'copy:git_module_' + git_module + '_tmpl'
		]);
		config.run_grunt[git_module + '_dist'] = { options: { task: [ 'dist' ] }, src: [ path + '/gruntfile.js' ] };
		config.copy['git_module_' + git_module + '_dist'] = {
			files: [ { expand: true, src: path + '/dist/**/*.*', filter: function (file) {
				return !file.match('/bower_components/');
			}, rename: function (dest, src) {
				return 'dist/' + src.replace('/dist', '');
			} }]
		}
		grunt.task.registerTask('dist_git_module_' + git_module, [
			'run_grunt:' + git_module + '_dist',
			'copy:git_module_' + git_module + '_dist',
		]);
	});

	eachGitModule(function (git_module) {
		buildTasks.splice(1, 0, 'build_git_module_' + git_module);
		distTasks.splice(1, 0, 'dist_git_module_' + git_module);
	});

	// Override build and dist tasks
	grunt.task.registerTask('build', buildTasks);
	grunt.task.registerTask('dist', distTasks);

	// END GIT_MODULE SUPPORT


	if (modifyConfig) {
		modifyConfig(config);
	}

	grunt.initConfig(config);

    grunt.loadNpmTasks("grunt-bower-task");
    grunt.loadNpmTasks("grunt-cache-bust");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-connect");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-cssmin");
    grunt.loadNpmTasks("grunt-contrib-htmlmin");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-less");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-html-angular-validate");
    grunt.loadNpmTasks("grunt-include-source");
    grunt.loadNpmTasks("grunt-karma");
    grunt.loadNpmTasks('grunt-connect-proxy');
    grunt.loadNpmTasks('grunt-run-grunt');

    function noAssets(file) {
    	return !file.match(/(src|build|dist)\/assets\//);
    }

    function noAssetsNoTmpl(file) {
    	return noAssets(file) && !file.match(/\.tmpl\.html$/);
    }

    function environment(file) {
    	return !file.match(/env_[^\._]+\.js$/) || file.match('env_' + process.env.NODE_ENV);
    }

	function onlyDepsFromWiredep() {
		var getRelativePath = function (file) { return file.replace(process.cwd() + '/', ''); };
		var wiredepFiles;
		return function (path) {
			if (!wiredepFiles) {
				wiredepFiles = [];
				var deps = require('wiredep')();
				var keys = Object.keys(deps.packages);
				keys.forEach(function (key) {
					deps.packages[key].main.forEach(function (file) {
						wiredepFiles.push(getRelativePath(file));
					});
				});
			}
			return wiredepFiles.indexOf(path) > -1;
		};
	}

    function eachGitModule(callback) {
    	if (require('fs').existsSync(process.cwd() + '/git_modules')) {
			require('fs').readdirSync(process.cwd() + '/git_modules').forEach(callback);
    	}
    }

};
