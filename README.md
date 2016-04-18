# Brays

Is a Archivematica & Hydra-in-a-Box ingest utility built on [Electron](http://electron.atom.io/).

## To Use

Clone and run this repository. You will need [Node.js](https://nodejs.org/en/download/) installed. From the command line:

```bash
git clone https://github.com/uhlibraries-digital/brays
# Go to the repository
cd brays
# Install dependencies and run the app
npm install && npm start
```

Brays takes in a XLSX file containing the metadata and location of files. You will need to place the metadata file and object files similar to this:

```
mycollection/
├── mycollection_metadata.xlsx
├── object_001.jpg
├── object_001_pm.tiff
├── object_002.jpg
└── object_002_pm.tiff
```

### Building

You can build Brays by running the following commands based on your target system:

* `npm run build:osx` will build for MacOS X x64
* `npm run build:win` will build for Windows x64
* `npm run build:linux` will build for Linux x64
* `npm run build` will build all the above

All builds are stored in the `build` directory that gets created during the build process.

To learn more about distributing, please read the [Application Distribution](http://electron.atom.io/docs/v0.37.5/tutorial/application-distribution/) documentation from Electron.

### Dependences

Brays needs [Greens](https://github.com/uhlibraries-digital/greens) installed to mint ARK identifiers.

## License

[MIT License](LICENSE.txt)