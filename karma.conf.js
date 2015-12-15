module.exports = function(config) {

    var files = require('wiredep')({ devDependencies: true }).js;
    files.push(process.cwd() + '/src/**/*.js');
    files.push(process.cwd() + '/test/**/*.js');

    config.set({
        frameworks: [ 'jasmine' ],
        browsers: [ 'PhantomJS' ],
        files: files
    });

};
