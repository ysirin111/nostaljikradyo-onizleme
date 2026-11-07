/**
 * Kayan güven şeridi (Görev 6; envanter §1.3) — [data-sb-kayan].
 *
 * Sunucu dört maddeyi düz liste olarak basar; JS yokken ya da hareket azaltılmışken liste ortalanmış
 * ve durağandır. JS + hareket serbest: ilk set kendi maddeleriyle bir kez daha uzar (her ekranı
 * doldursun), sonra set kopyalanır ve iz -%50 kayar. Kopyalar aria-hidden="true": ekran okuyucu
 * dört maddeyi bir kez okur. Duraklat düğmesi (aria-pressed) şeridi durdurur; fare üstündeyken ve
 * odak içerideyken de durur (CSS).
 */
( function () {
	'use strict';

	var kok = document.querySelector( '[data-sb-kayan]' );
	if ( ! kok || window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}
	var iz = kok.querySelector( '[data-sb-kayan-iz]' );
	var ilk = iz ? iz.querySelector( 'ul' ) : null;
	var dugme = kok.querySelector( '[data-sb-kayan-duraklat]' );
	if ( ! ilk || ! dugme ) {
		return;
	}

	Array.prototype.slice.call( ilk.children ).forEach( function ( madde ) {
		var kopya = madde.cloneNode( true );
		kopya.setAttribute( 'aria-hidden', 'true' );
		ilk.appendChild( kopya );
	} );
	var set = ilk.cloneNode( true );
	set.removeAttribute( 'id' );
	set.setAttribute( 'aria-hidden', 'true' );
	iz.appendChild( set );

	kok.classList.add( 'sb-guven--kayan' );
	dugme.hidden = false;
	dugme.addEventListener( 'click', function () {
		var durdu = kok.classList.toggle( 'is-durdu' );
		dugme.setAttribute( 'aria-pressed', durdu ? 'true' : 'false' );
	} );
}() );
