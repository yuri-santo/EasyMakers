AOS.init();
const swiper = new Swiper('.mySwiper', {
    slidesPerView: 2.2,
    spaceBetween: 30,
    loop: true,

    navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
    },
    autoplay: {
        delay: 4000,
        disableOnInteraction: false,
    },
    touchRatio: 0.6, 
    threshold: 10,   
    breakpoints: {
        768: { slidesPerView: 2.2 },
        576: { slidesPerView: 1.2 },
        320: { slidesPerView: 1 },
    },
});

(() => {
  const style1 = 'color:#6A5ACD;font-weight:700;font-size:14px';
  const style2 = 'color:#1B3AA8;font-size:13px';
  console.log('%cFeito por Yuri Geovane • EasyMakers', style1);
  console.log('contato@easymakers.com.br', style2);
})();


