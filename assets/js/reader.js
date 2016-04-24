/**
 * reader.js
 *
 * Reads in a well formated xlsx to produce a CSV for ingest into Archivematica and DAMS
 */
var xlsx = require('xlsx');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var stringify = require('csv-stringify');

var metadata_array = [];
var am_objects_store = {};
var locationpath = '';
var subdir = 'ingest';
var objectpath = 'objects';
var process_counter = 0;
var process_total = 0;
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
      
      if ( item["COLL"] === 'x' ) {
        metadata.push(clean_item(item));
        coll_ptr = metadata.length - 1;
      }
      else if ( item["BOX"] === 'x' ) {
        if ( coll_ptr === undefined ) {
          logger.warn("There doesn't seem to be a collection level. I'll keep going assuming there isn't one");
          metadata.push({});
          coll_ptr = metadata.length - 1;
        }
        if ( metadata[coll_ptr]['_BOX'] === undefined ) {
          metadata[coll_ptr]['_BOX'] = [];
        }

        metadata[coll_ptr]['_BOX'].push(clean_item(item));
        box_ptr = metadata[coll_ptr]['_BOX'].length - 1;
      }
      else if ( item["FOLDER"] === 'x' ) {
        if ( box_ptr === undefined ) {
          logger.error("Sorry, there doesn't seem to be a box level. I can't move on without one.");
          return false;
        }
        if ( metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'] === undefined ) { 
          metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'] = [];
        }
        
        metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'].push(clean_item(item));
        folder_ptr = metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'].length - 1;
      }
      else if ( item["OBJECT"] === 'x' ) {
        if ( folder_ptr === undefined ) {
          logger.error("Sorry, there doesn't seem to be a folder level. I can't move on without one.");
          return false;
        }
        if ( metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'][folder_ptr]['_OBJECT'] === undefined ) {
          metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'][folder_ptr]['_OBJECT'] = [];
        }

        process_total++;
        metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'][folder_ptr]['_OBJECT'].push(clean_item(item));
        obj_ptr = metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'][folder_ptr]['_OBJECT'].length - 1;
      }
      else if ( item["FILE"] === 'x' ) {
        if ( metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'][folder_ptr]['_OBJECT'][obj_ptr]['_FILES'] === undefined ) {
          metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'][folder_ptr]['_OBJECT'][obj_ptr]['_FILES'] = [];
        }

        metadata[coll_ptr]['_BOX'][box_ptr]['_FOLDER'][folder_ptr]['_OBJECT'][obj_ptr]['_FILES'].push(clean_item(item, true));
      }
      
    }

  }

  return metadata;
}

/**
 * Cleans up the item hash
 *
 * @param Object item The item to clean up
 * @param Boolean isFile true if the item is a file object
 * @return Object
 */
function clean_item(item, isFile) {
  delete item["COLL"];
  delete item["BOX"];
  delete item["FOLDER"];
  delete item["OBJECT"];
  delete item["FILE"];
  if ( !isFile ) {
    delete item["filename"];
    delete item["PM"];
    delete item["MM"];
    delete item["AC"];
  }

  return item;
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
  if ( metadata_array === false ) return;

  locationpath = path.match(/.*[/\\]/);

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
  for ( var coll_idx in metadata_array ) {
    metadata_array[coll_idx]['parts'] = objectpath;
    var collection = metadata_array[coll_idx];
    for ( var box_idx in collection['_BOX'] ) {
      var box = collection['_BOX'][box_idx];
      for (var folder_idx in box['_FOLDER'] ) {
        var folder = box['_FOLDER'][folder_idx];
        for ( var obj_idx in folder['_OBJECT'] ) {
          var item = folder['_OBJECT'][obj_idx];
          item['ma_index'] = coll_idx;
          item['box_index'] = box_idx;
          item['folder_index'] = folder_idx;
          item['object_index'] = obj_idx;

          mint_object(item);
        }
      }
    }
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

    var id = item['dcterms.identifier'];
    var id_parts = id.split('/');

    var collection = metadata_array[item['ma_index']];
    var box = collection['_BOX'][item['box_index']];
    var folder = box['_FOLDER'][item['folder_index']];

    
    var seq = (parseInt(item['object_index']) + 1);
    var objectdir = seq.toString().padLeft(4, "0") + '_' + id_parts[2];
    var basedir = locationpath + subdir;
    var postdir = box['dc.title'] + '/' + folder['dc.title'] + '/' + objectdir;

    item['dcterms.identifier'] = id;

    for (var i = 0; i < item["_FILES"].length; ++i) {
      var file = item["_FILES"][i];
      var parts = '';
      var filename = '';

      if ( file['PM'] !== '' ) {
        parts = objectpath + '/pm/' + postdir;
        filename = file['filename'] + '_pm' + file['PM'];
        
        move_file(filename, basedir + '/' + parts);

        add_parts_to_am_store(parts, item);
        add_parts_to_am_store(parts + '/' + filename, file);
      }
      if ( file['MM'] !== '' ) {
        parts = objectpath + '/mm/' + postdir;
        filename = file['filename'] + '_mm' + file['MM']; 

        move_file(filename , basedir + '/' + parts);

        add_parts_to_am_store(parts, item);
        add_parts_to_am_store(parts + '/' + filename, file);
      }
      if ( file['AC'] !== '' ) {
        parts = objectpath + '/ac/' + postdir;
        filename = file['filename'] + file['AC'];

        move_file(filename, basedir + '/' + parts);

        add_parts_to_am_store(parts, item);
        add_parts_to_am_store(parts + '/' + filename, file);
      }

      if ( parts === '' ) {
        logger.warn('File "' + file['filename'] + '" does not have PM/MM/AC set.');
      }
    }

    if ( process_counter === process_total ) {
      output_am_csv_file();
    }
}

/**
 * Adds the parts path to the Archivematica store to be used during CSV build
 *
 * @param String parts The parts column in AM csv
 * @param Object object The object to assign to the parts
 */
function add_parts_to_am_store(parts, object) {
  if ( !(parts in am_objects_store) ) {
    am_objects_store[parts] = Object.assign({}, object, { parts: parts });
  }
}

/**
 * Movies file to destination
 *
 * @param String filename The file name to be moved
 * @param String dest The destination path
 * @return Boolean True if move was successful
 */
function move_file(filename, dest) {
  mkdirp.sync(dest, function(err) {
    if (err) {
      logger.error('Failed to create object directory. "' + dirdest + '"');
      return false;
    }
  });

  var srcfilepath = locationpath + '/' + filename;

  try {
    fs.renameSync(srcfilepath, dest + '/' + filename);
    logger.log('Moved file "' + filename + '" to "' + dest + '"');
  }
  catch (err) {
    logger.error('Failed to move file "' + filename + '", ' + err.message);
    return false;
  }

  return true;
}

/**
 * Output the Archivematica CSV file from metadata_array
 */
function output_am_csv_file() {
  logger.log('Building Archivematica CSV...');
  var out = build_am_csv_array();
  var metadatadir = locationpath + subdir + '/metadata';
  mkdirp.sync(metadatadir);

  mkdirp.sync(locationpath + subdir + '/log');
  
  stringify(out, function(err, output) {
      writer.write(output, metadatadir + '/metadata.csv');
      logger.log('Saved CSV file');
      logger.log('Done');
  });
}

/**
 * Builds a array for CSV output from the metadata_array
 *
 * @return Array
 */
function build_am_csv_array() {
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
    'dcterms.accessRights',
    'dcterms.identifier'
  ]);

  output_am_metadata.push(build_am_row_array(metadata_array[0]));

  /* Archivematica csv is in the order of the file system */
  files = walk(locationpath + subdir + '/' + objectpath);
  var prevobjectparts = '';
  for ( var i = 0; i < files.length; i++ ) {
    var file = files[i];

    /* Output the object parts */
    var parts = file.toString().match(/.*[/]/)[0].slice(0, -1).replace(locationpath + subdir + '/', '');
    if ( parts !== prevobjectparts ) {
      if ( parts in am_objects_store ) {
        output_am_metadata.push(build_am_row_array(am_objects_store[parts]));
      }
      else {
        logger.warn('Could not find objects metadata for AM csv');
      }
      prevobjectparts = parts;
    }

    /* Output the file parts */
    parts = file.toString().replace(locationpath + subdir + '/', '');
    if ( parts in am_objects_store ) {
      output_am_metadata.push(build_am_row_array(am_objects_store[parts]));
    }
    else {
      logger.warn('Could not find objects metadata for AM csv');
    }
  }

  return output_am_metadata;
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
   *  dcterms.accessRights
   *  dcterms.identifier
   */
  return [
    item['parts'] || '',
    item['dc.title'] || '',
    item['dcterms.creator'] || '',
    item['dcterms.date'] || '',
    item['dcterms.description'] || '',
    item['dcterms.publisher'] || '',
    item['dcterms.isPartOf'] || '',
    item['dc.rights'] || '',
    item['dcterms.accessRights'] || '',
    item['dcterms.identifier'] || ''
  ];
}

/**
 * Walks the directory and subdirectory and returns an array of files.
 *
 * @param String dir The directory to walk
 * @param Array filelist The list of files found in walk
 * @return Array
 */
function walk(dir, filelist) {
  var files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      filelist = walk(dir + '/' + file, filelist);
    }
    else {
      filelist.push(dir + '/' + file);
    }
  });
  return filelist;
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
    who: item['dcterms.creator'] || 'unknown',
    what: item['dc.title'],
    when: item['dcterms.date'] || 'unknown'
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
      var id = data['id'];
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
  if ( process_counter !== process_total ) {
    logger.warn("Finished minting but processing didn't seem to finish. This doesn't seem right");
  }
});

/**
 * Rollback what has been done. This deletes all minted identifiers during the process and moves files back.
 */
function rollback(){
  rolling_back = true;
  logger.warn('ROLLING BACK TO ORIGINAL STATE...');

  for ( var coll_idx in metadata_array ) {
    var collection = metadata_array[coll_idx];
    for ( var box_idx in collection['_BOX'] ) {
      var box = collection['_BOX'][box_idx];
      for (var folder_idx in box['_FOLDER'] ) {
        var folder = box['_FOLDER'][folder_idx];
        for ( var obj_idx in folder['_OBJECT'] ) {
          var item = folder['_OBJECT'][obj_idx];
          if ( item['dcterms.identifier'] !== undefined && 
               item['dcterms.identifier'] !== '' && 
               item['dcterms.identifier'].indexOf('ark:/') === 0 
          ){
            logger.log('Destroying identifier "' + item['dcterms.identifier'] + '"');
            delete_identifier(item['dcterms.identifier']);
          }
        }
      }
    }
  }

  logger.warn('Moving files back to "' + locationpath + '"');
  var files = walk(locationpath + subdir + '/' + objectpath);

  for ( var i in files ) {
    var file = files[i];
    var filename = file.match(/[^\/\\]+$/)[0];
    try {
      fs.renameSync(file, locationpath + filename);
      logger.log('Moved file "' + filename + '" back to "' + locationpath + '"');
    } catch (err) {
      logger.error(err.message);
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