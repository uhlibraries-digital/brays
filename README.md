# Brays

Is a Archivematica & Hydra-in-a-Box ingest utility built on [Electron](http://electron.atom.io/).

## To Use

Clone and run this repository. You will need [Node.js](https://nodejs.org/en/download/) installed. From the command line:

```bash
git clone ...
# Go to the repository
cd brays
# Install dependencies and run the app
npm install && npm start
```

Brays takes in a XLSX file containing the metadata and location of files. You will need to place the metadata file and object files similar to this:

```
mycollection/
├── files/
│   └── object_001.tiff
│   └── object_002.tiff
└── mycollection_metadata.xlsx
```

To distribute, please read the [Application Distribution](http://electron.atom.io/docs/v0.37.5/tutorial/application-distribution/) documentation from Electron.

### Dependences

Brays needs [Greens](https://github.com/uhlibraries-digital/greens) installed to mint ARK identifiers.