const { src, dest, parallel, series, watch } = require("gulp");
const del = require("del");
const browserSync = require("browser-sync");
const loadPlugins = require("gulp-load-plugins");
// const { watch } = require("chokidar");
const plugins = loadPlugins();

const bs = browserSync.create({});

const cwd = process.cwd(); // 命令行所在工作目录
let config = {
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      styles: "assets/styles/*.css",
      scripts: "assets/scripts/*.js",
      pages: "*.html",
      images: "assets/images/**",
      fonts: "assets/fonts/**",
    },
  },
};

try {
  const loadConfig = require(`${cwd}/pages.config.js`);
  config = Object.assign({}, config, loadConfig);
} catch (error) {}

const clean = () => {
  return del([config.build.dist, config.build.temp]);
};

const style = () => {
  return (
    // base会把src后面的路径保留下来
    src(config.build.paths.styles, {
      base: config.build.src,
      cwd: config.build.src,
    }) // 指定工作目录
      // _开头的文件会被忽略掉
      .pipe(
        plugins.sass({
          // 完全展开css
          outputStyle: "expanded",
        })
      )
      // dest 目标位置
      // dist 分发，发布
      .pipe(dest(config.build.temp))
    // 编译完成以后重新记载页面
    // .pipe(bs.reload({ stream: "stream" }))
  );
};

const scripts = () => {
  return src(config.build.paths.scripts, {
    base: config.build.src,
    cwd: config.build.src,
  }) // 指定工作目录
    .pipe(
      plugins.babel({
        presets: [require("@babel/preset-env")],
      })
    )
    .pipe(dest(config.build.temp));
};

const page = () => {
  return (
    src(config.build.paths.pages, {
      base: config.build.src,
      cwd: config.build.src,
    }) // 指定工作目录
      // 调用swig模板
      .pipe(plugins.swig({ data: config.data }))
      .pipe(dest(config.build.temp))
  );
};

const image = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src,
  }) // 指定工作目录
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const font = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src,
  }) // 指定工作目录
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};
// public文件处理
const extra = () => {
  return src("**", {
    base: config.build.public,
    cwd: config.build.public,
  }).pipe(dest(config.build.dist)); // 指定工作目录
};

const useref = () => {
  return (
    src(config.build.paths.pages, {
      base: config.build.temp,
      cwd: config.build.temp,
    })
      .pipe(plugins.useref({ searchPath: [config.build.temp, "."] }))
      // 会创建新文件，需要压缩
      // html
      // js
      // css
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
      .pipe(
        plugins.if(
          /\.html$/,
          plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
          })
        ) // 折叠空行
      )
      .pipe(dest(config.build.dist))
  );
};

// 并行构建
const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, style);
  watch(config.build.paths.scripts, { cwd: config.build.src }, scripts);
  watch(config.build.paths.pages, { cwd: config.build.src }, page);
  // 只需要上线再进行编译，开发阶段不需要实时监听
  // watch("src/assets/images/**", image);
  // watch("src/assets/fonts/**", font);
  // watch("public/**", extra);

  // 文件变化自动更新浏览器
  watch(
    [config.build.paths.images, config.build.paths.fonts],
    { cwd: config.build.src },
    // bs里面的刷新页面方法
    bs.reload
  );

  watch(["**"], { cwd: config.build.public }, bs.reload);
  bs.init({
    // 关掉右上角小提示
    notify: false,
    port: 8000, // 默认3000
    // open: false, // 是否打开浏览器，默认true
    // files: "dist/**", // 监听哪个目录的文件，更新页面
    server: {
      // 访问的路径
      // 先找dist，再找src，再找public
      baseDir: [config.build.temp, config.build.dist, config.build.public],
      // 优先于baseDir执行
      // 自动映射node_modules
      routes: {
        "/node_modules": "node_modules",
      },
    },
  });
};
const compile = parallel(style, scripts, page);
const build = series(
  clean,
  parallel(
    series(compile, useref),
    // 图片压缩
    image,
    font,
    extra
  )
);

// 开发环境命令
const develop = series(compile, serve);

// const
// const

module.exports = {
  develop,
  // compile,
  // image,
  // font,
  build,
  clean,
  // serve,
  // useref,
};
