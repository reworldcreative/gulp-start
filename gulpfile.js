// const gulp = require("gulp");
// const path = require("path");
// const del = require("del");

import gulp from "gulp";
import path from "path";
import { deleteAsync } from "del";

import dartSass from "sass";
import gulpSass from "gulp-sass";
import rename from "gulp-rename";
import groupCssMediaQueries from "gulp-group-css-media-queries";
import cleanCss from "gulp-clean-css";
import fileinclude from "gulp-file-include";
import replace from "gulp-replace";
import webpHtmlNosvg from "gulp-webp-html-nosvg";
import version from "gulp-version-number";
import webpcss from "gulp-webpcss";
import autoprefixer from "gulp-autoprefixer";
import webpack from "webpack-stream";
import webp from "gulp-webp";
import imagemin from "gulp-imagemin";
import newer from "gulp-newer";
import fs from "fs";
import fonter from "gulp-fonter";
import ttf2woff2 from "gulp-ttf2woff2";
import ifPlugin from "gulp-if";

const sass = gulpSass(dartSass);

const rootFolder = path.basename(path.resolve());

const buildFolder = rootFolder; //rootFolder
const srcFolder = "src";

const isBuild = process.argv.includes("--build");
const isDev = !process.argv.includes("--build");

const paths = {
  build: {
    html: `${buildFolder}/`,
    styles: `${buildFolder}/styles/`,
    scripts: `${buildFolder}/scripts/`,
    img: `${buildFolder}/img/`,
    fonts: `${buildFolder}/fonts/`,
    files: `${buildFolder}/dev/`,
  },
  src: {
    html: `${srcFolder}/*.html`,
    styles: `${srcFolder}/styles/style.scss`,
    scripts: `${srcFolder}/scripts/main.js`,
    img: `${srcFolder}/img/**/*.{jpg,jpeg,png,gif,webp}`,
    svg: `${srcFolder}/img/**/*.svg`,
    files: `${srcFolder}/**/*.*`,
  },
  watch: {
    styles: `${srcFolder}/styles/**/*.scss`,
    scripts: `${srcFolder}/scripts/**/*.js`,
    img: `${srcFolder}/img/**/*.{jpg,jpeg,png,svg,gif,ico,webp}`,
    html: `${srcFolder}/**/*.html`,
    files: `${srcFolder}/**/*.*`,
  },
  // rootFolder: rootFolder,
};

//////////
function copy() {
  return gulp.src(paths.src.files).pipe(gulp.dest(paths.build.files));
}
///////

function watcher() {
  gulp.watch(paths.watch.html, html);
  gulp.watch(paths.watch.styles, scss);
  gulp.watch(paths.watch.scripts, js);
  gulp.watch(paths.watch.img, images);
}

function clean() {
  return deleteAsync(buildFolder);
}

function html() {
  return gulp
    .src(paths.src.html)
    .pipe(fileinclude())
    .pipe(replace(/@img\//g, "img/"))
    .pipe(ifPlugin(isBuild, webpHtmlNosvg()))
    .pipe(
      ifPlugin(
        isBuild,
        version({
          value: "%DT%",
          append: {
            key: "_v",
            cover: 0,
            to: ["css", "js"],
          },
          output: {
            file: "gulp/version.json",
          },
        })
      )
    )
    .pipe(gulp.dest(paths.build.html));
}

function scss(done) {
  gulp
    .src(paths.src.styles, { sourcemaps: isDev })
    .pipe(replace(/@img\//g, "../img/"))
    .pipe(
      sass({
        outputStyle: "expanded",
        includePaths: ["node_modules"],
      })
    )
    .pipe(ifPlugin(isBuild, groupCssMediaQueries()))
    .pipe(
      ifPlugin(
        isBuild,
        webpcss({
          webpClass: ".webp",
          noWebpClass: ".no-webp",
        })
      )
    )
    .pipe(
      ifPlugin(
        isBuild,
        autoprefixer({
          grid: true,
          overrideBrowserslist: ["last 3 versions"],
          cascade: true,
        })
      )
    )
    // not conpressed css
    // .pipe(gulp.dest(paths.build.styles))
    .pipe(ifPlugin(isBuild, cleanCss()))
    .pipe(
      rename({
        extname: ".min.css",
      })
    )
    .pipe(gulp.dest(paths.build.styles));
  done();
}

function js(done) {
  gulp
    .src(paths.src.scripts, { sourcemaps: isDev })
    .pipe(
      webpack({
        mode: isBuild ? "production" : "development",
        output: {
          filename: "main.min.js",
        },
      })
    )

    .pipe(gulp.dest(paths.build.scripts));
  done();
}

function images(done) {
  gulp
    .src(paths.src.img)
    .pipe(newer(paths.build.img))
    .pipe(ifPlugin(isBuild, webp()))
    .pipe(ifPlugin(isBuild, gulp.dest(paths.build.img)))
    .pipe(ifPlugin(isBuild, gulp.src(paths.src.img)))
    .pipe(ifPlugin(isBuild, newer(paths.build.img)))
    .pipe(
      ifPlugin(
        isBuild,
        imagemin({
          progressive: true,
          svgoPlugins: [{ removeViewBox: false }],
          interlaced: true,
          optimizationLevel: 3, //0 - 7
        })
      )
    )
    .pipe(gulp.dest(paths.build.img))
    .pipe(gulp.src(paths.src.svg))
    .pipe(gulp.dest(paths.build.img));
  done();
}

function otfToTtf() {
  return gulp
    .src(`${srcFolder}/fonts/*.otf`, {})
    .pipe(
      fonter({
        formats: ["ttf"],
      })
    )
    .pipe(gulp.dest(`${srcFolder}/fonts/`));
}

function ttfToWoff() {
  return gulp
    .src(`${srcFolder}/fonts/*.ttf`, {})
    .pipe(
      fonter({
        formats: ["woff"],
      })
    )
    .pipe(gulp.dest(`${paths.build.fonts}`))
    .pipe(gulp.src(`${srcFolder}/fonts/*.ttf`))
    .pipe(ttf2woff2())
    .pipe(gulp.dest(`${paths.build.fonts}`));
}

function fontsStyle() {
  //Файл стилей подключения шрифтов
  let fontsFile = `${srcFolder}/styles/fonts.scss`;
  //Проверяем, существуют ли файлы шрифтов
  fs.readdir(paths.build.fonts, function (err, fontsFiles) {
    if (fontsFiles) {
      //Проверяем, существует ли файл стилей для подключения шрифтов
      if (!fs.existsSync(fontsFile)) {
        //Если файла нет, создаём его
        fs.writeFile(fontsFile, "", cb);
        let newFileOnly;
        for (var i = 0; i < fontsFiles.length; i++) {
          //Записываем подключения шрифтов в файл стилей
          let fontFileName = fontsFiles[i].split(".")[0];
          if (newFileOnly !== fontFileName) {
            let fontName = fontFileName.split("-")[0]
              ? fontFileName.split("-")[0]
              : fontFileName;
            let fontWeight = fontFileName.split("-")[1]
              ? fontFileName.split("-")[1]
              : fontFileName;
            if (fontWeight.toLowerCase() === "thin") {
              fontWeight = 100;
            } else if (fontWeight.toLowerCase() === "extralight") {
              fontWeight = 200;
            } else if (fontWeight.toLowerCase() === "light") {
              fontWeight = 300;
            } else if (fontWeight.toLowerCase() === "medium") {
              fontWeight = 500;
            } else if (fontWeight.toLowerCase() === "semibold") {
              fontWeight = 600;
            } else if (fontWeight.toLowerCase() === "bold") {
              fontWeight = 700;
            } else if (
              fontWeight.toLowerCase() === "extrabold" ||
              fontWeight.toLowerCase() === "heavy"
            ) {
              fontWeight = 800;
            } else if (fontWeight.toLowerCase() === "black") {
              fontWeight = 900;
            } else {
              fontWeight = 400;
            }
            fs.appendFile(
              fontsFile,
              `@font-face{\n\tfont-family: ${fontName};\n\tfont-display: swap;\n\tsrc: url("../fonts/${fontFileName}.woff2") format("woff2"), url("../fonts/${fontFileName}.woff") format("woff");\n\tfont-weight: ${fontWeight};\n\tfont-style: normal;\n}\r\n`,
              cb
            );
            newFileOnly = fontFileName;
          }
        }
      } else {
        //Если файл есть, выводим сообщение
        console.log(
          "Файл scss/fonts.scss уже существует. Для обновления файла нужно его удалить!"
        );
      }
    }
  });
  return gulp.src(`${srcFolder}`);
  function cb() {}
}

const fonts = gulp.series(otfToTtf, ttfToWoff, fontsStyle);

const maintasks = gulp.series(fonts, gulp.parallel(html, scss, js, images));

const dev = gulp.series(clean, maintasks, watcher);
const build = gulp.series(clean, maintasks);

// exports.dev = dev;
export { dev };
export { build };

gulp.task("default", dev);
