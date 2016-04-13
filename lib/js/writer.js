/**
 * writer.js
 *
 * Functions used to take in a array and output a CSV file
 */
var writer = {
  /**
   * Turn a array into a CSV string.
   *
   * @param Array a
   * @return String
   */
  array_to_csv: function(a) {
    var FS = ",";
    var RS = "\n";
    var out = "";

    for ( var R = 0; R < a.length; ++R ) {
      var row = a[R];
      var row_txt = "";
      for ( var C = 0; C < row.length; ++C ) {
        txt = row[C];
        if ( txt.indexOf('"') > -1 || txt.indexOf(',') > -1 || txt.indexOf("\n") > -1 ) {
          txt = "\"" + txt.replace(/"/g, '""') + "\"";
        }
        row_txt += txt + (C === row.length ? "" : FS);
      }
      out += row_txt + RS;
    }

    return out;
  },
  /**
   * Opens a save dialog to save the CSV data
   *
   * @param String data The CSV data to save
   */
  save: function(data) {
    dialog.showSaveDialog({ 
      filters: [
        { name: 'CSV', extensions: ['csv'] }
      ]
    },function(filename){
      if (filename === undefined) return;

      this.write(data, filename);
    });
  },
  /**
   * Writes CSV data string to a file
   *
   * @param String data The CSV string
   * @param String filename The full path and filename to write to
   */
  write: function(data, filename) {
    fs.writeFile(filename, data, function(err) {
      if (err !== undefined && err !== null) {
        logger.log('File save error: ' + err.message);
        dialog.showErrorBox("File Save Error", err.message);
      }
    });
  }
};