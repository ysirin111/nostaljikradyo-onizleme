/**
 * Kapalı swatch erişilebilirlik ağacında da kapalı (Plan 2 Görev 4; WCAG 4.1.2).
 * woo-variation-swatches seçilemeyen seçeneğe yalnız `disabled` sınıfı ve tabindex=-1 veriyor
 * (assets/js/frontend.js:234-238), aria-disabled basmıyor: ekran okuyucu tükenmiş rengi seçilebilir
 * okuyordu. Sınıf her değiştiğinde (seçim, sıfırlama) aria-disabled eşitlenir.
 */
( function () {
	'use strict';

	var formlar = document.querySelectorAll( 'form.variations_form' );
	if ( ! formlar.length || ! window.MutationObserver ) {
		return;
	}

	function esitle( oge ) {
		if ( oge.classList.contains( 'disabled' ) ) {
			oge.setAttribute( 'aria-disabled', 'true' );
		} else {
			oge.removeAttribute( 'aria-disabled' );
		}
	}

	var gozlemci = new MutationObserver( function ( kayitlar ) {
		kayitlar.forEach( function ( kayit ) {
			if ( kayit.target.matches && kayit.target.matches( 'li.variable-item' ) ) {
				esitle( kayit.target );
			}
		} );
	} );

	Array.prototype.forEach.call( formlar, function ( form ) {
		Array.prototype.forEach.call( form.querySelectorAll( 'li.variable-item' ), esitle );
		gozlemci.observe( form, { subtree: true, attributes: true, attributeFilter: [ 'class' ] } );
	} );
}() );
