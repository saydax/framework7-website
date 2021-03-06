(function(){
  'use strict';
  var gulp = require('gulp');
  var connect = require('gulp-connect');
  var open = require('gulp-open');
  var less = require('gulp-less');
  var gulpPug = require('gulp-pug');
  var pug = require('pug');
  var path = require('path');
  var fs = require('fs');
  var del = require('del');
  var yaml = require('js-yaml');
  var iconsManifest = require('./icons/manifest-icons.json');
  var useCDN = true;
  var cdnPath = '//cdn.framework7.io';
  var processVuePugFiles = require('./src/react-doc-generation/vue-pug-file-processing').processVuePugFiles;
  var processReactHtmlFiles = require('./src/react-doc-generation/react-html-file-processing').processReactHtmlFiles;



  // Pug Filter
  pug.filters['code'] = function (text) {
    return text
    .replace( /</g, '&lt;'   )
    .replace( />/g, '&gt;'   )
  }
  // Pug YAML Data
  function getYamlData(ymlPath) {
    var doc = yaml.safeLoad(fs.readFileSync(`./src/pug/${ymlPath}`, 'utf8'));
    return doc;
  }

  /* ==================================================================
  Check CDN
  ================================================================== */
  function checkIsLocal(local) {
    if (local) local = local.toString().replace('-', '');
    if (local === 'local') {
      useCDN = false;
    }
  }
  /* ==================================================================
  Build
  ================================================================== */
  // Styles
  gulp.task('less', function (cb) {
    var cbs = 0;
    gulp.src(['./src/less/main.less'])
      .pipe(less({
        paths: [ path.join(__dirname, 'less', 'includes') ]
      }))
      .pipe(gulp.dest('./css/'))
      .pipe(connect.reload())
      .on('end', function () {
        if (cb) cb();
      });
  });

  function buildReactPages(cb) {
    checkIsLocal(process.argv.slice(3));
    processVuePugFiles();
    var time = Date.now();
    console.log(`Starting react pug: all`);
    gulp.src(['./react-pug-temp/*.pug'])
      .pipe(gulpPug({
        pug,
        pretty: true,
        locals: {
          cdn: useCDN ? cdnPath : '',
          icons: iconsManifest.icons,
          getYamlData,
        }
      }))
      .on('error', (err) => {
        console.log(err);
      })
      .pipe(gulp.dest('./react/'))
      .on('end', () => {
        console.log(`Finished react pug in ${Date.now() - time}ms`);
        processReactHtmlFiles(cb);
      });
  }

  // All Pug Pages
  function buildPages(cb) {
    checkIsLocal(process.argv.slice(3));
    var cbs = 0;
    var time = Date.now();
    console.log(`Starting pug: all`);
    gulp.src(['**/*.pug', '!**/_*.pug', '!react/*.pug', '!_*.pug'], { cwd: 'src/pug' })
      .pipe(gulpPug({
        pug,
        pretty: true,
        locals: {
          cdn: useCDN ? cdnPath : '',
          icons: iconsManifest.icons,
          getYamlData,
        }
      }))
      .on('error', (err) => {
        console.log(err);
      })
      .pipe(gulp.dest('./'))
      .on('end', () => {
        buildReactPages(() => {
          console.log(`Finished pug all in ${Date.now() - time}ms`);
          if(cb) cb();
        });
      });

  }
  gulp.task('pug', function (cb) {
    buildPages(cb);
  });

  gulp.task('process-react-html', function (cb) {
    processReactHtmlFiles(cb);
  });

  gulp.task('process-react-pug', function (cb) {
    buildReactPages(cb);
  });

  // Build All
  gulp.task('build', ['pug', 'less'], function (cb) {
    cb();
  });
  gulp.task('build-local', function (cb) {
    local = true;
  });

  /* =================================
  Watch
  ================================= */
  gulp.task('watch', function () {
    checkIsLocal(process.argv.slice(3));

    gulp.watch('./src/less/**/*.*', [ 'less' ]);
    gulp.watch('./src/pug/**/*.pug', (data) => {
      checkIsLocal(process.argv.slice(3));
      if (data.type !== 'changed') return;
      const filePath = data.path.split('/src/pug/')[1];
      if (filePath.indexOf('react') === 0) return;
      if (filePath.indexOf('_') === 0) {
        buildPages();
        return;
      }
      const src = [];
      if (filePath.split('/')[1] && filePath.split('/')[1].indexOf('_') === 0) {
        src.push(`${filePath.split('/')[0]}/*.pug`);
        src.push(`!${filePath.split('/')[0]}/_*.pug`);
      } else {
        src.push(filePath);
      }
      var time = Date.now();
      console.log(`Starting pug "${src}"`);
      gulp.src(src, { cwd: 'src/pug' })
        .pipe(gulpPug({
          pug,
          pretty: true,
          locals: {
            cdn: useCDN ? cdnPath : '',
            icons: iconsManifest.icons,
            getYamlData,
          }
        }))
        .on('error', (err) => {
          console.log(err);
        })
        .pipe(gulp.dest(filePath.split('/')[0] === filePath ? './' : filePath.split('/')[0]))
        .on('end', () => {
          console.log(`Finished pug "${src}" in ${Date.now() - time}ms`);
          connect.reload();
        });
    });
  });

  /* =================================
  Server
  ================================= */
  gulp.task('connect', function () {
    return connect.server({
      root: [ './' ],
      livereload: true,
      port:'3000'
    });
  });

  gulp.task('open', function () {
    return gulp.src('./index.html').pipe(open({ uri: 'http://localhost:3000/index.html'}));
  });

  gulp.task('server', [ 'watch', 'connect', 'open' ]);

  gulp.task('default', [ 'server' ]);

  gulp.task('test', [ 'build' ]);
  })();
