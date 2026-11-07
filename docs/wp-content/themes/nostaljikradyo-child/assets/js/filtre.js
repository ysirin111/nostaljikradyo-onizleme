/**
 * Mobil filtre çekmecesi (spec §4.2).
 *
 * Açma, kapatma, odak tuzağı, Esc, dışarı tık ve odak iadesi Görev 6'nın nav.js
 * katman mekanizmasından gelir (#sb-filtre + [data-sb-ac] / [data-sb-kapat],
 * açık durum data-acik). Bu dosya yalnız filtreye özgü iki şeyi ekler:
 * 1) Çekmece açıkken panel iletişim kutusu olarak duyurulur (role="dialog",
 *    aria-modal); kapalıyken ve masaüstünde adlandırılmış bölgedir (role="region").
 * 2) Açıkken genişlik 992 px'e çıkarsa çekmece kapatılır; yoksa nav.js'in odak
 *    tuzağı artık kenar çubuğu olan panelde kalırdı. Kapatma nav.js'in yolundan
 *    (kapatıcıya tık) yapılır; ikinci bir kapatma kodu yok.
 */
( function () {
	'use strict';

	var katman = document.getElementById( 'sb-filtre' );
	var panel = katman ? katman.querySelector( '.sb-filtre__panel' ) : null;

	if ( ! panel ) {
		return;
	}

	function roluEsitle() {
		if ( katman.hasAttribute( 'data-acik' ) ) {
			panel.setAttribute( 'role', 'dialog' );
			panel.setAttribute( 'aria-modal', 'true' );
		} else {
			panel.setAttribute( 'role', 'region' );
			panel.removeAttribute( 'aria-modal' );
		}
	}

	new MutationObserver( roluEsitle ).observe( katman, {
		attributes: true,
		attributeFilter: [ 'data-acik' ],
	} );

	window.matchMedia( '(min-width: 992px)' ).addEventListener( 'change', function ( olay ) {
		var kapatici = katman.querySelector( '[data-sb-kapat]' );

		if ( olay.matches && katman.hasAttribute( 'data-acik' ) && kapatici ) {
			kapatici.click();
		}
	} );
}() );
