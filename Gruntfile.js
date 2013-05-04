module.exports = function (grunt) {

    'use strict';

    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        watch: {
            sass: {
                files: ['sass/{,*/}*.scss'],
                tasks: ['sass']
            }
        },
        sass: {
            injected: {
                options: {
                    noCache: true,
                    unixNewlines: true,
                    lineNumbers: true
                },
                files: {
                    'dist/injected.css': 'sass/injected.scss'
                }
            },
            extension: {
                options: {
                    noCache: true,
                    unixNewlines: true,
                    lineNumbers: true
                },
                files: {
                    'dist/extension.css': 'sass/extension.scss'
                }
            }
        }
    });

    grunt.registerTask('default', ['sass']);
};
