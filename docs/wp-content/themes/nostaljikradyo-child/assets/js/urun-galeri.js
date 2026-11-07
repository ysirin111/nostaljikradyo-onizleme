/**
 * Ürün galerisi (spec §4.3): dikey küçük görsel şeridi, oklar, renk seçimiyle eşitleme.
 * Kaynak: nostaljikradyo-child/assets/js/urun-galeri.js — jQuery'den vanilla'ya
 * çevrildi; jQuery yalnız WC'nin varyasyon olaylarını (found_variation, reset_data)
 * dinlemek için, varsa.
 *
 * - Küçük görsel ana görseli değiştirir; oklar listede ileri/geri gider, uçta döner.
 * - Renk seçilince şerit o varyasyonun listesiyle yeniden kurulur; veri
 *   inc/varyasyon-galeri.php'den: variation.sb_galeri = [{ buyuk, srcset, kucuk, alt }].
 *   "Temizle" (reset_data) açılıştaki listeye döner. Liste aynıysa şerit yeniden
 *   kurulmaz: WC sayfa açılışında varsayılan varyasyon için de found_variation
 *   tetikliyor; boşuna kurmak ana görselin sunucu srcset'ini atıp LCP'yi geciktirirdi.
 * - Düğümler DOM API ile kurulur: alt metni yönetimden gelir, HTML dizesi birleştirmek
 *   enjeksiyona açıktı (nostaljikradyo notu).
 * - Rengin fotoğrafı yoksa (variation.sb_galeri boş ya da yer tutucu eki) başka rengin fotoğrafı kalmaz:
 *   liste boşsa ana görsel gizlenir, variation.sb_yer_tutucu doluysa "Görsel hazırlanıyor · <Renk>" notu
 *   görselin üstünde görünür (Review Focus 1). Seçili renk adı alt başlık satırında güncellenir.
 * - Masaüstünde (hover + ince imleç) üzerine gelince yakınlaştırma; dokunmatikte yok.
 * JS yokken küçükler ve ana görsel görünür; oklar sunucudan `hidden` gelir.
 */
( function () {
	'use strict';

	var galeri = document.querySelector( '[data-sb-galeri]' );
	var serit = galeri && galeri.querySelector( '[data-sb-galeri-kucukler]' );
	var ana = galeri && galeri.querySelector( '[data-sb-galeri-ana]' );
	if ( ! serit || ! ana ) {
		return;
	}
	var sahne = ana.closest( '.sb-urun__sahne' );
	var not = galeri.querySelector( '[data-sb-gorsel-notu]' );
	var renkYeri = document.querySelector( '[data-sb-secili-renk]' );
	var altBaslik = document.querySelector( '[data-sb-alt-baslik]' );
	var oklar = Array.prototype.slice.call( galeri.querySelectorAll( '[data-sb-galeri-ok]' ) );
	var urunAdi = galeri.getAttribute( 'data-sb-urun-adi' ) || '';

	var baslangic = Array.prototype.map.call( serit.querySelectorAll( '[data-sb-galeri-kucuk]' ), function ( dugme ) {
		var img = dugme.querySelector( 'img' );
		return {
			buyuk: dugme.getAttribute( 'data-buyuk' ) || '',
			srcset: dugme.getAttribute( 'data-srcset' ) || '',
			kucuk: img ? img.getAttribute( 'src' ) || '' : '',
			alt: dugme.getAttribute( 'data-alt' ) || '',
		};
	} );
	var liste = baslangic.slice();
	var aktif = 0;

	function gorseliUygula( oge, g ) {
		if ( g.srcset ) {
			oge.setAttribute( 'srcset', g.srcset );
		} else {
			oge.removeAttribute( 'srcset' );
		}
		oge.setAttribute( 'src', g.buyuk );
		oge.setAttribute( 'alt', g.alt || urunAdi );
	}

	// Kayarak geçiş (owner isteği 2026-10-01): yeni görsel ileri giderken sağdan, geri giderken soldan
	// kayarak girer; eskisi ters yöne çekilir. Yeni görsel yüklenmeden kaymaz (boş kare yok); hızlı
	// art arda tıkta önceki geçiş hemen bitirilir, yalnız son görsel kalır. Hareketi azalt açıksa
	// anlık takas; sayfa ilk açılışta animasyon yok. (Önceki kararma denemesi owner'a beğenilmedi.)
	var azalt = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' );
	var geciste = null;

	function gecisiBitir() {
		if ( geciste ) {
			geciste();
			geciste = null;
		}
	}

	function kaydirarakDegistir( g, yon ) {
		gecisiBitir();
		var eski = ana;
		var yeni = eski.cloneNode( false );
		yeni.removeAttribute( 'fetchpriority' );
		yeni.removeAttribute( 'loading' );
		yeni.hidden = false;
		gorseliUygula( yeni, g );
		eski.parentNode.insertBefore( yeni, eski.nextSibling );
		ana = yeni;

		var bitti = false;
		var giris = null;
		function bitir() {
			if ( bitti ) {
				return;
			}
			bitti = true;
			// fill: 'both' bitişte dönüşümü tutar ve yakınlaştırma kuralını ezerdi: animasyon iptal edilir.
			if ( giris ) {
				giris.cancel();
			}
			yeni.style.transform = '';
			if ( eski.parentNode ) {
				eski.parentNode.removeChild( eski );
			}
		}
		geciste = bitir;

		function baslat() {
			if ( bitti || ! yeni.animate ) {
				bitir();
				return;
			}
			var sure = { duration: 450, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'both' };
			giris = yeni.animate( [ { transform: 'translateX(' + ( yon * 100 ) + '%)' }, { transform: 'translateX(0)' } ], sure );
			var cikis = eski.animate( [ { transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + ( -yon * 30 ) + '%)', opacity: 0.4 } ], sure );
			cikis.onfinish = bitir;
		}
		// Yüklenene kadar eski görsel yerinde kalır; yüklenmezse 800 ms sonra yine de kayar.
		yeni.style.transform = 'translateX(' + ( yon * 100 ) + '%)';
		var basladi = false;
		function bir() {
			if ( basladi ) {
				return;
			}
			basladi = true;
			baslat();
		}
		if ( yeni.complete && yeni.naturalWidth ) {
			bir();
		} else {
			yeni.addEventListener( 'load', bir, { once: true } );
			yeni.addEventListener( 'error', bir, { once: true } );
			window.setTimeout( bir, 800 );
		}
	}

	// yon: ok tıklamasında okun yönü (+1 sonraki: sağdan; -1 önceki: soldan; uçta başa dönse de aynı);
	// küçük görsel tıklamasında verilmez, indeks karşılaştırılır.
	function goster( sira, yon ) {
		if ( ! liste.length ) {
			return;
		}
		var onceki = aktif;
		aktif = ( sira + liste.length ) % liste.length;
		var g = liste[ aktif ];
		if ( ana.hidden ) {
			ana.hidden = false;
			gorseliUygula( ana, g );
		} else if ( azalt && azalt.matches ) {
			gecisiBitir();
			gorseliUygula( ana, g );
		} else if ( aktif !== onceki || ana.getAttribute( 'src' ) !== g.buyuk ) {
			kaydirarakDegistir( g, yon || ( aktif >= onceki ? 1 : -1 ) );
		}
		Array.prototype.forEach.call( serit.children, function ( dugme, i ) {
			if ( i === aktif ) {
				dugme.setAttribute( 'aria-current', 'true' );
			} else {
				dugme.removeAttribute( 'aria-current' );
			}
		} );
	}

	function oklariAyarla() {
		serit.hidden = liste.length < 2;
		oklar.forEach( function ( ok ) {
			ok.hidden = liste.length < 2;
		} );
	}

	function ayni( a, b ) {
		return a.length === b.length && a.every( function ( g, i ) {
			return g.buyuk === b[ i ].buyuk && g.kucuk === b[ i ].kucuk;
		} );
	}

	// Not ve alt başlıktaki renk: renk adı ve yer tutucu notu her seçimde yenilenir.
	function notuAyarla( yerTutucu, renk ) {
		if ( not ) {
			not.textContent = yerTutucu ? 'Görsel hazırlanıyor · ' + yerTutucu : '';
			not.hidden = ! yerTutucu;
		}
		if ( renkYeri ) {
			renkYeri.textContent = renk ? ( altBaslik && altBaslik.textContent ? ' · ' : '' ) + renk : '';
		}
	}

	function bosluguUygula() {
		liste = [];
		aktif = 0;
		gecisiBitir();
		serit.textContent = '';
		oklariAyarla();
		ana.hidden = true;
	}

	function kur( yeni ) {
		if ( ! yeni.length ) {
			bosluguUygula();
			return;
		}
		if ( ayni( yeni, liste ) ) {
			return;
		}
		liste = yeni.slice();
		serit.textContent = '';
		liste.forEach( function ( g, i ) {
			var dugme = document.createElement( 'button' );
			dugme.type = 'button';
			dugme.className = 'sb-urun__kucuk';
			dugme.setAttribute( 'data-sb-galeri-kucuk', String( i ) );
			dugme.setAttribute( 'data-buyuk', g.buyuk || '' );
			dugme.setAttribute( 'data-srcset', g.srcset || '' );
			dugme.setAttribute( 'data-alt', g.alt || '' );
			dugme.setAttribute( 'aria-label', ( i + 1 ) + '. görsel' );
			var img = document.createElement( 'img' );
			img.src = g.kucuk || '';
			img.alt = '';
			img.width = 200;
			img.height = 240;
			dugme.appendChild( img );
			serit.appendChild( dugme );
		} );
		oklariAyarla();
		goster( 0 );
	}

	serit.addEventListener( 'click', function ( olay ) {
		var dugme = olay.target.closest( '[data-sb-galeri-kucuk]' );
		if ( dugme ) {
			goster( parseInt( dugme.getAttribute( 'data-sb-galeri-kucuk' ), 10 ) || 0 );
		}
	} );
	oklar.forEach( function ( ok ) {
		ok.addEventListener( 'click', function () {
			var n = parseInt( ok.getAttribute( 'data-sb-galeri-ok' ), 10 ) || 1;
			goster( aktif + n, n > 0 ? 1 : -1 );
		} );
	} );
	oklariAyarla();

	// Yakınlaştırma: yalnız imleçli masaüstü; dokunmatikte hiç bağlanmaz (CSS de aynı ortamla sınırlı).
	if ( sahne && window.matchMedia && window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches ) {
		sahne.addEventListener( 'mousemove', function ( olay ) {
			var k = sahne.getBoundingClientRect();
			sahne.style.setProperty( '--ox', ( ( olay.clientX - k.left ) / k.width * 100 ) + '%' );
			sahne.style.setProperty( '--oy', ( ( olay.clientY - k.top ) / k.height * 100 ) + '%' );
			sahne.classList.add( 'sb-urun__sahne--yakin' );
		} );
		sahne.addEventListener( 'mouseleave', function () {
			sahne.classList.remove( 'sb-urun__sahne--yakin' );
		} );
	}

	var $ = window.jQuery;
	var form = document.querySelector( 'form.variations_form' );
	if ( ! $ || ! form ) {
		return;
	}
	$( form ).on( 'found_variation', function ( olay, varyasyon ) {
		if ( varyasyon && varyasyon.sb_galeri ) {
			kur( varyasyon.sb_galeri );
			notuAyarla( varyasyon.sb_yer_tutucu || '', varyasyon.sb_renk || '' );
		}
	} );
	$( form ).on( 'reset_data', function () {
		// "Temizle": hiçbir renk seçili değil; alt başlıktaki renk adı ve (açılış yer tutucu renkteyse) not da kalkar.
		kur( baslangic );
		notuAyarla( '', '' );
	} );
	// WC stok/fiyat alanını slideDown/slideUp ile açıyor; 200 ms'lik yükseklik animasyonu
	// sepet satırını itip geri çekiyordu (nostaljikradyo urun-galeri.js:128-136).
	$( form ).on( 'show_variation hide_variation', function () {
		$( form ).find( '.woocommerce-variation' ).stop( true, true );
	} );
}() );
