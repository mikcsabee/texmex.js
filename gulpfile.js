const fs = require('fs')
const path = require('path')
const gulp = require('gulp')
const ts = require('gulp-typescript')
const gulpSequence = require('gulp-sequence')
const clean = require('gulp-clean')
const file = require('gulp-file')

const packages = {
  core: ts.createProject('core/tsconfig.json'),
  server: ts.createProject('server/tsconfig.json')
}
const modules = Object.keys(packages)
const dist = 'node_modules/@texmex.js/'

gulp.task('default', () => {
  modules.forEach(module => {
    gulp.watch(
      [`${module}/**/*.ts`, `${module}/*.ts`],
      [module]
    )
  })
})

gulp.task('clean:dist', () => {
  return gulp
    .src('dist/', { read: false })
    .pipe(clean())
})

gulp.task('clean:node_module', () => {
  return gulp
    .src(dist, { read: false })
    .pipe(clean())
})

gulp.task('clean', (cb) => {
  gulpSequence('clean:dist', 'clean:node_module', cb)
})

gulp.task('init:package', () => {
  modules.forEach(module => {
    const content = createPackageJsonStr(module)
    return file('package.json', content, { src: true })
          .pipe(gulp.dest(`${dist}/${module}`));
  })
})

modules.forEach(module => {
  gulp.task(module, () => {
    return packages[module]
      .src()
      .pipe(packages[module]())
      .pipe(gulp.dest(`${dist}/${module}/lib`))
  })
})

gulp.task('build', (cb) => {
  gulpSequence('clean:node_module', 'init:package', 'core', modules.filter(module => module !== 'core'), 'copy:module', cb)
})

gulp.task('dist', (cb) => {
  gulpSequence('clean:dist', 'copy:dist', cb)
})

gulp.task('copy:module', function() {
  modules.forEach(module => {
    return gulp.src([`${module}/src/**/*.ts`, `${module}/src/**/*.ts`])
               .pipe(gulp.dest((`${dist}/${module}/src`)))
  })
  modules.forEach(module => {
    return gulp.src([`${module}/*.md`])
               .pipe(gulp.dest((`${dist}/${module}/`)))
  })
})

gulp.task('copy:dist', function() {
  modules.forEach(module => {
    return gulp.src([`${dist}/${module}/*`, `${dist}/${module}/**/*`])
               .pipe(gulp.dest((`dist/${module}/`)))
  })
})



const main = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const createPackageJsonStr = (module) => {
  const obj = JSON.parse(fs.readFileSync(`${module}/package.template.json`, 'utf8'))
  obj.version = main.dependencies[obj.name].replace('^', '');
  obj.license = main.license
  obj.author = main.author
  obj.repository = main.repository
  obj.bugs = main.bugs
  obj.homepage = main.homepage
  const dependencies = {}
  obj.dependencies.forEach(dependency => {
    dependencies[dependency] = main.dependencies[dependency]
  })
  delete obj.dependencies
  obj.dependencies = dependencies
  return JSON.stringify(obj, null, 2)
}
