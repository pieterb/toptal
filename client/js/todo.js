"use strict";


// Object.defineProperty(lucid, 'contacts', {enumerable: true, value:
// lucid_contacts});
// delete lucid_contacts;


// $(function(){}) is shorthand for $(document).ready(function(){}):
$( function() {
  // Code in this callback function guaranteed to run after dom is ready.


  // If you don't do this, the "fade" animation doesn't work.
  $( '.tab-pane.active.fade' ).addClass( 'in' );

} );
