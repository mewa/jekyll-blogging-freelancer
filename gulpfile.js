var gulp = require('gulp');
var sass = require('gulp-sass');
var browserSync = require('browser-sync').create();
var header = require('gulp-header');
var cleanCSS = require('gulp-clean-css');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var filter = require('gulp-filter');
var del = require('del');
var child = require('child_process');
var runSequence = require('run-sequence');
var merge = require('merge-stream');
var pkg = require('./package.json');

var SRC_DIR = "src";
var RES_DIR = "res";
var OUT_DIR = "intermediate";

var HTML_SRC = SRC_DIR + "/html";
var SASS_SRC = SRC_DIR + "/sass";
var JS_SRC = SRC_DIR + "/js";

var HTML_OUT = OUT_DIR;
var CSS_OUT = OUT_DIR + "/css";
var JS_OUT = OUT_DIR + "/js";
var VENDOR_OUT = OUT_DIR + "/vendor";
var RES_OUT = OUT_DIR + "/" + RES_DIR

var JEKYLL_DIR = "jekyll";
var JEKYLL_FILES = JEKYLL_DIR + "/**/*";

// Add debounce to watch calls to ignore jekyll spam
// var old = gulp.watch;
// gulp.watch = function () {
//     arguments = Array.prototype.slice.call(arguments);
//     arguments.splice(1, 0, { debounceDelay: 150 });
//     old.apply(this, arguments)
// };

// Set the banner content
var banner = ['/*!\n',
    ' * Start Bootstrap - <%= pkg.title %> v<%= pkg.version %> (<%= pkg.homepage %>)\n',
    ' * Copyright 2013-' + (new Date()).getFullYear(), ' <%= pkg.author %>\n',
    ' * Licensed under <%= pkg.license.type %> (<%= pkg.license.url %>)\n',
    ' */\n',
    ''
].join('');

// Compile SASS files from /sass into /css
gulp.task('sass', function() {
    return gulp.src(SASS_SRC + '/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(header(banner, { pkg: pkg }))
        .pipe(gulp.dest(CSS_OUT))
});

// Minify compiled CSS
gulp.task('minify-css', ['sass'], function() {
    var f = filter([CSS_OUT + '/**/*.css', "!" + CSS_OUT + '/**/*.min.css'])
    return gulp.src(CSS_OUT + '/**/*.css')
        .pipe(f)
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(CSS_OUT))
});

// Minify JS
gulp.task('minify-js', function() {
    return gulp.src(JS_SRC + '/**/*.js')
        .pipe(uglify())
        .pipe(header(banner, { pkg: pkg }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(JS_OUT))
});

// Copy vendor libraries from /node_modules into /vendor
gulp.task('copy-vendor', () => {
    var bootstrap = gulp.src(['node_modules/bootstrap/dist/**/*', '!**/npm.js', '!**/bootstrap-theme.*', '!**/*.map'])
        .pipe(gulp.dest(VENDOR_OUT + '/bootstrap'))

    var jq = gulp.src(['node_modules/jquery/dist/jquery.js', 'node_modules/jquery/dist/jquery.min.js'])
        .pipe(gulp.dest(VENDOR_OUT + '/jquery'))

    var awesome = gulp.src([
            'node_modules/font-awesome/**',
            '!node_modules/font-awesome/**/*.map',
            '!node_modules/font-awesome/.npmignore',
            '!node_modules/font-awesome/*.txt',
            '!node_modules/font-awesome/*.md',
            '!node_modules/font-awesome/*.json'
        ])
        .pipe(gulp.dest(VENDOR_OUT + '/font-awesome'))

    return merge(bootstrap, jq, awesome);
})

gulp.task('copy', ['copy-vendor', 'copy-html', 'copy-js', 'copy-res'])

gulp.task('copy-html', () => {
    return gulp.src(HTML_SRC + "/**/*.html")
        .pipe(gulp.dest(HTML_OUT));
})

gulp.task('copy-js', () => {
    return gulp.src(JS_SRC + "/**/*.js")
        .pipe(gulp.dest(JS_OUT));
})

gulp.task('copy-res', () => {
    return gulp.src(RES_DIR + "/**/*")
        .pipe(gulp.dest(OUT_DIR));
})

// Build intermediate app sources
gulp.task('build-app', ['sass', 'minify-css', 'minify-js', 'copy'])

// Run everything
gulp.task('default', ['build-app', 'build-jekyll']);

// Configure the browserSync task
gulp.task('browserSync', function() {
    browserSync.init({ 
        server: JEKYLL_DIR
    })
})

// Update Jekyll
gulp.task('jekyll', function () {
    var jekyll = child.execSync("jekyll build --incremental", { stdio: [0, 1, 2] })
})

// Build Jekyll from scratch
gulp.task('build-jekyll', ['build-app'], function () {
    return gulp.start('jekyll');
})

// Dev task with browserSync
gulp.task('dev', ['default', 'browserSync'], function () {
    gulp.watch([SASS_SRC + '/**/*.scss', "!" + JEKYLL_FILES], () => runSequence.apply(this, ['sass', 'minify-css', 'jekyll']));
    gulp.watch([RES_DIR + '/**/*', "!" + JEKYLL_FILES], () => runSequence.apply(this, ['copy', 'jekyll']));
    // Reloads the browser whenever HTML or JS files change
    gulp.watch([HTML_SRC + '/**/*.html', "!" + JEKYLL_FILES], () => runSequence.apply(this, ['copy-html', 'jekyll']));
    gulp.watch([JS_SRC + '/**/*.js', "!" + JEKYLL_FILES], () => runSequence.apply(this, ['copy-js', 'minify-js', 'jekyll']));

    gulp.watch(JEKYLL_FILES, (f) => {
        browserSync.reload();
    })
});

gulp.task('clean', [], function () {
    return del([OUT_DIR + "/**/*", JEKYLL_FILES]).then(paths => {
        if (paths.length > 0)
            console.log('Removed ' + paths.length + ' files');
    });
})
