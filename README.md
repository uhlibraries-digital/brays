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
npm install && npm start
```

### Packaging

You can package Brays by running the following commands based on your target system:

* `npm run package:mac` will package for MacOS X x64
* `npm run package:win` will package for Windows x64
* `npm run package:linux` will package for Linux x64
* `npm run package` will package all the above

All packages are stored in the `app-builds` directory that gets created during the build process.

To learn more about distributing, please read the [Application Distribution](http://electron.atom.io/docs/tutorial/application-distribution/) documentation from Electron.

### Development

Brays is built with [Angular 4](https://angular.io/) using Typescript. The main application starts in `main.ts`.

To build the application you can run one of these commands:

* `npm run build` will build the application
* `npm start` will build the application and start it

You need run a build `npm run build` before running `npm start` for the first time.
You will only need to do this once.

## License

[MIT License](LICENSE.txt)
