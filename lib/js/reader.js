/**
 * reader.js
 *
 * Reads in a well formated xlsx to produce a CSV for ingest into Archivematica and DAMS
 */
var xlsx = require('xlsx');
var mkdirp = require('mkdirp');
var metadata_array = [];

String.prototype.padLeft = function(l, c) {
  return Array(l-this.length+1).join(c||" ")+this;
}

$(document).ready(function(){

  /** Prevent window from doing default drag and drop actions **/
  $(document).on('dragenter dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  $(document).on('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });

  $('#dnd').on('dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  $('#dnd').on('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $('#dnd').addClass('draghover');
  });
  $('#dnd').on('dragleave', function(e){
    $('#dnd').removeClass('draghover');
  });
  $('#dnd').on('drop', function(e){
    e.stopPropagation();
    e.preventDefault();

    var files = e.originalEvent.dataTransfer.files;

    logger.clear();

    for (var i = 0, f = files[i]; i != files.length; ++i){
      process_dnd_file(f);
    }
  });
});

/**
 * Opens the open file dialog to process a metadata file.
 */
function openFile() {
  logger.clear();
  dialog.showOpenDialog({ filters: [
    { name: 'Excel File', extensions: ['xlsx'] }
  ]},
  function (filenames){
    if (filenames === undefined) return;
    for (var k in filenames) {
      process_open_file(filenames[k]);
    }
  });
}

/**
 * Turns a xlsx worksheet object into a array containing metadata objects and files.
 *
 * @param Object worksheet
 * @return Array
 */
function build_metadata_array(worksheet) {
  var range = xlsx.utils.decode_range(worksheet['!ref']);

  var metadata = [];
  var headers = [];
  for ( var R = range.s.r; R <= range.e.r; ++R ) {
    var item = {};
    for ( var C = range.s.c; C <= range.e.c; ++C ) {
      var cell = xlsx.utils.encode_cell({r: R, c: C});
      
      if ( R === 0 ) {
        headers[C] = worksheet[cell].v;
      }
      else {
        item[headers[C]] = ((worksheet[cell] !== undefined) ? worksheet[cell].v : '');
      }
    }

    if ( R > 0 ) {
      if ( item["OBJECT"] === 'x' ) {
        delete item['FILE'];
        delete item['OBJECT'];
        delete item['Filename'];

        metadata.push(item);
        obj_ptr = metadata.length - 1;
      }
      else if ( item["FILE"] === 'x' ) {
        if ( metadata[obj_ptr]['_FILES'] === undefined ) metadata[obj_ptr]['_FILES'] = [];

        delete item['FILE'];
        delete item['OBJECT'];

        metadata[obj_ptr]['_FILES'].push(item);
      }
    }
  }
  return metadata;
}

/**
 * Reads in a xlsx file for processing metadata.
 *
 * @param Object f The file object
 */
function process_dnd_file(f) {
  var reader = new FileReader();
  var name = f.name;
  reader.onload = function(e) {
    var data = e.target.result;

    try {
      logger.log('Reading file: ' + f.path);
      var workbook = xlsx.read(data, {type: 'binary'});
    }
    catch (err) {
      logger.error('Error reading file: ' + err.message);
      dialog.showErrorBox("File Error", err.message);
      return;
    }
    
    process_metadata(workbook, f.path);
  };
  reader.readAsBinaryString(f);
}

/**
 * Reads in a xlsx file for processing metadata.
 *
 * @param String filename The files full path
 */
function process_open_file(filename) {
  try {
    logger.log('Reading file: ' + f.path);
    var workbook = xlsx.readFile(filename);
  }
  catch (err) {
    logger.error('Error reading file: ' + err.message);
    dialog.showErrorBox('Error reading file: ' + err.message);
    return;
  }
  process_metadata(workbook, filename);
}

/**
 * Process the metadata within the xlsx workbook
 *
 * @param Object workbook The xlsx workbook object
 */
function process_metadata(workbook, path) {
  var worksheet = workbook.Sheets[workbook.SheetNames[0]];
  metadata_array = build_metadata_array(worksheet);

  var locationpath = path.match(/.*[/\\]/);
  var subdir = 'ingest';

  var out = process_metadata_objects(locationpath, subdir);
  
  logger.log('Building CSV...');
  
  var csv = writer.array_to_csv(out);
  var targetfilename = locationpath + subdir + '/metadata.csv';
  
  writer.write(csv, targetfilename);
  logger.log('Saved CSV file to "' + targetfilename + '"');
  
  logger.log('Done');
}

/**
 * Processes the metadata array into a format that can be used in Archivematica
 *
 * @param String locationpath The location where the xlsx lives long with the files
 * @param String subdir The sub directory to place all the processed files
 * @return Array
 */
function process_metadata_objects(locationpath, subdir) {
  var objectpath = 'objects';

  // Build the headers for the AM output
  output_am_metadata = Array([
    'parts',
    'dc.title',
    'dcterms.creator',
    'dcterms.date',
    'dcterms.description',
    'dcterms.publisher',
    'dcterms.isPartOf',
    'dc.rights',
    'dcterms.identifier'
  ]);

  for ( var k in metadata_array ) {
    var item = metadata_array[k];
    
    logger.log('Processing object: "' + item['dc.title'] + '"...', 'good');
    logger.log('Sending object for minting...');
    var id = mint_object(item);
    var id_parts = id.split('/');

    var seq = (parseInt(k) + 1);
    var dirname = seq.toString().padLeft(4, "0") + '_' + id_parts[2];
    
    var dirdest = locationpath + subdir + '/' + objectpath + '/' + dirname;
    mkdirp.sync(dirdest);

    item['dcterms.identifier'] = id;
    item['parts'] = objectpath + '/' + dirname;
    output_am_metadata.push(build_am_row_array(item))
    

    for (var i = 0; i < item["_FILES"].length; ++i) {
      var file = item["_FILES"][i];

      var srcfilepath = locationpath + 'files/' + file['Filename'];
      var destfilepath = dirdest + '/' + file['Filename'];

      try {
        fs.renameSync(srcfilepath, destfilepath);
        logger.log('Moved file "' + file["Filename"] + '" to "' + subdir + '/' + objectpath + '/' + dirname + '"');
      }
      catch (err) {
        logger.error('Failed to move file "' + file["Filename"] + '", ' + err.message);
      }

      file['parts'] = objectpath + '/' + dirname + '/' + file["Filename"];
      delete file["Filename"];
      output_am_metadata.push(build_am_row_array(file));
    }
  }

  return output_am_metadata;
}

/**
 * Mints an Ark for the given object
 *
 * @param Object obj The object being minted
 * @return String The ARK identifier
 */
function mint_object(obj, counter) {
  var id = "";
  var post_data = {
    who: (obj['dcterms.creator'] === '' ? 'unknown' : obj['dcterms.creator']),
    what: obj['dc.title'],
    when: (obj['dcterms.date'] === '' ? 'unknown' : obj['dcterms.date'])
  };

  if ( settings.mint_url === '' || settings.mint_api_key === '' ) {
    logger.error('Unable to mint. Please provide the URL and/or API key for the minter.');
    return;
  }

  $.ajax({
    url: settings.mint_url,
    headers: {
      'api-key': settings.mint_api_key
    },
    async: false,
    dataType: 'json',
    method: 'POST',
    data: post_data,
    success: function (data) {
      id = 'ark:/' + data['identifier'];
      logger.log('Minted identifier "' + id + '"');
    },
    error: function(data) {
      id = false;
      logger.warn('FAILED to mint, trying again...');
    }
  });

  if ( id === false ) {
    if ( counter === undefined || counter < 5 ) {
      return mint_object(obj, counter + 1);
    }
    else {
      logger.error("FAILED to mint, I'm giving up");
      return false;
    }
  }
  else {
    return id;
  }
}

/**
 * Builds a single row that will be used in the AM ingest CSV
 *
 * @param Object item The item containing the metadata
 * @return Array The array formated for AM
 */
function build_am_row_array(item) {
  /*
   * Header columns
   *  parts
   *  dc.title
   *  dcterms.creator
   *  dcterms.date
   *  dc.description
   *  dcterms.publisher
   *  dcterms.isPartOf
   *  dc.rights
   *  dcterms.identifier
   */
  return [
    item['parts'],
    item['dc.title'],
    item['dcterms.creator'],
    item['dcterms.date'],
    item['dcterms.description'],
    item['dcterms.publisher'],
    item['dcterms.isPartOf'],
    item['dc.rights'],
    item['dcterms.identifier']
  ];
}