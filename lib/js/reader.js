/**
 * reader.js
 *
 * Reads in a well formated xlsx to produce a CSV for ingest into Archivematica and DAMS
 */
var xlsx = require('xlsx');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var metadata_array = [];
var locationpath = '';
var subdir = '';
var process_counter = 0;
var rolling_back = false;

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

  locationpath = path.match(/.*[/\\]/);
  subdir = 'ingest';

  rolling_back = false;
  process_counter = 0;

  process_metadata_objects();
}

/**
 * Processes the metadata array into a format that can be used in Archivematica
 *
 * @param String locationpath The location where the xlsx lives long with the files
 * @param String subdir The sub directory to place all the processed files
 * @return Array
 */
function process_metadata_objects() {
  logger.log('Sending objects for minting...');
  for ( var k in metadata_array ) {
    var item = metadata_array[k];
    item['ma_index'] = k;    
    
    mint_object(item);    
  }
}

/**
 * Process all the files in a object
 *
 * @param Object item The item to process
 */
function process_object_files(item) {
    if ( rolling_back ) return;
    process_counter++;

    var objectpath = 'objects';

    var id = item['dcterms.identifier'];
    var id_parts = id.split('/');

    var seq = (parseInt(item['ma_index']) + 1);
    var dirname = seq.toString().padLeft(4, "0") + '_' + id_parts[2];
    
    var dirdest = locationpath + subdir + '/' + objectpath + '/' + dirname;
    mkdirp.sync(dirdest, function(err) {
      if (err) {
        logger.error('Failed to create object directory. "' + dirdest + '"');
      }
    });

    item['dcterms.identifier'] = id;
    item['parts'] = objectpath + '/' + dirname;    

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

      /* Put everything back into the item array for rollback */
      item["_FILES"][i] = file;
    }

    /* Put everyting back into the metadata_array for rollback */
    metadata_array[item['ma_index']] = item;

    if ( process_counter === metadata_array.length ) {
      output_csv_file();
    }
}

/**
 * Output the CSV file from metadata_array
 */
function output_csv_file() {
  logger.log('Building CSV...');
  
  out = build_csv_array();

  var csv = writer.array_to_csv(out);
  var targetfilename = locationpath + subdir + '/metadata.csv';
  
  writer.write(csv, targetfilename);
  logger.log('Saved CSV file to "' + targetfilename + '"');
  
  logger.log('Done');
}

/**
 * Builds a array for CSV output from the metadata_array
 *
 * @return Array
 */
function build_csv_array() {
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
    output_am_metadata.push(build_am_row_array(item));
    for ( var i in item["_FILES"] ) {
      var file = item["_FILES"][i];
      output_am_metadata.push(build_am_row_array(file));
    }
  }

  return output_am_metadata;
}

/**
 * Mints an Ark for the given object
 *
 * @param Object item The item being minted
 * @param Int counter A counter keeping track of how many times we've gone around
 * @return String The ARK identifier
 */
function mint_object(item, counter) {
  if ( counter === undefined ) {
    counter = 0;
  }

  var post_data = {
    who: (item['dcterms.creator'] === '' ? 'unknown' : item['dcterms.creator']),
    what: item['dc.title'],
    when: (item['dcterms.date'] === '' ? 'unknown' : item['dcterms.date'])
  };

  if ( settings.mint_url === '' || settings.api_key === '' ) {
    logger.error('Unable to mint. Please provide the URL and/or API key for the minter.');
    return;
  }

  $.ajax({
    url: settings.mint_url,
    headers: {
      'api-key': settings.api_key
    },
    dataType: 'json',
    method: 'POST',
    data: post_data,
    success: function (data) {
      var id = 'ark:/' + data['identifier'];
      logger.log('Identifier "' + id + '" => "' + item['dc.title'] + '"', 'good');
      item['dcterms.identifier'] = id;
      process_object_files(item);
    },
    error: function(data) {
      logger.warn('FAILED to mint "' + item['dc.title'] + '", trying again...');
      if ( counter > 5 ) {
        logger.error('FAILED to mint "' + item['dc.title'] + "\" for the last time");
        logger.error("Unable to get ARK identifier. Something bad must have happened so I'm quitting.");
        rollback();
      }
      else {
        mint_object(item, counter + 1);
      }
    }
  });
}

$(document).ajaxStop(function(){
  if ( process_counter !== metadata_array.length ) {
    logger.warn("Finished minting but processing didn't seem to finish. This doesn't seem right");
  }
});

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

/**
 * Rollback what has been done. This deletes all minted identifiers during the process and moves files back.
 */
function rollback(){
  rolling_back = true;
  logger.warn('ROLLING BACK TO ORIGINAL STATE...');

  for ( var k in metadata_array ) {
    var item = metadata_array[k];

    if ( item['dcterms.identifier'] !== undefined && 
         item['dcterms.identifier'] !== '' && 
         item['dcterms.identifier'].indexOf('ark:/') === 0 
    ){
    
      logger.log('Destroying identifier "' + item['dcterms.identifier'] + '"');
      delete_identifier(item['dcterms.identifier']);
    
    }

    for ( var i in item["_FILES"] ) {
      var file = item["_FILES"][i];
      if ( file['parts'] !== undefined && file['parts'] !== '' ) {
        var src = locationpath + subdir + '/' + file['parts'];
        var dest = locationpath + 'files/' + file['Filename'];
        logger.log('Moving file "' + file['Filename'] + '" back to files/');
        fs.renameSync(src, dest, function(err) { 
          if (err) {
            logger.error(err.message);
          }
        });
      }
    }
  }

  if ( subdir !== '' && subdir !== '/' && subdir !== "\\") {
    var ignestpath = locationpath + subdir;
    logger.log('Removing ingest directory "' + ignestpath + '"');
    rimraf(ignestpath, function(err) { });
  }

  logger.warn('Done');
}

/**
 * Deletes the ARK identifier from the resolver.
 *
 * @param String ark The ARK identifier to delete
 */
function delete_identifier(ark){
  if (settings.destroy_url.slice(-1) !== '/') { 
    settings.destroy_url += '/'
  }

  $.ajax({
    url: settings.destroy_url + ark,
    headers: {
      'api-key': settings.api_key
    },
    method: 'DELETE',
    success: function (data) {
      logger.log('Identifier "' + ark + '" successfully destoryed');
    }
  });
}