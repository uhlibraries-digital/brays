# Brays

Metadata editor utility built on [Electron](http://electron.atom.io/).

## Optional

### ImageMagick
In order the view tiff files in the viewer, you must have [ImageMagick](https://www.imagemagick.org/index.php) installed.

[Download ImageMagick for Windows](https://www.imagemagick.org/script/binary-releases.php#windows)
and ensure you have "Install legacy utilities" checked during install.

MacOS via [Homebrew](https://brew.sh/):
```
brew install imagemagick
```

Linux (Debian):
```
apt-get install imagemagick
```

## To Use

Clone and run this repository. You will need [Node.js](https://nodejs.org/en/download/) installed. From the command line:

```bash
git clone https://github.com/uhlibraries-digital/brays
# Go to the repository
cd brays
# Install dependencies and run the app
npm install && npm run electron
```

### Packaging

You can package Brays by running the following commands based on your target system:

* `npm run package:osx` will package for MacOS X x64
* `npm run package:win` will package for Windows x64
* `npm run package:linux` will package for Linux x64
* `npm run package` will package all the above

All packages are stored in the `bin` directory that gets created during the build process.

To learn more about distributing, please read the [Application Distribution](http://electron.atom.io/docs/tutorial/application-distribution/) documentation from Electron.

### Development

Brays is built with [Angular 2](https://angular.io/) using Typescript. The main application starts in `app/app.ts`.

To build the application you can run one of these commands:

* `npm run build` will build the application
* `npm run election` will build the application and start electron
* `npm run watch` will watch the directory for changes and re-build the application

## License

[MIT License](LICENSE.txt)
