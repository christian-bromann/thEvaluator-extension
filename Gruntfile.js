module.exports = function (grunt) {

    'use strict';

    // load all grunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    var pkg = require('./package.json');

    // configurable paths
    var extensionConfig = {
        tmp: 'tmp',
        builds: 'builds'
    };

    // uglify options
    var uglifyConfig = {
        mangle: false,
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '\t@author Christian Bromann - <mail@christian-bromann.com> */\n\n'
    };

    // sass options
    var sassConfig = {
        noCache: true,
        unixNewlines: true,
        style: 'compressed'
    }

    // WebSocket URL to server
    var socketURI = 'http://qcentral.org:9001';

    grunt.initConfig({
        pkg: pkg,
        extension: extensionConfig,
        compressed: false,
        watch: {
            sass: {
                files: ['sass/{,*/}*.scss'],
                tasks: ['sass']
            }
        },
        sass: {
            injected: {
                options: sassConfig,
                files: {
                    'dist/injected.css': 'sass/injected.scss'
                }
            },
            extension: {
                options: sassConfig,
                files: {
                    'dist/extension.css': 'sass/extension.scss'
                }
            }
        },
        clean: {
            tmp: {
                files: [{
                    dot: true,
                    src: ['<%= extension.tmp %>/*']
                }]
            },
        },
        copy: {
            tmp: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '.',
                    dest: '<%= extension.tmp %>',
                    src: [
                        '*.html',
                        'Manifest.json',
                        'img/*',
                        'dist/*',
                        'templates/*'
                    ]
                }]
            }
        },
        uglify: {
            options: uglifyConfig,
            injected: {
                files: {
                    '<%= extension.tmp %>/dist/injected.min.js':
                    [
                        'js/libs/jquery-1.8.0.js',
                        'js/libs/jquery.cookie.js',
                        'js/thEvaluatorWidget.js',
                        'js/thEvaluatorInjected.js',
                        'js/injected.js'
                    ]
                }
            },
            extension: {
                files: {
                    '<%= extension.tmp %>/dist/extension.min.js':
                    [
                        'js/libs/jquery-1.8.0.js',
                        'js/extension.js'
                    ]
                }
            },
            background: {
                files: {
                    '<%= extension.tmp %>/dist/background.min.js':
                    [
                        'js/libs/jquery-1.8.0.js',
                        'js/libs/socket.io.js',
                        'js/background.js'
                    ]
                }
            }
        },
        'regex-replace': {
            background: { //specify a target with any name
                src: ['<%= extension.tmp %>/background.html'],
                actions: [
                    {
                        name: 'script replacement',
                        search: '<script src="(.|\n)*(</script>)',
                        replace: '<script src="dist/background.min.js"></script>',
                        flags: 'g'
                    }
                ]
            },
            extension: { //specify a target with any name
                src: ['<%= extension.tmp %>/index.html'],
                actions: [
                    {
                        name: 'script replacement',
                        search: '<script src="(.|\n)*(</script>)',
                        replace: '<script src="dist/extension.min.js"></script>',
                        flags: 'g'
                    }
                ]
            },
            manifest: { //specify a target with any name
                src: ['<%= extension.tmp %>/Manifest.json'],
                actions: [
                    {
                        name: 'js src to min file',
                        search: '"js": (.|\n)+"css":',
                        replace: '"js": ["dist/injected.min.js"],"css":',
                        flags: 'g'
                    },
                    {
                        name: 'replace path of web_accessible_resources',
                        search: 'js/inject.js',
                        replace: 'dist/injected.min.js',
                        flags: 'g'
                    }
                ]
            },
            // backgroundScript: { //specify a target with any name
            //     src: ['<%= extension.tmp %>/dist/background.min.js'],
            //     actions: [
            //         {
            //             name: 'replace io url',
            //             search: 'http://localhost:9001',
            //             replace: socketURI,
            //             flags: 'g'
            //         }
            //     ]
            // }
        },
        crx: {
            thevaluatorExtension: {
                'src': '<%= extension.tmp %>/',
                'dest': '<%= extension.builds %>/thevaluator-<%= grunt.template.today("yyyymmddHHMMss") %>.crx',
                'exclude': [ '.git', '.svn' ],
                'privateKey': 'ssh/privKey.pem',
                'options': {
                    'maxBuffer': 3000 * 1024 //build extension with a weight up to 3MB
                }
            }
        }
    });

    grunt.registerTask('build', [
        'clean',
        'sass',
        'uglify',
        'copy',
        'regex-replace',
        'crx'
    ]);

};
