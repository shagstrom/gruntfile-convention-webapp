# An easier way to build with grunt.

With convention over configuration you don't need a large Gruntfile and package.json.

You will get the following for "free":

1. Testing with jasmine and PhantomJS
2. Bower installation and inclusion
3. LESS
4. JSHint
5. HTML validation
6. js minification
7. css minification
8. html minification
9. cache busting

Firstly

    npm install

Run tests

    grunt test

Run http server:

    grunt run

Build distribution

    grunt dist

File structure convention

- - src
  - - assets
  - - js
  - - less
  - test
package.json
gruntfile.js
bower.json

