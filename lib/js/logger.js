/**
 * logger.js
 *
 * Displays log messages to the applications logger display
 */
var logger = {
  /**
   * Display given message to logger display
   *
   * @param String message The message to display
   */
  log: function(message) {
    $('.logger-display-list').append('<li>' + message + '</li>');
    $('#logger-display').animate({
      scrollTop: $('.logger-display-list').height()
    }, 0);
  },
  /**
   * Clears the logger display
   */
  clear: function() {
    $('.logger-display-list li').remove();
  }
};