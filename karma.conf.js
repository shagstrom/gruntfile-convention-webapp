module.exports = function(config, modifyOptions) {

    options = {
        frameworks: [ 'jasmine' ],
        browsers: [ 'PhantomJS' ]
    };

    options.files = require('wiredep')({ devDependencies: true }).js;
    options.files.push(process.cwd() + '/git_modules/*/src/**/*.js');
    options.files.push(process.cwd() + '/src/**/*.js');
    options.files.push(process.cwd() + '/test/**/*.js');
    
    if (modifyOptions) {
        modifyOptions(options);
    }

    config.set(options);

};
