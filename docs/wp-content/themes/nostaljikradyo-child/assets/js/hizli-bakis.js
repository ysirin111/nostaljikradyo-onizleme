/**
 * Hızlı bakış (Görev 6; envanter §1.4) — dialog#sb-hizli-bakis.
 *
 * İçerik sunucuda her kart için <template data-sb-bakis> olarak basılır (ek istek yok); açılınca
 * kopyalanır. Açan öğe ürün sayfasına giden bir bağlantıdır: JS yokken ürün sayfasını açar.
 * Kapatma: × düğmesi, Esc (tarayıcının cancel olayı), zemine tıklama; odak açan öğeye döner.
 * Renk seçimi hem penceredeki görseli hem kartı günceller (kart.js renkUygula). "Sepete Ekle" seçili
 * varyasyonu (basit üründe ürünün kendisini) seçili adetle ekler; başarıda pencere kapanır.
 */
( function () {
	'use strict';

	var pencere = document.getElementById( 'sb-hizli-bakis' );
	var kartlar = window.sbKartlar;
	if ( ! pencere || ! kartlar || 'function' !== typeof pencere.showModal ) {
		return;
	}
	var icerik = pencere.querySelector( '[data-sb-bakis-icerik]' );
	var acan = null;

	function kapat() {
		if ( pencere.open ) {
			pencere.close();
		}
	}

	function ac( kart, dugme ) {
		var sablon = kart.querySelector( 'template[data-sb-bakis]' );
		if ( ! sablon ) {
			return false;
		}
		acan = dugme;
		icerik.replaceChildren( sablon.content.cloneNode( true ) );

		var kayitlar = kartlar.renkler( kart );
		kartlar.renkGrubuKur( icerik, kayitlar, kart.getAttribute( 'data-sb-secili' ), 'bakis', function ( renk ) {
			kartlar.renkUygula( kart, renk, 'kart' );
		} );

		var adet = 1;
		var deger = icerik.querySelector( '[data-sb-adet-deger]' );
		Array.prototype.forEach.call( icerik.querySelectorAll( '[data-sb-adet]' ), function ( dugmeAdet ) {
			dugmeAdet.addEventListener( 'click', function () {
				adet = Math.min( 10, Math.max( 1, adet + Number( dugmeAdet.getAttribute( 'data-sb-adet' ) ) ) );
				deger.textContent = String( adet );
			} );
		} );

		var sepet = icerik.querySelector( '[data-sb-bakis-sepete]' );
		if ( sepet ) {
			sepet.addEventListener( 'click', function () {
				var secili = icerik.getAttribute( 'data-sb-secili' );
				var renk = kayitlar.filter( function ( r ) {
					return r.slug === secili;
				} )[ 0 ];
				var kimlik = renk ? renk.varyasyon : sepet.getAttribute( 'data-sb-urun' );
				sepet.disabled = true;
				kartlar.sepeteEkle( kimlik, adet, icerik.querySelector( '[data-sb-kart-hata]' ), kapat ).then( function () {
					sepet.disabled = renk ? ! renk.stok : false;
				} );
			} );
		}

		pencere.showModal();
		return true;
	}

	document.addEventListener( 'click', function ( olay ) {
		var dugme = olay.target.closest( '[data-sb-hizli-bakis-ac]' );
		if ( ! dugme ) {
			return;
		}
		var kart = dugme.closest( '[data-sb-kart]' );
		if ( kart && ac( kart, dugme ) ) {
			olay.preventDefault();
		}
	} );

	pencere.querySelector( '[data-sb-bakis-kapat]' ).addEventListener( 'click', kapat );
	pencere.addEventListener( 'click', function ( olay ) {
		if ( olay.target === pencere ) {
			kapat();
		}
	} );
	pencere.addEventListener( 'close', function () {
		icerik.replaceChildren();
		if ( acan && document.contains( acan ) ) {
			acan.focus();
		}
	} );
}() );
