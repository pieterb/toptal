"use strict";

// This is a node module. (No it isn't!)
// See: http://nodejs.org/api/modules.html


// Set `global` to `null` if it's undefined:
if (typeof global === 'undefined') {
  /** @type {?object} */
  global = null;
}
// From now on, we can do:
// if (global) ...
// without risking a ReferenceError exception.


if (global) {
  var fs = require( 'fs' );
  var util = require( 'util' );
  // var Gaze = require( 'gaze' ).Gaze;
  // HUH? no other requirements?
}


var lucid = function() {
  var that = this;
  // Private variables:

  var CONFIG_DIR = (global ? process.env.HOME + '/.lucipher/' : null);

  // Private methods:


  // Public privileged methods:


  this.getConfig = function(name, defaultValue) {
    var retval = localStorage[name];
    if (_.isUndefined( retval ))
      retval = localStorage[name] = JSON.stringify( defaultValue );
    return JSON.parse( retval );
  };


  this.setConfig = function(name, value) {
    localStorage[name] = JSON.stringify( value );
    return that;
  };


  // Unprivileged:

  this.initializeTooltips = function() {
    var TOOLTIP_CONTROL = $( '#navbar-button-toggle-tooltip' );
    var TOOLTIP_DEFAULTS = {
      container : 'body',
      html : true
    };
    var TOOLTIPS = null;
    /**
     * Bring all tooltips in line with the current 'show-tooltips' setting.
     */
    var updateState = function() {
      if (that.getConfig( 'show-tooltips', true )) {
        TOOLTIP_CONTROL.removeClass( 'fa fa-life-ring' ).addClass( 'glyphicon glyphicon-comment' );
        TOOLTIP_CONTROL.parent().tooltip( 'destroy' ).attr( 'title', 'Click to disable tooltips.' );
        TOOLTIPS.tooltip( TOOLTIP_DEFAULTS );
      } else {
        TOOLTIP_CONTROL.removeClass( 'glyphicon glyphicon-comment' ).addClass( 'fa fa-life-ring' );
        TOOLTIPS.tooltip( 'destroy' );
        TOOLTIP_CONTROL.parent().attr( 'title', 'Click to enable tooltips.' ).tooltip( TOOLTIP_DEFAULTS );
      }
    };
    TOOLTIP_CONTROL.click( function(event) {
      that.setConfig( 'show-tooltips', TOOLTIP_CONTROL.hasClass( 'fa-life-ring' ) );
      updateState();
    } );
    that.initializeTooltips = function() {
      TOOLTIPS = $( '[data-toggle=\'tooltip\']' );
      TOOLTIPS.tooltip( TOOLTIP_DEFAULTS );
      updateState();
    };
    that.initializeTooltips();
  };

  this.SERVER_URL = (function() {
    try {
      return global ? fs.readFileSync( CONFIG_DIR + 'url' ) : 'http://localhost:11001/mooi123/';
    } catch (e) {
      // FIXME: Oops, no server; this is a real problem!
    }
    return null;
  })();

};
lucid = new lucid();



(function() {

  /** @memberOf lucid.HRFP */
  var rectify = function(hrfp) {
    var selectionEnd = hrfp.input[0].selectionEnd;
    if (hrfp.input[0].selectionStart != selectionEnd)
      return;
    var val = hrfp.input.val();
    val = val.toUpperCase().replace( /_/g, '.' ).replace( /O/g, '0' );
    val = val.substring( 0, selectionEnd ) + '_' + val.substring( selectionEnd, val.length );
    // `correct_left` is `true` when the cursor is exactly before a '–'
    // character.
    var correct_left = /_–/.test( val );
    val = val.replace( /[^_23456789ABCDEFGHJKLMNPQRSTUVWXYZ0]/g, '' );
    selectionEnd = val.search( '_' );
    val = val.substring( 0, selectionEnd ) + val.substring( selectionEnd + 1, val.length );
    if (val.length > 24)
      val = val.substr( 0, 24 );
    if (val.length > 0)
      val = val.match( /.{1,4}/g ).join( '–' );
    hrfp.input.val( val );
    selectionEnd += Math.floor( selectionEnd / 4 );
    if (correct_left && selectionEnd % 5 === 0)
      selectionEnd -= 1;
    if (selectionEnd > val.length)
      selectionEnd = val.length;
    hrfp.input[0].selectionStart = hrfp.input[0].selectionEnd = selectionEnd;
  };


  /** @memberOf lucid.HRFP */
  var verify_content = function(val) {
    var characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ0';
    var checksum = 0;
    var MULTIPLIERS = [ 1, 2, 4, 5, 7, 8, 10, 13, 14 ];
    for (var i = 22; i >= 0; i--) {
      var o = characters.search( val.substr( i, 1 ) );
      if (o < 0 || o > 31) {
        return false;
      }
      checksum += o * MULTIPLIERS[(22 - i) % 9];
    }
    return val.substr( 23, 1 ) == characters.substr( checksum % 33, 1 );
  };


  /** @memberOf lucid.HRFP */
  var verify = function(hrfp) {
    hrfp.form_group.removeClass( 'has-error' ).removeClass( 'has-success' );
    hrfp.help_blocks.addClass( 'hidden' );
    hrfp.feedbacks.addClass( 'invisible' );
    var val = hrfp.input.val();
    val = val.replace( /[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ0]/g, '' );
    if (val.length != 24)
      return;
    if (verify_content( val )) {
      hrfp.form_group.addClass( 'has-success' );
      hrfp.feedbacks.filter( '.glyphicon-ok' ).removeClass( 'invisible' );
      hrfp.help_blocks.filter( '.hrfp-valid' ).removeClass( 'hidden' );
    } else {
      hrfp.form_group.addClass( 'has-error' );
      hrfp.feedbacks.filter( '.glyphicon-warning' ).removeClass( 'invisible' );
      hrfp.help_blocks.filter( '.hrfp-invalid' ).removeClass( 'hidden' );
    }
  };


  lucid.HRFP = function(form_group) {
    var that = this;
    this.form_group = form_group;
    this.input = this.form_group.children( 'input' );
    this.feedbacks = this.form_group.children( '.form-control-feedback' );
    this.help_blocks = this.form_group.children( '.help-block' );
    this.input.keyup( function(_ /* event */) {
      rectify( that );
      verify( that );
    } );
  };

}());


lucid.contacts = function() {


  var that = this;
  /** @memberOf lucid.contacts */
  var contacts = [];
  /** @memberOf lucid.contacts */
  var lastSelectedContact = null;


  // Privileged methods:

  /** @memberOf lucid.contacts */
  var clearButton = null;
  Object.defineProperty( this, 'clearButton', {
    enumerable : true,
    get : function() {
      return clearButton || (clearButton = $( '#contacts-pane-filter button' ));
    }
  } );


  /** @memberOf lucid.contacts */
  var inputField = null;
  Object.defineProperty( this, 'inputField', {
    enumerable : true,
    get : function() {
      return inputField || (inputField = $( '#contacts-pane-filter input' ));
    }
  } );


  /** @memberOf lucid.contacts */
  var buttonGroup = null;
  Object.defineProperty( this, 'buttonGroup', {
    enumerable : true,
    get : function() {
      return buttonGroup || (buttonGroup = $( '#contacts-pane-left .btn-group-vertical' ));
    }
  } );


  /** @memberOf lucid.contacts */
  var oldContent = '';
  /** @memberOf lucid.contacts */
  var timeout = null;

  /** @memberOf lucid.contacts */
  var updateFilter = function() {
    timeout = null;
    that.buttonGroup.children().removeClass( 'hidden' );
    var filters = that.inputField[0].value;
    if ('' === filters) {
      return;
    }
    filters = filters.toLowerCase().latinize().split( /\s+/ );
    _.filter( contacts, function(contact) {
      return _.some( filters, function(filter) {
        return !_.some( contact.names, function(name) {
          return name.toLowerCase().latinize().indexOf( filter ) >= 0;
        } ) && !_.some( contact.phones, function(phone) {
          var f = filter.replace( /[^+\d]/g, '' ).replace( /^0/, '' );
          var p = phone.value.replace( /[^+\d]/g, '' );
          return ('' !== f && p.toLowerCase().indexOf( f ) >= 0);
        } ) && !_.some( contact.emails, function(email) {
          return email.value.toLowerCase().latinize().indexOf( filter ) >= 0;
        } );
      } );
    } ).forEach( function(contact) {
      // console.log(contact.lucid);
      $( '#contacts-button-' + contact.lucid ).addClass( 'hidden' );
    } );
  };


  /** @memberOf lucid.contacts */
  var createContactButtons = function() {
    that.buttonGroup.children().remove();
    var template = _.template( '\
      <button id="contacts-button-<%= lucid %>" class="btn btn-default" \
              type="button" data-toggle="tooltip" data-placement="right" \
              title="Click to see contact’s details.<br/>Hold ⌘⃣ for multi-select.">\
        <img src="<%= imageSource %>" class="img-rounded" /> \
        <%= name %>\
      </button>' );
    contacts.forEach( function(contact) {
      that.buttonGroup.append( template( {
        lucid : _.escape( contact.lucid ),
        imageSource : (contact.photo ? 'sample/photos/' + _.escape( contact.lucid ) + '.48x64.jpg' : 'img/anonymous.48x64.jpg'),
        name : _.escape( contact.names[0] )
      } ) );
    } );
    lucid.initializeTooltips();
    that.buttonGroup.children().click( that.contactClicked );
  }



  this.selectionChanged = function() {
    var counter = 0;
    that.buttonGroup.children( 'button' ).each( function() {
      if ($( this ).hasClass( 'btn-primary' ))
        counter += 1;
    } );
    if (0 === counter) {
      $( '#contacts-pane-left .contact-selected' ).each( function() {
        var $this = $( this );
        if ('LI' === this.nodeName)
          $this.addClass( 'disabled' );
        else
          $this.attr( 'disabled', 'disabled' );
      } );
    } else {
      $( '#contacts-pane-left .contact-selected' ).each( function() {
        var $this = $( this );
        if ('LI' === this.nodeName)
          $this.removeClass( 'disabled' );
        else
          $this.attr( 'disabled', null );
      } );
    }
  };


  this.addContactClicked = function(event) {
    $( '#add-contact-wizard' ).modal( 'show' );
  }


  this.contactClicked = function(event) {
    var $this = $( this );
    if (event.metaKey || event.shiftKey) {
      if ($this.hasClass( 'btn-primary' )) {
        $this.removeClass( 'btn-primary' ).addClass( 'btn-default' );
      } else {
        $this.removeClass( 'btn-default' ).addClass( 'btn-primary' );
      }
    } else {
      that.buttonGroup.children().removeClass( 'btn-primary' ).addClass( 'btn-default' );
      $this.removeClass( 'btn-default' ).addClass( 'btn-primary' );
    }
    that.selectionChanged();
  };


  this.filterChanged = function(_ /* event */) {
    var content = that.inputField[0].value;
    if (oldContent === content)
      return;
    if ('' === content)
      that.clearButton.attr( 'disabled', 'disabled' );
    else if ('' === oldContent)
      that.clearButton.attr( 'disabled', null );
    // TODO: Do the actual filtering on the list of contacts.
    oldContent = content;
    if (timeout)
      clearTimeout( timeout );
    timeout = setTimeout( updateFilter, 250 );
  };


  // Unprivileged:
  this.clearFilter = function(_ /* event */) {
    that.inputField[0].value = '';
    that.filterChanged();
    that.inputField.focus();
  };


  this.load = function() {
    $.getJSON( lucid.SERVER_URL + 'contacts.json', function(data, _textStatus, _jqXHR) {
      contacts = _.sortBy( data, function(c) {
        return c.names[0]
      } );
      createContactButtons();
    } ).fail( function() {
      // FIXME: This is bad!
      console.log( this );
    } );
  };

};
lucid.contacts = new lucid.contacts();


// Object.defineProperty(lucid, 'contacts', {enumerable: true, value:
// lucid_contacts});
// delete lucid_contacts;


// $(function(){}) is a shorthand for $(document).ready(function(){}):
$( function() {
  // Code in this callback function guaranteed to run after dom is ready.


  // Found this somewhere on the internet... If you don't do this, the "fade"
  // animation doesn't work.
  $( '.tab-pane.active.fade' ).addClass( 'in' );


  // Dynamically adept the top of the top level container to the navbar height:
  $( '#lucid-top-level-container' ).css( 'top', $( '.navbar-fixed-top' ).css( 'height' ) );


  // Set up the horizontal divider in the contacts pane:
  // First, initialize the position, based on saved config...
  (function() {
    var contactsPaneResizerPositionLeft = lucid.getConfig( 'contacts-pane-resizer.position-left', 200 );
    $( '#contacts-pane-left' ).css( 'width', contactsPaneResizerPositionLeft.toString() + 'px' );
    $( '#contacts-pane-right' ).css( 'left', (contactsPaneResizerPositionLeft + 5).toString() + 'px' );
    $( '#contacts-pane-resizer' ).css( 'left', contactsPaneResizerPositionLeft.toString() + 'px' );
  }());
  // ...and then make the divider horizontally draggable:
  $( '#contacts-pane-resizer' ).draggable( {
    axis : "x",
    containment : $( '#contacts-pane-resizer-container' ),
    drag : function(event, ui) {
      lucid.setConfig( 'contacts-pane-resizer.position-left', ui.position.left );
      $( '#contacts-pane-right' ).css( 'left', (ui.position.left + 5).toString() + 'px' );
      $( '#contacts-pane-left' ).css( 'width', ui.position.left.toString() + 'px' );
    }
  } );


  // Graphically improve all HRFP-controls:
  $( '.form-group-hrfp' ).each( function() {
    new lucid.HRFP( $( this ) );
  } )


  // Dynamically adept the top and bottom of the contacts list:
  $( '#contacts-pane-left .btn-group-vertical' ).css( 'top', $( '#contacts-pane-left-top' ).css( 'height' ) ).css( 'bottom', $( '#contacts-pane-actions' ).css( 'height' ) );


  // Connect necessary event listeners in the contacts pane:
  lucid.contacts.inputField.on( 'keyup', lucid.contacts.filterChanged );
  lucid.contacts.clearButton.click( lucid.contacts.clearFilter );
  $( '#contacts-pane-left .btn-group-vertical button' ).click( lucid.contacts.contactClicked );
  $( '#contacts-pane-left .lucid-add-contact' ).click( lucid.contacts.addContactClicked );
  $( '#contacts-loader-progress-bar' ).progressbar( {
    value : false
  } );
  lucid.contacts.load();
  lucid.contacts.buttonGroup.keydown( function(event) {
    if (event.metaKey && event.keyCode === 65) {
      event.preventDefault();
      $( this ).children( 'button' ).removeClass( 'btn-default' ).addClass( 'btn-primary' );
    }
  } );


  lucid.initializeTooltips();
  lucid.contacts.inputField.focus();
  $( '#add-contact-wizard' ).modal( 'show' );
} );
