'use strict'
var gulp = require('gulp');
var sass = require('gulp-sass');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var config = {
  entryFile: './src/main.js',
  outputDir: './dist',
  outputFile: 'bundle.js',
  es6Path: './src/**/*.js',
  sassPath: './src/style/*.scss',
  htmlPath: './src/**/*.html'
};

gulp.task('html', function() {
  gulp.src(config.htmlPath)
  .pipe(gulp.dest(config.outputDir))
  .pipe(reload({ stream: true }));
})

gulp.task('sass', function() {
  gulp.src(config.sassPath)
  .pipe(sass().on('error', sass.logError))
  .pipe(gulp.dest(config.outputDir))
  .pipe(reload({ stream: true }));
})

gulp.task('browserify', function() {
  browserify(config.entryFile, { debug: true })
    .transform(babelify)
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(source(config.outputFile))
    .pipe(gulp.dest(config.outputDir))
    .pipe(reload({ stream: true }));
});

gulp.task('browser-sync', function() {
   browserSync({
     server: {
       baseDir: config.outputDir,
     },
    //  open: 'external',
     port: 7070
   });
});

gulp.task('watch', function() {
  gulp.watch(config.es6Path, ['browserify']);
  gulp.watch(config.sassPath, ['sass']);
  gulp.watch(config.htmlPath, ['html']);
});


gulp.task('default', ['browserify', 'watch', 'browser-sync']);
