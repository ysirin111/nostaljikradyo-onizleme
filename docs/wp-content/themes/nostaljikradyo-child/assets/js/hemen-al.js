/**
 * Ürün sayfası satın alma düğmeleri (Görev 7).
 *
 * - "Hemen Satın Al" (button[name="sb_hemen"]) aynı formu gönderir; sunucu ekleme başarılıysa ödeme
 *   sayfasına yönlendirir. Burada yalnız etkin/pasif durumu varyasyonla eşlenir: seçim yokken ya da
 *   varyasyon satın alınamazken pasif. JS yokken düğme etkindir ve sunucu reddi (renk seçilmedi, stok)
 *   WooCommerce hatasıyla döner.
 * - 992 px altı sabit alt çubuk: fiyat + "Sepete Ekle". Çubuk düğmesi formdaki gerçek Sepete Ekle
 *   düğmesini tıklar (AJAX, stok ve renk kuralları aynı); pasif durumunu o düğmeden okur.
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
		if ( cubukFiyat && varyasyon && varyasyon.price_html ) {
			var kap = document.createElement( 'div' );
			kap.innerHTML = varyasyon.price_html;
			// İndirimde <del> eski, <ins> güncel fiyattır: çubuk güncel olanı gösterir.
			var tutar = kap.querySelector( 'ins .woocommerce-Price-amount' ) || kap.querySelector( '.woocommerce-Price-amount' );
			if ( tutar ) {
				cubukFiyat.replaceChildren( tutar );
			}
		}
	} );
	$( form ).on( 'reset_data hide_variation', function () {
		hemenAyarla( false );
	} );
}() );
