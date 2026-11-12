/**
 * Ürün sayfası satın alma düğmeleri (Görev 7).
 *
 * - "Hemen Satın Al" (button[name="sb_hemen"]) aynı formu gönderir; sunucu ekleme başarılıysa ödeme
 *   sayfasına yönlendirir. Burada yalnız etkin/pasif durumu varyasyonla eşlenir: seçim yokken ya da
 *   varyasyon satın alınamazken pasif. JS yokken düğme etkindir ve sunucu reddi (renk seçilmedi, stok)
 *   WooCommerce hatasıyla döner.
 * - 992 px altı sabit alt çubuk: fiyat + "Sepete Ekle". Çubuk düğmesi formdaki gerçek Sepete Ekle
 *   düğmesini tıklar (AJAX, stok ve renk kuralları aynı); pasif durumunu o düğmeden okur.
 * - Kişiselleştirme ücretleri (magaza-site/kisisellestirme.php, `data-sb-ucret`): seçilen seçeneklerin ücreti
 *   taban fiyata eklenip alt çubukta gösterilir. Üstteki fiyatta ve WC'nin varyasyon fiyatında yalnız tek,
 *   indirimsiz tutarın rakamları değişir: aralığa ve indirim işaretlemesine (üstü çizili referans, tarih;
 *   spec §6 işaretleme sözleşmesi) dokunulmaz, referans fiyata ücret eklenmez. Kutu yoksa bu iki fiyata hiç
 *   dokunulmaz. Taban: sunucunun `data-sb-taban`ı, renk seçilince varyasyonun display_price'ı.
 *   Yalnız gösterimdir; sepete yazılan ücreti sunucu hesaplar.
 */
( function () {
	'use strict';

	var form = document.querySelector( 'form.cart' );
	if ( ! form ) {
		return;
	}
	var hemen = form.querySelector( '[data-sb-hemen]' );
	var asil = form.querySelector( '.single_add_to_cart_button' );
	var cubuk = document.querySelector( '[data-sb-mbar]' );
	var cubukDugme = cubuk && cubuk.querySelector( '[data-sb-mbar-sepet]' );
	var cubukFiyat = cubuk && cubuk.querySelector( '[data-sb-mbar-fiyat]' );
	var kutular = form.querySelectorAll( '[data-sb-kisisel] input[data-sb-ucret]' );
	var ust = document.querySelector( '.sb-urun__fiyat .price' );
	var taban = cubukFiyat && '' !== cubukFiyat.dataset.sbTaban ? Number( cubukFiyat.dataset.sbTaban ) : null;
	var bicim = [ 0, ',', '.', false ];
	try {
		bicim = JSON.parse( ( cubukFiyat && cubukFiyat.dataset.sbBicim ) || '' ) || bicim;
	} catch ( e ) {}
	// Çubuktaki tutar biçimi sayfadaki fiyattan kopyalanır (sembol, konumu, sarmalayıcı); yalnız rakamlar değişir.
	var sablon = document.querySelector( '.sb-urun__fiyat .woocommerce-Price-amount, [data-sb-mbar-fiyat] .woocommerce-Price-amount' );
	sablon = sablon && sablon.cloneNode( true );

	function bicimle( sayi ) {
		var parca = Math.abs( sayi ).toFixed( bicim[ 0 ] ).split( '.' );
		var tam = parca[ 0 ].replace( /\B(?=(\d{3})+(?!\d))/g, bicim[ 2 ] );
		// wc_price gibi: woocommerce_price_trim_zeros açıksa yalnız sıfırdan oluşan ondalık atılır.
		var ondalik = parca[ 1 ] && ! ( bicim[ 3 ] && /^0+$/.test( parca[ 1 ] ) ) ? bicim[ 1 ] + parca[ 1 ] : '';
		return ( sayi < 0 ? '-' : '' ) + tam + ondalik;
	}

	// Tutar öğesindeki ilk rakamlı metnin rakam kısmını yeni tutarla değiştirir (sembol ve boşluk kalır).
	function rakamYaz( el, sayi ) {
		var yuru = document.createTreeWalker( el, NodeFilter.SHOW_TEXT );
		while ( yuru.nextNode() ) {
			if ( /\d/.test( yuru.currentNode.nodeValue ) ) {
				yuru.currentNode.nodeValue = yuru.currentNode.nodeValue.replace( /\d(?:[\d\s\u00a0.,'’]*\d)?/, bicimle( sayi ) );
				return;
			}
		}
	}

	// Üstteki/varyasyon fiyatı: yalnız tek, indirimsiz tutar güncellenir; aralık ve indirim işaretlemesi korunur.
	function yerindeYaz( kap, sayi ) {
		var tutarlar = kap ? kap.querySelectorAll( '.woocommerce-Price-amount' ) : [];
		if ( 1 === tutarlar.length && ! kap.querySelector( 'del' ) ) {
			rakamYaz( tutarlar[ 0 ], sayi );
		}
	}

	function fiyatYaz() {
		if ( null === taban || ! sablon || ! isFinite( taban ) ) {
			return;
		}
		var toplam = taban;
		kutular.forEach( function ( k ) {
			if ( k.checked ) {
				toplam += Number( k.dataset.sbUcret ) || 0;
			}
		} );
		if ( cubukFiyat ) {
			var yeni = sablon.cloneNode( true );
			rakamYaz( yeni, toplam );
			cubukFiyat.replaceChildren( yeni );
		}
		if ( kutular.length ) {
			yerindeYaz( ust, toplam );
			yerindeYaz( form.querySelector( '.woocommerce-variation-price .price' ), toplam );
		}
	}

	kutular.forEach( function ( k ) {
		k.addEventListener( 'change', fiyatYaz );
	} );
	// Tarayıcı geri gelişte kutuları işaretli bırakabilir: açılışta da hesaplanır.
	fiyatYaz();

	function hemenAyarla( etkin ) {
		if ( hemen ) {
			hemen.disabled = ! etkin;
		}
	}

	function cubukAyarla() {
		if ( cubukDugme && asil ) {
			cubukDugme.disabled = asil.classList.contains( 'disabled' ) || asil.disabled;
		}
	}

	if ( cubuk && cubukDugme && asil ) {
		cubuk.hidden = false;
		cubukDugme.addEventListener( 'click', function () {
			asil.click();
		} );
		new MutationObserver( cubukAyarla ).observe( asil, { attributes: true, attributeFilter: [ 'class', 'disabled' ] } );
		cubukAyarla();
	}

	var $ = window.jQuery;
	if ( ! $ || ! form.classList.contains( 'variations_form' ) ) {
		return;
	}

	$( form ).on( 'found_variation', function ( olay, varyasyon ) {
		hemenAyarla( !! ( varyasyon && varyasyon.is_purchasable && varyasyon.is_in_stock ) );
		// display_price güncel (indirimliyse indirimli) fiyattır; çubuk ve fiyatlar ona ücretleri ekler.
		if ( varyasyon && '' !== varyasyon.display_price && isFinite( Number( varyasyon.display_price ) ) ) {
			taban = Number( varyasyon.display_price );
		}
	} );
	// WC varyasyon fiyatını show_variation'da yeniden basar (found_variation'dan sonra): ücretler o zaman eklenir.
	$( form ).on( 'found_variation show_variation', function () {
		fiyatYaz();
	} );
	$( form ).on( 'reset_data hide_variation', function () {
		hemenAyarla( false );
	} );
}() );
