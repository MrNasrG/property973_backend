var gulp = require("gulp"), // main
  sass = require('gulp-sass')(require('sass')),
  sourcemaps = require("gulp-sourcemaps"), // scss sourcemaps
  uglify = require("gulp-uglify"), // minify js files
  cssmin = require("gulp-cssmin"), // minify css files
  merge = require("merge-stream"), // mearge two task
  babel = require("gulp-babel"), // convert next generation JavaScript, today.
  npmlodash = require("lodash"), // perfoming oops in gulp
  autoprefixer = require("gulp-autoprefixer"), // css propertys autoprefixer
  cssbeautify = require("gulp-cssbeautify"), // css cssbeautify
  fileinclude = require("gulp-file-include"), // include html files
  browsersync = require("browser-sync"), // browser reload
  htmlmin = require("gulp-htmlmin"); // html minify
  const rtlcss = require('gulp-rtlcss'); // rtl generate
  const rename = require('gulp-rename');
  const del = require('del');

const layout = {
  layouts: "vertical", // vertical / horizontal
  sublayouts: "",
  darktheme: "false", // true / false
  rtltheme: "false", // true / false
  bodyclass: "",
  menuclass: "",
  headerclass: "",
};

gulp.task('clean:dist', function () {
  return del([
    'dist'
  ]);
});

//  [ scss compiler ] start
gulp.task("sass", function () {
  // main style css
  gulp
    .src(["src/assets/scss/style.scss", "src/assets/scss/icons.scss"])
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(autoprefixer())
    .pipe(cssbeautify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("public/assets/css"));

    return gulp
      .src(["src/assets/scss/style.scss", "src/assets/scss/icons.scss"])
      .pipe(sourcemaps.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(autoprefixer())
      .pipe(rtlcss())
      .pipe(rename({suffix: "-rtl.min"}))
      .pipe(sourcemaps.write("./"))
      .pipe(gulp.dest("public/assets/css"));
});
//  [ scss compiler ] end

//  [ Copy assets ] start
gulp.task("build", function () {
  var required_libs = {
    js: [
      "node_modules/jquery/dist/jquery.min.js",
      "node_modules/echarts/dist/echarts.min.js",
      "node_modules/apexcharts/dist/apexcharts.min.js",
    ],
    css: [
      "node_modules/simplebar/dist/simplebar.min.css",
      "node_modules/apexcharts/dist/apexcharts.css",
    ],
  };
  npmlodash(required_libs).forEach(function (assets, type) {
    if (type == "css") {
      gulp.src(assets).pipe(gulp.dest("public/assets/css/plugins"));
    } else {
      gulp.src(assets).pipe(gulp.dest("public/assets/js/plugins"));
    }
  });

  // Scrollbar
  gulp.src("node_modules/simplebar/dist/simplebar.min.css",).pipe(gulp.dest("public/assets/css/plugins"));
  return gulp.src("node_modules/simplebar/dist/simplebar.min.js").pipe(gulp.dest("public/assets/js/plugins"));
});
//  [ Copy assets ] end


//  [ build js ] start
gulp.task("build-js", function () {
  var layoutjs = gulp
    .src("src/assets/js/*.js")
    .pipe(gulp.dest("public/assets/js"));
  var mainjs = gulp
    .src("src/assets/js/main/*.js")
    .pipe(gulp.dest("public/assets/js/main"));

  var pagesjs = gulp
    .src("src/assets/js/pages/*.js")
    .pipe(gulp.dest("public/assets/js/pages"));

  var copyPlugins = gulp.src('src/assets/js/plugins/**/*')
        .pipe(gulp.dest('public/assets/js/plugins'));
  return merge(layoutjs, pagesjs, mainjs);
});
//  [ build js ] end

//  [ build locales ] Start
gulp.task("build-locales", function () {
  return gulp
  .src("src/assets/locales/*.{json}")
  .pipe(gulp.dest("public/locales"));
});

//  [ build locales ] end

//  [ scss compiler ] start
gulp.task("mincss", function () {
  // main style css
  return gulp
    .src(["src/assets/scss/style.scss", "src/assets/scss/icons.scss"])
    .pipe(sass())
    .pipe(autoprefixer())
    .pipe(cssbeautify())
    .pipe(gulp.dest("public/assets/css"))
    .pipe(cssmin())
    .pipe(gulp.dest("public/assets/css"));
});
//  [ scss compiler ] end

//  [ uglify js ] start
gulp.task("uglify", function () {
  var layoutjs = gulp
    .src("src/assets/js/*.js")
    .pipe(uglify())
    .pipe(gulp.dest("public/assets/js"));

  var pagesjs = gulp
    .src("src/assets/js/pages/*.js")
    .pipe(babel())
    .pipe(uglify())
    .pipe(gulp.dest("public/assets/js/pages"));

  return merge(layoutjs, pagesjs);
});
//  [ uglify js ] end

//  [ images copy ] start
gulp.task("copy-images", function () {
  return gulp.src('src/assets/images/**/*')
    .pipe(gulp.dest('public/assets/images'));
});
//  [ images copy ] end

//  [ fonts copy ] start
gulp.task('copy-fonts', function () {
  return gulp.src('src/assets/fonts/*')
    .pipe(gulp.dest('public/assets/fonts'));
});
//  [ fonts copy ] end

//  [ browser reload ] start
gulp.task("browserSync", function () {
  browsersync.init({
    server: "public/",
  });
});

gulp.task('browsersyncReload', function (callback) {
  browsersync.reload();
  callback();
});

//  [ browser reload ] end

//  [ watch minify ] start
gulp.task("watch-minify", function () {
  gulp.watch("src/assets/scss/**/*.scss", gulp.series("mincss"));
  gulp.watch("src/assets/js/**/*.js", gulp.series("uglify"));
});
//  [ watch minify ] end

//  [ watch ] start
gulp.task("watch", function () {
  gulp
    .watch(["src/assets/scss/**/*.scss", "src/assets/scss/*.scss"], gulp.series("sass", "browsersyncReload"));
  gulp
    .watch(["src/assets/js/**/*.js", "src/assets/js/*.js"], gulp.series("build-js", "browsersyncReload"));
  gulp
    .watch("src/html/**/*.html", gulp.series("build-html", "browsersyncReload"));
  gulp
    .watch("src/doc/**/*.html", gulp.series("build", "browsersyncReload"));
  gulp
    .watch("src/assets/locales/*.json", gulp.series("build-locales", "browsersyncReload"));
});
// const compile = gulp.parallel("browserSync", "watch");
//  [ watch ] end

//  [ Default task ] start
gulp.task(
  "default",
  gulp.series('clean:dist', gulp.parallel("build", "sass", "build-js", "copy-images", "copy-fonts"))
);
//  [ Default task ] end

gulp.task(
  "build-prod",
  gulp.series('clean:dist', gulp.parallel("build", "sass", "build-js", "copy-images"))
);
