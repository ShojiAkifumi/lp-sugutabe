(() => {
  const sp = window.matchMedia("(max-width:600px)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const header = document.querySelector(".header");

  // ハンバーガーメニュー
  const menu = document.querySelector(".menu");
  const gnav = document.getElementById("gnav");
  const setMenu = (open) => {
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
    gnav.classList.toggle("is-open", open);
  };
  menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
  gnav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  const drawer = window.matchMedia("(max-width:900px)");
  drawer.addEventListener("change", () => setMenu(false));

  // ヘッダーの影 / SP追従CTAバー（FVのCTAを過ぎたら表示、お試しセット到達で隠す）
  const fixbar = document.querySelector(".fixbar");
  const fvCta = document.querySelector(".fv .cta");
  const trial = document.getElementById("trial");
  let pastFv = false,
    atTrial = false;
  const updateBar = () => fixbar.classList.toggle("is-show", pastFv && !atTrial);
  new IntersectionObserver(([e]) => {
    pastFv = !e.isIntersecting && e.boundingClientRect.top < 0;
    updateBar();
  }).observe(fvCta);
  new IntersectionObserver(
    ([e]) => {
      atTrial = e.isIntersecting;
      updateBar();
    },
    { rootMargin: "0px 0px -30% 0px" },
  ).observe(trial);
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // FAQ：SPでは2問目以降を閉じた状態で表示
  if (sp.matches) document.querySelectorAll(".fq[data-sp-closed]").forEach((d) => d.removeAttribute("open"));
  // FAQ：高さとフェードでスムーズに開閉（JS無効・動きを減らす設定では通常のdetailsのまま）
  document.querySelectorAll(".fq").forEach((d) => {
    const ans = d.querySelector(".ans");
    let anim = null;
    d.querySelector("summary").addEventListener("click", (e) => {
      if (still.matches || !ans.animate) return;
      e.preventDefault();
      const opening = !d.open || d.classList.contains("is-closing");
      const from = {
        height: `${ans.getBoundingClientRect().height}px`,
        opacity: d.open ? getComputedStyle(ans).opacity : 0,
      };
      if (anim) anim.cancel();
      if (opening) {
        d.classList.remove("is-closing");
        d.open = true;
      } else {
        d.classList.add("is-closing");
      }
      const to = opening ? { height: `${ans.scrollHeight}px`, opacity: 1 } : { height: "0px", opacity: 0 };
      anim = ans.animate([from, to], { duration: 350, easing: "ease" });
      anim.onfinish = () => {
        anim = null;
        if (!opening) {
          d.open = false;
          d.classList.remove("is-closing");
        }
      };
    });
  });

  // お客様の声：タブレット・SPの横スライダー（ページャーのボタンで移動、現在位置を表示）
  const scroller = document.querySelector(".voice .scroller");
  const cards = [...scroller.querySelectorAll(".vc")];
  const dots = [...document.querySelectorAll(".voice .pager button")];
  const slider = window.matchMedia("(max-width:1100px)");
  const setDot = (n) =>
    dots.forEach((d, j) => (j === n ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
  const updateDot = () => {
    if (!slider.matches || scroller.scrollLeft <= 2) return setDot(0);
    if (scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 2) return setDot(cards.length - 1);
    const r = scroller.getBoundingClientRect();
    const mid = r.left + r.width / 2;
    const dist = cards.map((c) => {
      const b = c.getBoundingClientRect();
      return Math.abs(b.left + b.width / 2 - mid);
    });
    setDot(dist.indexOf(Math.min(...dist)));
  };
  let dotTick = false;
  scroller.addEventListener(
    "scroll",
    () => {
      if (!dotTick) {
        dotTick = true;
        requestAnimationFrame(() => {
          dotTick = false;
          updateDot();
        });
      }
    },
    { passive: true },
  );
  dots.forEach((d, i) =>
    d.addEventListener("click", () => {
      cards[i].scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "nearest", inline: "center" });
    }),
  );
  // スライダー時だけキーボードで横スクロールできるようフォーカス可能に
  const syncSlider = () => {
    slider.matches ? scroller.setAttribute("tabindex", "0") : scroller.removeAttribute("tabindex");
    updateDot();
  };
  slider.addEventListener("change", syncSlider);
  syncSlider();

  // FV：写真2枚のフェードスライド
  const slides = [...document.querySelectorAll(".fv .slides .ph")];
  const slideDots = [...document.querySelectorAll(".fv .dots button")];
  let current = 0,
    timer = null;
  const show = (n) => {
    current = (n + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
    slideDots.forEach((d, i) =>
      i === current ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current"),
    );
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  const start = () => {
    stop();
    if (!still.matches && !document.hidden) timer = setInterval(() => show(current + 1), 5000);
  };
  slideDots.forEach((d, i) =>
    d.addEventListener("click", () => {
      show(i);
      start();
    }),
  );
  // スワイプ（タッチ・マウスのドラッグ）でも切り替え：左スワイプ＝次、右スワイプ＝前
  const slideBox = document.querySelector(".fv .slides");
  let swipe = null;
  slides.forEach((s) => (s.draggable = false));
  slideBox.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipe = { x: e.clientX, y: e.clientY };
  });
  slideBox.addEventListener("pointerup", (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    show(current + (dx < 0 ? 1 : -1));
    start();
  });
  slideBox.addEventListener("pointercancel", () => (swipe = null));
  slideBox.addEventListener("pointerleave", () => (swipe = null));  document.addEventListener("visibilitychange", start);
  still.addEventListener("change", start);
  start();

  // FV：パララックス（写真スライダーと装飾円を異なる速度で動かす）
  const fv = document.querySelector(".fv");
  const layers = [
    [fv.querySelector(".visual"), 0.06, 40],
    [fv.querySelector(".d1"), -0.12, 1200],
    [fv.querySelector(".d2"), 0.14, 1200],
    [fv.querySelector(".d3"), -0.2, 1200],
    [fv.querySelector(".fv-script"), 0.1, 1200],
    // 大きいものはゆっくり、小さいものは速く動かして奥行きを出す
    [fv.querySelector(".v1"), -0.06, 1200],
    [fv.querySelector(".v6"), 0.05, 1200],
    [fv.querySelector(".v4"), -0.1, 1200],
    [fv.querySelector(".v5"), 0.09, 1200],
    [fv.querySelector(".v7"), -0.11, 1200],
    [fv.querySelector(".v2"), 0.16, 1200],
    [fv.querySelector(".v3"), -0.18, 1200],
    [fv.querySelector(".v8"), 0.1, 1200],
    [fv.querySelector(".v9"), -0.14, 1200],
  ];
  let fvVisible = true,
    ticking = false;
  const parallax = () => {
    ticking = false;
    const k = still.matches ? 0 : sp.matches ? 0.5 : 1;
    const y = window.scrollY;
    layers.forEach(([el, rate, max]) => {
      const v = Math.max(-max, Math.min(max, y * rate)) * k;
      el.style.transform = v ? `translate3d(0,${v.toFixed(1)}px,0)` : "";
    });
  };
  const requestParallax = () => {
    if (fvVisible && !ticking) {
      ticking = true;
      requestAnimationFrame(parallax);
    }
  };
  new IntersectionObserver(([e]) => {
    fvVisible = e.isIntersecting;
    requestParallax();
  }).observe(fv);
  window.addEventListener("scroll", requestParallax, { passive: true });
  still.addEventListener("change", parallax);
  sp.addEventListener("change", parallax);
  parallax();
})();
