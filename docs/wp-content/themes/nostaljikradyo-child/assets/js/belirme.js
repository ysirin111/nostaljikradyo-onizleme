/**
 * Bölüm belirme — [data-sb-belirme] bölümleri görünür alana girince belirir (spec §4.4).
 *
 * - Yalnız JS çalışıyorsa ve prefers-reduced-motion "no-preference" ise.
 * - Yalnız sayfa açıldığında EKRANIN ALTINDA kalan bölümler gizlenir; ilk ekrandaki
 *   içerik hiçbir an gizlenmez, JS'i beklemez.
 * - Gizleyen sınıfı yalnız bu betik ekler: JS yoksa ya da hata verirse her şey görünür.
 * - opacity 0 öğe tık almaya devam eder; tık yutan katman yok.
 */
( function () {
	'use strict';

	var hareket = window.matchMedia( '(prefers-reduced-motion: no-preference)' );
	if ( ! hareket.matches || ! ( 'IntersectionObserver' in window ) ) {
		return;
	}

	var ekranAlti = window.innerHeight;
	var bekleyenler = Array.prototype.filter.call(
		document.querySelectorAll( '[data-sb-belirme]' ),
		function ( oge ) {
			return oge.getBoundingClientRect().top > ekranAlti;
		}
	);
	if ( ! bekleyenler.length ) {
		return;
	}

	function goster( oge ) {
		oge.classList.remove( 'sb-belirme-bekliyor' );
	}

	var gozcu = new IntersectionObserver( function ( kayitlar ) {
		kayitlar.forEach( function ( kayit ) {
			if ( kayit.isIntersecting ) {
				goster( kayit.target );
				gozcu.unobserve( kayit.target );
			}
		} );
	}, { rootMargin: '0px 0px -10% 0px' } );

	bekleyenler.forEach( function ( oge ) {
		oge.classList.add( 'sb-belirme-bekliyor' );
		gozcu.observe( oge );
	} );

	// Geçiş gizlemeden bir kare sonra açılır: ilk gizleme animasyonsuz olsun.
	window.requestAnimationFrame( function () {
		bekleyenler.forEach( function ( oge ) {
			oge.classList.add( 'sb-belirme-gecis' );
		} );
	} );

	// Kullanıcı sayfadayken "hareketi azalt"ı açarsa bekleyen her şey hemen görünür.
	hareket.addEventListener( 'change', function ( olay ) {
		if ( ! olay.matches ) {
			gozcu.disconnect();
			bekleyenler.forEach( goster );
		}
	} );
}() );
