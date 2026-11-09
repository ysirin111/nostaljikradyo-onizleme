/**
 * Ana sayfa ızgaraları (videolar, referanslar): kademeli giriş — [data-sb-kademeli].
 *
 * Bu betik yalnız ızgaranın çocuklarını görünür alana girince sırayla getirir. Gizleyen sınıfı
 * yalnız betik ekler, yalnız hareket serbestken ve yalnız ilk ekranın altındaki ızgaraya: JS yoksa ya
 * da hareket azaltılmışsa hiçbir şey gizlenmez (belirme.js ile aynı kural, spec §4.4).
 */
( function () {
	'use strict';

	if ( ! window.matchMedia( '(prefers-reduced-motion: no-preference)' ).matches || ! ( 'IntersectionObserver' in window ) ) {
		return;
	}

	var bekleyenler = Array.prototype.filter.call( document.querySelectorAll( '[data-sb-kademeli]' ), function ( izgara ) {
		return izgara.getBoundingClientRect().top > window.innerHeight;
	} );
	if ( ! bekleyenler.length ) {
		return;
	}

	var gozcu = new IntersectionObserver(
		function ( kayitlar ) {
			kayitlar.forEach( function ( kayit ) {
				if ( kayit.isIntersecting ) {
					kayit.target.classList.remove( 'sb-kademeli-bekliyor' );
					gozcu.unobserve( kayit.target );
				}
			} );
		},
		{ threshold: 0.18 }
	);

	bekleyenler.forEach( function ( izgara ) {
		Array.prototype.forEach.call( izgara.children, function ( cocuk, i ) {
			cocuk.style.setProperty( '--sb-sira', String( i ) );
		} );
		izgara.classList.add( 'sb-kademeli-bekliyor' );
		gozcu.observe( izgara );
	} );

	window.requestAnimationFrame( function () {
		bekleyenler.forEach( function ( izgara ) {
			izgara.classList.add( 'sb-kademeli-gecis' );
		} );
	} );
}() );
