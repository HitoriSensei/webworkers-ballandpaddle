$('.figures').hide();

$('#show-debug-info').click(function () {
  var figures = $('.figures');
  if(figures.is(':hidden')) {
    figures.show();
  } else {
    figures.hide();
  }

});