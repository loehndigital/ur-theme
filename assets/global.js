function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe",
    ),
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute(
    'aria-expanded',
    summary.parentNode.hasAttribute('open'),
  );

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute(
      'aria-expanded',
      !event.currentTarget.closest('details').hasAttribute('open'),
    );
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement)
        currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true,
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + 'pauseVideo' + '","args":""}',
      '*',
    );
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this)),
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.quantityUpdate,
      this.validateQtyRules.bind(this),
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: `application/${type}`,
    },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (
  country_domid,
  province_domid,
  options,
) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(
    options['hideElement'] || province_domid,
  );

  Shopify.addListener(
    this.countryEl,
    'change',
    Shopify.bind(this.countryHandler, this),
  );

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this)),
    );
    this.querySelectorAll('button:not(.localization-selector)').forEach(
      (button) =>
        button.addEventListener('click', this.onCloseButtonClick.bind(this)),
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(
          event,
          this.mainDetailsToggle.querySelector('summary'),
        )
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(
        summaryElement.nextElementSibling,
        detailsElement.querySelector('button'),
      );
      summaryElement.nextElementSibling.removeEventListener(
        'transitionend',
        addTrapFocus,
      );
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen
        ? this.closeMenuDrawer(event, summaryElement)
        : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty(
          '--viewport-height',
          `${window.innerHeight}px`,
        );
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener(
              'transitionend',
              addTrapFocus,
            );
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle
      .querySelectorAll('.submenu-open')
      .forEach((submenu) => {
        submenu.classList.remove('submenu-open');
      });
    document.body.classList.remove(
      `overflow-hidden-${this.dataset.breakpoint}`,
    );
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent)
      elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (
        this.mainDetailsToggle.hasAttribute('open') &&
        !this.mainDetailsToggle.contains(document.activeElement)
      )
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement
      .querySelector('summary')
      .setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(
            detailsElement.closest('details[open]'),
            detailsElement.querySelector('summary'),
          );
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset ||
      this.closest('.header-wrapper').classList.contains(
        'header-wrapper--border-bottom',
      )
        ? 1
        : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(
        this.header.getBoundingClientRect().bottom - this.borderOffset,
      )}px`,
    );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(
          this.header.getBoundingClientRect().bottom - this.borderOffset,
        )}px`,
      );
    document.documentElement.style.setProperty(
      '--viewport-height',
      `${window.innerHeight}px`,
    );
  };
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      'click',
      this.hide.bind(this, false),
    );
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (
          event.pointerType === 'mouse' &&
          !event.target.closest('deferred-media, product-model')
        )
          this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(
        this.querySelector('template').content.firstElementChild.cloneNode(
          true,
        ),
      );

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(
        content.querySelector('video, model-viewer, iframe'),
      );
      if (focus) deferredElement.focus();
      if (
        deferredElement.nodeName == 'VIDEO' &&
        deferredElement.getAttribute('autoplay')
      ) {
        // force autoplay for safari
        deferredElement.play();
      }
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter(
      (element) => element.clientWidth > 0,
    );
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset =
      this.sliderItemsToShow[1].offsetLeft -
      this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor(
      (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) /
        this.sliderItemOffset,
    );
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider || !this.nextButton) return;

    const previousPage = this.currentPage;
    this.currentPage =
      Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1],
          },
        }),
      );
    }

    if (this.enableSliderLooping) return;

    if (
      this.isSlideVisible(this.sliderItemsToShow[0]) &&
      this.slider.scrollLeft === 0
    ) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (
      this.isSlideVisible(
        this.sliderItemsToShow[this.sliderItemsToShow.length - 1],
      )
    ) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide =
      this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (
      element.offsetLeft + element.clientWidth <= lastVisibleSlide &&
      element.offsetLeft >= this.slider.scrollLeft
    );
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollLeft + step * this.sliderItemOffset
        : this.slider.scrollLeft - step * this.sliderItemOffset;
    this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
    this.slider.scrollTo({
      left: position,
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector('.announcement-bar-slider');
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(
      this.sliderControlWrapper.querySelectorAll('.slider-counter__link'),
    );
    this.sliderControlLinksArray.forEach((link) =>
      link.addEventListener('click', this.linkToSlide.bind(this)),
    );
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;

      this.reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      );
      this.reducedMotion.addEventListener('change', () => {
        if (this.slider.getAttribute('data-autoplay') === 'true')
          this.setAutoPlay();
      });

      [this.prevButton, this.nextButton].forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            this.announcementBarArrowButtonWasClicked = true;
          },
          { once: true },
        );
      });
    }

    if (this.slider.getAttribute('data-autoplay') === 'true')
      this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener(
        'click',
        this.autoPlayToggle.bind(this),
      );
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked
        ? this.pause()
        : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition =
        this.slider.scrollLeft +
        this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }

    this.setSlidePosition(this.slideScrollPosition);

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position) {
    if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
    this.setPositionTimeout = setTimeout(() => {
      this.slider.scrollTo({
        left: position,
      });
    }, this.announcerBarAnimationDelay);
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add(
      'slider-counter__link--active',
    );
    this.sliderControlButtons[this.currentPage - 1].setAttribute(
      'aria-current',
      true,
    );
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton ||
        this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (
      !this.reducedMotion.matches &&
      !this.announcementBarArrowButtonWasClicked
    ) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton ||
        this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(
      this.autoRotateSlides.bind(this),
      this.autoplaySpeed,
    );
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute(
        'aria-label',
        window.accessibilityStrings.playSlideshow,
      );
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute(
        'aria-label',
        window.accessibilityStrings.pauseSlideshow,
      );
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length
        ? 0
        : this.slider.scrollLeft + this.sliderItemOffset;

    this.setSlidePosition(slideScrollPosition);
    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = 'next') {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === 'next' ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = 'announcement-bar-slider--fade-in';
    const animationClassOut = 'announcement-bar-slider--fade-out';

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext =
      (button === 'next' && !isLastSlide) ||
      (button === 'previous' && isFirstSlide);
    const direction = shouldMoveNext ? 'next' : 'previous';

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) +
          1 -
          this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.toggleAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
    }
  }

  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll('select'),
      (select) => select.value,
    );
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;

    const mediaGalleries = document.querySelectorAll(
      `[id^="MediaGallery-${this.dataset.section}"]`,
    );
    mediaGalleries.forEach((mediaGallery) =>
      mediaGallery.setActiveMedia(
        `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
        true,
      ),
    );

    const modalContent = document.querySelector(
      `#ProductModal-${this.dataset.section} .product-media-modal__content`,
    );
    if (!modalContent) return;
    const newMediaModal = modalContent.querySelector(
      `[data-media-id="${this.currentVariant.featured_media.id}"]`,
    );
    modalContent.prepend(newMediaModal);
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState(
      {},
      '',
      `${this.dataset.url}?variant=${this.currentVariant.id}`,
    );
  }

  updateShareUrl() {
    const shareButton = document.getElementById(
      `Share-${this.dataset.section}`,
    );
    if (!shareButton || !shareButton.updateUrl) return;
    shareButton.updateUrl(
      `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`,
    );
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`,
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(':checked').value === variant.option1,
    );
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [
        ...option.querySelectorAll('input[type="radio"], option'),
      ];
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant[`option${index}`] === previousOptionSelected,
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.innerText = input.getAttribute('value');
      } else {
        input.innerText = window.variantStrings.unavailable_with_option.replace(
          '[value]',
          input.getAttribute('value'),
        );
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${
        this.dataset.originalSection
          ? this.dataset.originalSection
          : this.dataset.section
      }`,
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(
          `price-${this.dataset.section}`,
        );
        const source = html.getElementById(
          `price-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`,
        );
        const skuSource = html.getElementById(
          `Sku-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`,
        );
        const skuDestination = document.getElementById(
          `Sku-${this.dataset.section}`,
        );
        const inventorySource = html.getElementById(
          `Inventory-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`,
        );
        const inventoryDestination = document.getElementById(
          `Inventory-${this.dataset.section}`,
        );

        const volumePricingSource = html.getElementById(
          `Volume-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`,
        );

        const pricePerItemDestination = document.getElementById(
          `Price-Per-Item-${this.dataset.section}`,
        );
        const pricePerItemSource = html.getElementById(
          `Price-Per-Item-${
            this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section
          }`,
        );

        const volumePricingDestination = document.getElementById(
          `Volume-${this.dataset.section}`,
        );
        const qtyRules = document.getElementById(
          `Quantity-Rules-${this.dataset.section}`,
        );
        const volumeNote = document.getElementById(
          `Volume-Note-${this.dataset.section}`,
        );

        if (volumeNote) volumeNote.classList.remove('hidden');
        if (volumePricingDestination)
          volumePricingDestination.classList.remove('hidden');
        if (qtyRules) qtyRules.classList.remove('hidden');

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination)
          inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle(
            'hidden',
            skuSource.classList.contains('hidden'),
          );
        }

        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle(
            'hidden',
            pricePerItemSource.classList.contains('hidden'),
          );
        }

        const price = document.getElementById(`price-${this.dataset.section}`);

        if (price) price.classList.remove('hidden');

        if (inventoryDestination)
          inventoryDestination.classList.toggle(
            'hidden',
            inventorySource.innerText === '',
          );

        const addButtonUpdated = html.getElementById(
          `ProductSubmitButton-${sectionId}`,
        );
        this.toggleAddButton(
          addButtonUpdated ? addButtonUpdated.hasAttribute('disabled') : true,
          window.variantStrings.soldOut,
        );

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`,
    );
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(
      `product-form-${this.dataset.section}`,
    );
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(
      `Inventory-${this.dataset.section}`,
    );
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(
      `Price-Per-Item-${this.dataset.section}`,
    );
    const volumeNote = document.getElementById(
      `Volume-Note-${this.dataset.section}`,
    );
    const volumeTable = document.getElementById(
      `Volume-${this.dataset.section}`,
    );
    const qtyRules = document.getElementById(
      `Quantity-Rules-${this.dataset.section}`,
    );

    if (!addButton) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add('hidden');
    if (inventory) inventory.classList.add('hidden');
    if (sku) sku.classList.add('hidden');
    if (pricePerItem) pricePerItem.classList.add('hidden');
    if (volumeNote) volumeNote.classList.add('hidden');
    if (volumeTable) volumeTable.classList.add('hidden');
    if (qtyRules) qtyRules.classList.add('hidden');
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.getAttribute('value'))) {
        input.classList.remove('disabled');
      } else {
        input.classList.add('disabled');
      }
    });
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find(
        (radio) => radio.checked,
      ).value;
    });
  }
}

customElements.define('variant-radios', VariantRadios);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('product-recommendations');

          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
          }

          if (
            !this.querySelector('slideshow-component') &&
            this.classList.contains('complementary-products')
          ) {
            this.remove();
          }

          if (html.querySelector('.grid__item')) {
            this.classList.add('product-recommendations--loaded');
          }
        })
        .catch((e) => {
          console.error(e);
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: '0px 0px 400px 0px',
    }).observe(this);
  }
}

customElements.define('product-recommendations', ProductRecommendations);



window.BOLD.subscriptions.config.internationalization = {

  en: {

      translation: {
        cancelPanelTitle: 'Cancel subscription',
        cancelPanelAlertMessage: 'Once your subscription order is cancelled you will no longer be subscribed to "{{subscriptionTitle}}"',
        cancelPanelCancelSubscriptionFlowCancelSubscriptionConfirmationButton: 'Cancel subscription',
        cancelPanelCancelSubscriptionFlowCancelSubscriptionButton: 'Cancel subscription',
        cancelPanelCancelSubscriptionFlowKeepSubscriptionButton: 'I will keep my subscription',
        cancelPanelCancelSubscriptionFlowWarningHeaderMessage: 'Are you sure you want to cancel your subscription?',
        cancelPanelCancelSubscriptionFlowReactivateSubscriptionMessage: 'Your subscription can be activated at any time after cancellation on your "manage subscriptions page"',
        cancelPanelRenewalMethodFlowSubscriptionPaidMessage: 'This subscription is already paid in full.',
        cancelPanelRenewalMethodFlowSkipUpcomingOrdersMessage: 'You can skip upcoming orders by managing your upcoming orders.',
        cancelPanelRenewalMethodFlowSubscriptionRenewalMethodMessage: 'After your final order, your subscription will be: {{renewalMethod}}',
        cancelPanelRenewalMethodFlowVaryingPrepaidLengthMessage: 'This subscription has products with varying prepaid lengths. You can manage each individual order by viewing the products in your subscription.',
        cancelPanelRenewalMethodFlowChangeProductsRenewalMethodButton: 'Change renewal method for each product',
        cancelPanelRenewalMethodFlowChangeRenewalMethodButton: 'Change renewal method',
        cancelPanelRenewalMethodFlowChangeRenewalMethodTitle: 'Change renewal method',
        cancelPanelRenewalMethodFlowSuccessMessage: 'Prepaid renewal method changed.',
        cancelPanelRenewalMethodFlowFailureMessage: 'Prepaid renewal method could not be changed.',
        cancelPanelRenewalMethodFlowRenewalMethodLabel: 'Renewal method',
        cancelPanelRenewalMethodFlowPrepaidRenewalOption: 'Renew as prepaid subscription',
        cancelPanelRenewalMethodFlowStandardRenewalOption: 'Renew as regular subscription',
        cancelPanelRenewalMethodFlowCancelRenewalOption: 'Cancel after the last prepaid order',
        cancelPanelRenewalMethodFlowChangeRenewalMethodCancelButton: 'Cancel',
        cancelPanelRenewalMethodFlowChangeRenewalMethodSaveButton: 'Save changes',
        cancelSubscriptionSuccessMessage: 'Subscription cancelled.',
        cancelSubscriptionLoadSettingsFailureMessage: 'Cancellation settings could not be loaded...',
        cancelSubscriptionLoadReasonsFailureMessage: 'Cancellation reasons could not be loaded...',
        cancelSubscriptionFailureMessage: 'Subscription could not be cancelled. Please try again later.',
        prepaidCancelNoContinueMessage: 'cancelled.',
        prepaidCancelAsPrepaidMessage: 'renewed as a prepaid subscription.',
        prepaidCancelAsStandard: 'renewed as a regular subscription.',
        futureOrderDate: '{{date, {"year": "numeric", "month": "long", "day": "numeric"} }}',
        subscriptionSummaryOrderFrequencyTitle: 'Order frequency',
        subscriptionDetailsButton: 'Show details',
        subscriptionDetailsButton_toggled: 'Hide details',
        subscriptionDetailsNoPaymentMethodMessage: 'No payment method has been selected.',
        subscriptionDetailsPartiallyFulfilledMessage: 'One or more products are out of stock. We have created the order with the available product(s). When the missing products are available, they will process with the next order.',
        subscriptionSummaryOrderNowButton: 'Order now',
        subscriptionSummarySubscriptionTitle: '{{firstLineItem.title}} - #{{subscription.bold_platform_subscription_id}}',
        subscriptionSummarySubscriptionTitle_plural: '{{count}} Product Subscription - #{{subscription.bold_platform_subscription_id}}',
        subscriptionSummaryPrepaidLengthHeader: 'This subscription has products with varying prepaid lengths',
        subscriptionSummaryRenewalMethodHeader: 'This subscription has products with varying renewal methods',
        subscriptionSummaryNextOrderTitle: 'Next order:',
        subscriptionSummaryDiscountCodeTitle: 'Discount code',
        subscriptionSummaryPaymentInfoTitle: 'Payment info',
        subscriptionSummaryProductsTitle: 'Products',
        subscriptionSummaryShippingAddressTitle: 'Shipping address',
        subscriptionSummarySubscriptionPausedMessage: 'Subscription is paused',
        subscriptionSummaryResumeFutureOrdersButton: 'Resume future orders',
        subscriptionSummaryEditFutureOrderButton: 'Edit future order',
        subscriptionSummaryEditFutureOrdersFlowTitle: 'Edit future order',
        subscriptionSummaryEditFutureOrdersFlowUpdateNextOrderOption: 'Only update next order dates',
        subscriptionSummaryEditFutureOrdersFlowUpdateFutureOrdersOption: 'Update all future orders based on selected dates',
        subscriptionSummaryEditFutureOrdersFlowPauseFutureOrdersOption: 'Pause future orders',
        subscriptionSummaryEditFutureOrdersFlowSaveChangesButton: 'Save changes',
        subscriptionSummaryEditFutureOrdersFlowCancelButton: 'Cancel',
        subscriptionSummaryEditFutureOrdersFlowAdditionalOrderWarningMessage: 'This will create an order with all products in your subscription, and will automatically move your next order date.',
        subscriptionSummaryNextOrderProcessingTitle: 'Your next order is processing',
        subscriptionSummaryNextOrderFailedToProcessTitle: 'Your next order failed to process',
        subscriptionSummaryNextOrderProcessingMessage: 'Your new order is currently processing. This may take up to {{processingFrequency}} minutes and your "Next order" date will be updated to accurately reflect the subscriptions order date.',
        subscriptionSummaryNextOrderFailedToProcessMessage: 'It will be attempted again on {{nextProcessingDate}}.',
        subscriptionSummaryOutOfStockProductMessage: 'There was an error encountered in processing your subscription. One or more products in your subscription are currently out of stock or have low quantities available. Please note that we will automatically attempt to process your order again on {{nextProcessingDate}}.',
        subscriptionSummaryChangeFrequencyButton: 'Change frequency',
        subscriptionSummaryEditFrequencyFlowSaveButton: 'Save',
        subscriptionSummaryEditFrequencyFlowCancelButton: 'Cancel',
        subscriptionFrequencyUpdatedSuccessMessage: 'Subscription frequency updated.',
        subscriptionFrequencyUpdatedFailureMessage: 'Subscription frequency could not be updated. Please try again later.',
        changeNextOrderUpdatedSuccessMessage: 'Shipping date updated.',
        changeNextOrderResumedSuccessMessage: 'Subscription was resumed.',
        changeNextOrderPausedSuccessMessage: 'Subscription was paused.',
        changeNextOrderUpdatedFailureMessage: 'Shipping date could not be updated. Please try again later.',
        changeNextOrderResumedFailureMessage: 'Subscription could not be resumed. Please try again later.',
        changeNextOrderPausedFailureMessage: 'Subscription could not be paused. Please try again later.',
        subscriptionDatePickerDaySunday: 'Sun',
        subscriptionDatePickerDayMonday: 'Mon',
        subscriptionDatePickerDayTuesday: 'Tue',
        subscriptionDatePickerDayWednesday: 'Wed',
        subscriptionDatePickerDayThursday: 'Thu',
        subscriptionDatePickerDayFriday: 'Fri',
        subscriptionDatePickerDaySaturday: 'Sat',
        subscriptionDatePickerDayJanuary: 'January',
        subscriptionDatePickerDayFebruary: 'February',
        subscriptionDatePickerDayMarch: 'March',
        subscriptionDatePickerDayApril: 'April',
        subscriptionDatePickerDayMay: 'May',
        subscriptionDatePickerDayJune: 'June',
        subscriptionDatePickerDayJuly: 'July',
        subscriptionDatePickerDayAugust: 'August',
        subscriptionDatePickerDaySeptember: 'September',
        subscriptionDatePickerDayOctober: 'October',
        subscriptionDatePickerDayNovember: 'November',
        subscriptionDatePickerDayDecember: 'December',
        subscriptionDatePickerDayToday: 'Today',
        subscriptionDatePickerDayClear: 'Clear',
        subscriptionDatePickerDayClose: 'Close',
        productsPanelEditActionText: 'Edit',
        productsPanelTitle: 'Products in my subscription',
        productsPanelSwapFlowShippingAddressWarning: 'Add a shipping address before swapping products.',
        productsPanelSwapFlowDiscountsPersistMessage: '(discount will carry over)',
        productsPanelSwapFlowOptionsTitle: 'Swapping product with the following',
        productsPanelSwapFlowHeaderText: 'Swapping products for this subscription',
        productsPanelSwapFlowHeaderSecondaryText: 'These changes will affect all future orders',
        productsPanelSwapFlowHeaderSecondaryTextWithDynamicDiscountNotice: 'These changes will affect all future orders. Please note that initiating a swap action on a product will remove any existing dynamic discounts.',
        productsPanelSwapFlowCancelButton: 'Cancel swap',
        productsPanelSwapFlowSelectButton: 'Select product',
        productsPanelSwapFlowConfirmText: 'Are you sure you want to swap this product?',
        productsPanelSwapFlowNoSwappableProducts: 'There are no swappable products.',
        productsPanelSwapFlowSuccessMessage: 'Subscription product swapped.',
        productsPanelSwapFlowErrorMessage: 'Subscription product could not be swapped. Please try again later.',
        productsPanelSwapFlowShippingAddressMessage: 'This product requires a shipping address. <button>Provide a shipping address</button> before selecting this product.',
        productsPanelSwapFlowVariantSelectLabel: 'Select a variant',
        productsPanelDetailsActionsConfirmRemove: 'Are you sure you want to remove this product from the subscription?',
        productsPanelDetailsActionsSwapButton: 'Swap Product',
        productsPanelDetailsActionsRemoveButton: 'Remove Product',
        productsPanelLineItemDetailQuantity: 'Quantity: {{quantity}}',
        productsPanelContactToSwapProductsMessage: 'Contact us to swap this product',
        productsPanelEditFlowCancelButton: 'Cancel',
        productsPanelEditFlowSaveButton: 'Save',
        productsPanelEditFlowSubtotalLabel: 'Subtotal: ',
        productsPanelPrepaidRenewalFlowSuccessMessage: 'Prepaid renewal method changed.',
        productsPanelPrepaidRenewalFlowErrorMessage: 'Prepaid renewal method could not be changed.',
        productsPanelSwapFlowUpdatedChargeMessage: 'You will be charged {{amount}} more on your future orders.',
        productsPanelDeleteLineItemFlowErrorMessage: 'Product could not be removed from subscription. Please try later.',
        productsPanelDeleteLineItemFlowSuccessMessage: 'Product removed from subscription.',
        productsPanelEditFlowQuantityZeroMessage: 'Line item quantity must be greater than zero.',
        productsPanelEditFlowSuccessMessage: 'Subscription updated.',
        productsPanelEditFlowErrorMessage: 'Subscription could not be updated. Please try again later.',
        accountInfoTitle: 'Account info',
        accountInfoMessage: 'This account information is tied directly to your subscriptions.',
        accountInfoEditButton: 'Edit',
        accountInfoNameLabel: 'Name',
        accountInfoEmailLabel: 'Email address',
        accountInfoPhoneNumberLabel: 'Phone number',
        accountInfoEditFirstNameLabel: 'First name',
        accountInfoEditLastNameLabel: 'Last name',
        accountInfoEditEmailLabel: 'Email address',
        accountInfoEditPhoneNumberLabel: 'Phone number',
        accountInfoEditFirstNameBlankError: 'First name cannot be blank',
        accountInfoEditLastNameBlankError: 'Last name cannot be blank',
        accountInfoEditEmailBlankError: 'Email cannot be blank',
        accountInfoCancelButton: 'Cancel',
        accountInfoSaveButton: 'Save changes',
        accountInfoSaveSuccessMessage: 'Customer information saved!',
        accountInfoSaveFailureMessage: 'Customer information failed to save.',
        addressPanelEditFirstNameMissingError: 'The First Name field is required.',
        addressPanelEditLastNameMissingError: 'The Last Name field is required.',
        addressPanelEditPhoneMissingError: 'The Phone Number field is required.',
        addressPanelEditStreet1MissingError: 'The Street 1 field is required.',
        addressPanelEditCityMissingError: 'The City field is required.',
        addressPaneEditZipMissingError: 'The Zip Code field is required.',
        addressPanelEditMissingRequiredFieldsMessage: 'The subscription field is required.',
        manageUpcomingOrdersPanelTitle: 'Manage upcoming orders',
        manageUpcomingOrdersPanelUpcomingOrdersTitle: 'Upcoming orders',
        manageUpcomingOrdersPanelChangesAffectFutureOrdersMessage: 'These changes will affect all future orders',
        manageUpcomingOrdersPanelPauseFutureOrdersButton: 'Pause future orders',
        manageUpcomingOrdersPanelOrderNowButton: 'Order now',
        manageUpcomingOrdersPanelOrderDateTitle: 'Order date',
        manageUpcomingOrdersPanelProductTitle: 'Products',
        manageUpcomingOrdersPanelSkipShipmentFlowOrderCurrentlySkipMessage: '(Order is currently skipped)',
        manageUpcomingOrdersPanelSkipShipmentFlowSkipOrderSuccessMessage: 'Order skipped',
        manageUpcomingOrdersPanelSkipShipmentFlowSkipOrderFailureMessage: 'Order could not be skipped.',
        manageUpcomingOrdersPanelSkipShipmentFlowSkipShipmentButton: 'Skip shipment',
        manageUpcomingOrdersPanelSkipShipmentFlowSkipShipmentConfirmationMessage: 'Are you sure you want to skip this shipment?',
        manageUpcomingOrdersPanelRecoverShipmentFlowRecoverShipmentButton: 'Recover shipment',
        manageUpcomingOrdersPanelRecoverShipmentFlowRecoverShipmentConfirmationMessage: 'Are you sure you want to recover this shipment?',
        manageUpcomingOrdersPanelRecoverShipmentFlowRecoverOrderSuccessMessage: 'Order recovered',
        manageUpcomingOrdersPanelRecoverShipmentFlowRecoverOrderFailureMessage: 'Order could not be recovered.',
        manageUpcomingOrdersPanelPauseFutureOrdersFlowOrdersPauseOrderSuccessMessage: 'Order paused',
        manageUpcomingOrdersPanelPauseFutureOrdersFlowOrdersPauseOrderFailureMessage: 'Order could not be paused at this time.',
        manageUpcomingOrdersPanelRemoveOneTimeProductConfirmationMessage: 'Are you sure you want to remove "{{productTitle}}" from your order on {{orderDate}}?',
        manageUpcomingOrdersPanelRemoveAdjustmentProductSuccessMessage: 'One-time product removed.',
        manageUpcomingOrdersPanelRemoveAdjustmentProductFailureMessage: 'One-time product could not be removed at this time.',
        manageUpcomingOrdersAdjustmentProductDefaultLabel: 'One-time',
        manageUpcomingOrdersRemoveOneTimeProductButtonText: 'Remove',
        manageUpcomingOrdersPanelOrderNowFlowOrderShipOrderSuccessMessage: 'Order shipped',
        manageUpcomingOrdersPanelOrderNowFlowOrderShipOrderFailureMessage: 'Order could not be shipped at this time.',
        panelEditText: 'Edit',
        panelEditText_toggled: 'Close',
        paymentPanelTitle: 'Payment information',
        paymentPanelEmailUpdateFlowNoPaymentMethod: 'No payment method has been selected.',
        paymentPanelEmailUpdateFlowEmailSent: 'An email has been sent to update your payment information.',
        paymentPanelEmailUpdateFlowResendEmailButton: 'Send another email',
        paymentPanelEmailUpdateFlowReturnButton: 'Return to previous page',
        paymentPanelEmailUpdateFlowCreditCardDetails: 'Credit card - {{ccType}} ending in {{lastFour}}',
        paymentPanelEmailUpdateFlowBillingAddressTitle: 'Billing address',
        paymentPanelEmailUpdateFlowChangePaymentButton: 'Change payment information',
        paymentPanelEmailUpdateFlowChangePaymentDetails: 'You will be sent an email with a secure link to change your payment information.',
        paymentPanelEmailUpdateFlowResendEmailConfirmation: 'If you do not receive the email, confirm your information and send again.',
        paymentPanelEmailUpdateFlowTitle: 'Payment method',
        paymentPanelUrlUpdateFlowNoPaymentMethod: 'No payment method has been selected.',
        paymentPanelUpdateSuccessMessage: 'Successfully updated payment method.',
        paymentPanelAddSuccessMessage: 'Successfully added payment method.',
        paymentPanelEmailUpdateFlowResendEmailHelpText: 'Look for the email with the subject: "Edit your payment details".<br>If it still is not found check your spam folder and send again.',
        paymentPanelListUpdateErrorMessage: 'Failed updating payment method.',
        paymentPanelListUpdateSuccessMessage: 'Successfully updated payment method.',
        paymentPanelListLoadFailMessage: 'Failed getting payment methods.',
        paymentPanelListPaypalLabel: 'Paypal - {{paypalEmail}}',
        paymentPanelListCCLabel: '{{ccType}} - ending in {{lastFour}} (expires {{expiry}})',
        paymentPanelListAmazonPayLabel: '{{ccType}} - ending in {{lastFour}}',
        paymentPanelListEditButton: 'Edit',
        paymentPanelListChangeDefaultCardButton: 'Edit payment method',
        paymentPanelListAddButton: 'Add payment method',
        paymentPanelListAddAltButton: 'Add gift card',
        paymentPanelListCancelButton: 'Cancel',
        paymentPanelListSaveButton: 'Save changes',
        paymentPanelListLoadErrorMessage: 'Unable to load payment methods.',
        paymentPanelEditErrorMessage: 'An error occurred while loading payment method information; please try again later.',
        paymentPanelPaymentTitle: 'Payment methods',
        altPaymentSummaryCardTitle: 'Gift cards',
        altPaymentSummaryCardPrefix: 'Gift card: ',
        paymentSummaryCardPrefix: 'Credit card:',
        paymentSummaryCardTitle: 'Payment methods',
        paymentSummaryNoPaymentMethodMessage: 'No payment method has been selected.',
        altPaymentSummaryCardMessage: '${{balance}} Remaining',
        paymentPanelInvalidAltPayment: 'Invalid Number or PIN. Please Try again.',
        paymentMethodSummaryEndingInMessage: 'ending in {{lastFour}}',
        paymentMethodSummaryAccountMessage: 'account {{account}}',
        paymentMethodSummaryAmazonPayLabel: 'Amazon Pay',
        paymentMethodSummaryApplePayLabel: 'Apple Pay',
        paymentMethodSummaryPayPalLabel: 'PayPal',
        paymentMethodSummaryShopPayLabel: 'Shop Pay',
        paymentMethodSummaryVenmo: 'Venmo',
        orderHistoryPanelTitle: 'Order history',
        orderHistoryPanelPricesDiscountsApplyMessage: 'The prices shown also reflect discounts that apply before taxes.',
        orderHistoryPanelOrderIdColumn: 'Order ID',
        orderHistoryPanelSubtotalColumn: 'Subtotal',
        orderHistoryPanelTaxColumn: 'Tax',
        orderHistoryPanelShippingColumn: 'Shipping',
        orderHistoryPanelTotalColumn: 'Total',
        orderHistoryPanelDateCreatedColumn: 'Date created',
        activeSubscriptionsTitle: 'My subscriptions',
        activeSubscriptionsSubtitle: 'Active subscriptions',
        noActiveSubscriptionsMessage: 'Customer has no active subscriptions.',
        viewInactiveSubscriptionsTitle: 'View and reactivate inactive subscriptions',
        viewInactiveSubscriptionsMessage: 'View your previous subscription history and select which ones you would like to reactivate.',
        viewInactiveSubscriptionsButton: 'View inactive subscriptions',
        inactiveSubscriptionsTitle: 'Inactive subscriptions',
        inactiveSubscriptionsCount: '{{count}} inactive subscription',
        inactiveSubscriptionsCount_plural: '{{count}} inactive subscriptions',
        hideInactiveSubscriptionsButton: 'Hide inactive subscription',
        hideInactiveSubscriptionsButton_plural: 'Hide inactive subscriptions',
        reactivateSubscriptionButton: 'Reactivate subscription',
        reactivateSubscriptionConfirmationMessage: 'Are you sure you would like to reactivate this subscription?',
        reactivateSubscriptionNextOrderMessage: 'Your next order will be on: {{date, {"year": "numeric", "month": "long", "day": "numeric"} }}.',
        reactivateSubscriptionCancelButton: 'No, leave subscription',
        reactivateSubscriptionConfirmationButton: 'Yes, reactivate subscription',
        inactiveSubscriptionName: '{{count}} Product Subscription',
        reactivationFailureMessage: 'Subscription could not be reactivated. Please try again later.',
        reactivationSuccessMessage: 'Subscription reactivated.',
        addressPanelTitle: 'Address and shipping information',
        addressPanelShippingMethodLabel: 'Shipping method',
        addressPanelShippingAddressTitle: 'Shipping address',
        addressPanelBillingAddressTitle: 'Billing address',
        addressPanelCreateSuccessMessage: 'Customer address created.',
        addressPanelCreateErrorMessage: 'Customer address could not be created. Please try again later.',
        addressPanelUpdateSuccessMessage: 'Customer address updated.',
        addressPanelUpdateErrorMessage: 'Customer address could not be updated. Please try again later.',
        addressPanelSaveButton: 'Save changes',
        addressPanelCancelButton: 'Cancel',
        addressPanelMissingAddressMessage: 'Address not found',
        addressPanelAddressNotRequiredMessage: 'A {{addressType}} is not needed for the selected products.',
        addressPanelEditShippingTitle: 'Shipping address',
        addressPanelEditSameAddressLabel: 'Same as shipping address',
        addressPanelEditExistingAddressLabel: 'Use an existing address',
        addressPanelEditExistingAddressSelectLabel: 'Select an existing address',
        addressPanelEditExistingAddressSelectMessage: 'Select an address',
        addressPanelEditExistingAddressDeleted: 'This address has been deleted. Select a different address or use a new address.',
        addressPanelEditBillingTitle: 'Billing address',
        addressPanelEditProvinceLabel: 'State/Province',
        addressPanelEditProvincePlaceholder: 'State/Province',
        addressPanelEditFirstNameLabel: 'First Name',
        addressPanelEditFirstNamePlaceholder: 'First Name',
        addressPanelEditLastNameLabel: 'Last Name',
        addressPanelEditLastNamePlaceholder: 'Last Name',
        addressPanelEditCompanyLabel: 'Company Name (optional)',
        addressPanelEditCompanyPlaceholder: 'Company Name',
        addressPanelEditPhoneLabel: 'Phone Number',
        addressPanelEditPhonePlaceholder: 'Phone Number',
        addressPanelEditStreet1Label: 'Address Line 1',
        addressPanelEditStreet1Placeholder: 'Address Line 1',
        addressPanelEditStreet2Label: 'Address Line 2 (optional)',
        addressPanelEditStreet2Placeholder: 'Address Line 2',
        addressPanelEditCityLabel: 'City',
        addressPanelEditCityPlaceholder: 'City',
        addressPanelEditCountryLabel: 'Country',
        addressPanelEditZipLabel: 'Zip/Postal Code',
        addressPanelEditZipPlaceholder: 'Zip/Postal Code',
        loadingSubscriptionsMessage: 'Loading your subscriptions',
        loadingSubscriptionsLoggedOutError: 'This is awkward. You need to log in.',
        loadingSubscriptionsError: 'An error has occurred.',
        loadingSubscriptionsComponentError: 'An error has occurred with the configuration passed to the component',
        passwordlessLoginSecured: 'Secured',
        passwordlessLoginHeader: 'Access your subscription account',
        passwordlessLoginDescription: 'Skip the hassle of remembering passwords. Enter the email address associated with your account, and we’ll send a one time login link to your inbox.',
        passwordlessLoginInputLabel: 'Email',
        passwordlessLoginInputPlaceholder: 'Enter Email',
        passwordlessLoginButtonLabel: 'Get one time login link',
        passwordlessLoginSuccessHeader: 'An email is on its way!',
        passwordlessLoginSuccessDescription: 'We\'ve sent a login link to {{email}}. If this email is registered to an account, you will find a one time login link that will log you into your subscriptions.',
        passwordlessLoginSuccessFooter: 'The link expires in 15 minutes so be sure to use it soon.',
        passwordlessLoginInvalidHeader: 'Invalid Link',
        passwordlessLoginInvalidDescription: 'Oops! The link you clicked is no longer valid. Please click the button below to generate a new one time login link and regain access to your account.',
        passwordlessLoginInvalidButtonLabel: 'Send a new one time login link',
        loggedInAsCustomerMessage: 'You are logged into the customer portal as the customer. All changes made will be saved to the customer\'s subscription.',
        subscriptionValidationMissingPhoneWithLink: '<p>Failed to save due to an unrelated issue. <button>Please provide a phone number</button> and try saving again.</p>',
        subscriptionValidationMissingPhone: 'Failed to save due to an unrelated issue. Please provide a phone number and try saving again.',
        subscriptionValidationMissingZipWithLink: '<p>Failed to save due to an unrelated issue. <button>Please provide a zip code</button> and try saving again.</p>',
        subscriptionValidationMissingZip: 'Failed to save due to an unrelated issue. Please provide a zip code and try saving again.',
        subscriptionValidationInvalidZipWithLink: '<p>Failed to save due to an unrelated issue. The zip code we have on record is invalid. <button>Please provide a valid zip code</button> and try saving again.</p>',
        subscriptionValidationInvalidZip: 'Failed to save due to an unrelated issue. The zip code we have on record is invalid. Please provide a valid zip code and try saving again.',
        subscriptionValidationInvalidShippingAddressCustomerMessage: 'Failed to save. This subscription does not have a shipping rate associated with it. Please contact us for support.',
        scaWaiting: 'This subscription requires payment method authentication. You won\'t be able to edit your subscription while your payment authentication is pending. If your link has expired, generate a new link.',
        scaGeneratingLink: 'You\'ll receive an email with the new link. This may take up to 60 minutes.',
        scaAuthenticating: 'If you authenticated the payment, wait a few moments, then refresh the page. If the authenticate payment link didn\'t work, generate a new link to complete authentication.',
        scaError: 'An error occurred, and we weren\'t able to generate a new link. Please try again later.',
        ScaWaitingBoldCheckout: 'This subscription requires payment method authentication. You won’t be able to edit your subscription while your payment authentication is pending.',
        scaSuccessBoldCheckout: 'Success! You’ve authenticated your payment method successfully. Please note that it may take up to {{processingFrequency}} mins for your subscription to update.',
        scaFailedBoldCheckout: 'Authentication failed. An error occurred, and we weren’t able to authenticate your payment method.',
        scaErrorBoldCheckout: 'An error occurred, and we weren’t able to authenticate your payment method.',
        addProductsButton: 'ADD PRODUCTS',
        addProductMessage: 'Add product',
        addProductsTitle: 'Add products to your subscription',
        addProductsNoProductsErrorMessage: 'Error retrieving products. Please try again.',
        addProductsNoProductErrorMessage: 'Error retrieving product. Please try again.',
        addProductsAddingErrorMessage: 'Error adding the product to your subscription. Please try again.',
        addProductsRetrieveSubscriptionErrorMessage: 'Error getting your subscription. Please try again',
        addProductsBackButton: 'Back to products',
        addProductsToSubscriptionButton: 'ADD TO THIS SUBSCRIPTION',
        addProductsTargetSubscription: 'subscription',
        addProductsTargetNextOrder: 'next order',
        addProductsSuccessTitle: '{{productName}} was added to your {{addProductsTarget}}.',
        addProductsSuccessMessage: '<p>Your {{productName}} will be added to your next order on {{nextOrderDate}}.</p><p>Your new subtotal is <strong>{{newTotal}}</strong>, which will be charged on your stored payment method.</p>',
        addProductsManageSubscriptionButton: 'Manage Your Subscription',
        addProductsAddMoreButton: 'Add More Products',
        addProductsSearchPlaceholder: 'Search',
        addProductsSubscriptionProductTooltipText: 'Subscription product price in {{currencyCode}}',
        addProductsOneTimeProductTooltipText: 'One-time purchase product price in {{currencyCode}}',
        addProductsQuantityLabel: 'Quantity',
        addProductsValidateQuantityError: 'Enter a valid quantity',
        addProductsOptionSelectorPlaceholder: 'Select an option',
        addProductsAddToNextOrderButton: 'Add to next order only - {{formattedPrice}}',
        addProductsAddToSubscriptionButton: 'Add to this subscription - {{formattedPrice}}',
        addProductsOneTimeAdjustmentName: 'One-time',
        addProductsOnetimeAdjustmentDescription: 'Adds x{{quantity}} "{{title}}" to the next order.',
        addProductsPriceForSubscribers: '{{formattedPrice}} as a subscription',
        addProductsVariantNotFoundMessage: 'There was a problem identifying the product based on your selections. Please try your selection again.',
        addProductsNoMatchesMessage: 'Sorry, no matches were found. Try a new search or contact us for assistance.',
        upsellWidgetAddProductMessage: 'Add product',
        upsellWidgetAddedProductMessage: 'Added',
        upsellWidgetProductDetailsBackButton: 'Back to products',
        upsellWidgetProductDetailsAddMoreButton: 'Add More Products',
        upsellWidgetSubscriptionPriceCurrencyTooltipText: 'Subscription product price in {{currencyCode}}',
        upsellWidgetOneTimeProductTooltipText: 'One-time purchase product price in {{currencyCode}}',
        upsellWidgetProductCardAddErrorText: 'An error occurred please try again',
        upsellWidgetProductDetailsErrorText: 'An error occurred please try again',
        upsellWidgetPriceForSubscribers: '{{formattedPrice}} as a subscription',
        upsellWidgetAddToSubscriptionButton: 'Add to this subscription - {{formattedPrice}}',
        upsellWidgetAddToNextOrderButton: 'Add to next order only - {{formattedPrice}}',
        upsellWidgetAddSuccessTitle: '{{productName}} was added to your {{addProductsTarget}}.',
        upsellWidgetTargetSubscription: 'subscription',
        upsellWidgetTargetNextOrder: 'next order',
        upsellWidgetAddSuccessMessage: '<p>Your {{productName}} will be added to your next order on {{nextOrderDate}}.</p><p>Your new subtotal is <strong>{{newTotal}}</strong>, which will be charged on your stored payment method.</p>',
        upsellWidgetOneTimeAdjustmentName: 'One-time',
        upsellWidgetOnetimeAdjustmentDescription: 'Adds x{{quantity}} "{{title}}" to the next order.',
        discountComponentRegularPriceLabel: 'regular price',
        expressAddOnOneTimeSuccess: '<strong>{{itemTitle}} x {{quantity}}</strong> was added to your next order on {{longDate}}. Your new subtotal is <strong>{{newTotal}}</strong>, which will be charged on your stored payment method. {{portalLink}}',
        expressAddOnSubsSuccess: '<strong>{{itemTitle}} x {{quantity}}</strong> was added to your subscription #{{bold_platform_subscription_id}}. This item will be added to your next order on {{longDate}}. Your new subtotal is <strong>{{newTotal}}</strong>, which will be charged on your stored payment method. {{portalLink}}',
    }

  },

  de: {

      translation: {
        cancelPanelTitle: 'Abonnement kündigen',
        cancelPanelAlertMessage: 'Sobald deine Abonnementbestellung storniert ist, wirst du nicht mehr zu "{{subscriptionTitle}}" abonniert sein.',
        cancelPanelCancelSubscriptionFlowCancelSubscriptionConfirmationButton: 'Abonnement kündigen',
        cancelPanelCancelSubscriptionFlowCancelSubscriptionButton: 'Abonnement kündigen',
        cancelPanelCancelSubscriptionFlowKeepSubscriptionButton: 'Ich werde mein Abonnement behalten.',
        cancelPanelCancelSubscriptionFlowWarningHeaderMessage: 'Bist du dir sicher, dass du dein Abonnement kündigen möchtest?',
        cancelPanelCancelSubscriptionFlowReactivateSubscriptionMessage: 'Dein Abonnement kann jederzeit nach der Kündigung auf deiner \'Abonnements verwalten\'-Seite aktiviert werden.',
        cancelPanelRenewalMethodFlowSubscriptionPaidMessage: 'Dieses Abonnement ist bereits vollständig bezahlt.',
        cancelPanelRenewalMethodFlowSkipUpcomingOrdersMessage: 'Du kannst zukünftige Bestellungen überspringen, indem du deine kommenden Bestellungen verwaltest.',
        cancelPanelRenewalMethodFlowSubscriptionRenewalMethodMessage: 'Nach deiner letzten Bestellung wird dein Abonnement: {{renewalMethod}} sein.',
        cancelPanelRenewalMethodFlowVaryingPrepaidLengthMessage: 'Dieses Abonnement hat Produkte mit unterschiedlichen vorab bezahlten Längen. Du kannst jede einzelne Bestellung verwalten, indem du die Produkte in deinem Abonnement anschaust.',
        cancelPanelRenewalMethodFlowChangeProductsRenewalMethodButton: 'Ändere die Verlängerungsmethode für jedes Produkt',
        cancelPanelRenewalMethodFlowChangeRenewalMethodButton: 'Ändere die Erneuerungsmethode',
        cancelPanelRenewalMethodFlowChangeRenewalMethodTitle: 'Ändere die Verlängerungsmethode',
        cancelPanelRenewalMethodFlowSuccessMessage: 'Die Methode zur Erneuerung des Prepaid-Abonnements wurde geändert.',
        cancelPanelRenewalMethodFlowFailureMessage: 'Die Prepaid-Verlängerungsmethode konnte nicht geändert werden.',
        cancelPanelRenewalMethodFlowRenewalMethodLabel: 'Erneuerungsmethode',
        cancelPanelRenewalMethodFlowPrepaidRenewalOption: 'Als Prepaid-Abonnement verlängern',
        cancelPanelRenewalMethodFlowStandardRenewalOption: 'Als reguläres Abonnement verlängern',
        cancelPanelRenewalMethodFlowCancelRenewalOption: 'Storniere nach der letzten vorausbezahlten Bestellung',
        cancelPanelRenewalMethodFlowChangeRenewalMethodCancelButton: 'Abbrechen',
        cancelPanelRenewalMethodFlowChangeRenewalMethodSaveButton: 'Änderungen speichern',
        cancelSubscriptionSuccessMessage: 'Abonnement gekündigt.',
        cancelSubscriptionLoadSettingsFailureMessage: 'Die Stornierungseinstellungen konnten nicht geladen werden...',
        cancelSubscriptionLoadReasonsFailureMessage: 'Stornierungsgründe konnten nicht geladen werden...',
        cancelSubscriptionFailureMessage: 'Das Abonnement konnte nicht gekündigt werden. Bitte versuche es später noch einmal.',
        prepaidCancelNoContinueMessage: 'storniert.',
        prepaidCancelAsPrepaidMessage: 'erneuert als Prepaid-Abonnement.',
        prepaidCancelAsStandard: 'erneuert als reguläres Abonnement.',
        futureOrderDate: '{{date, {"year": "zahlen", "month": "lang", "day": "zahlen"} }}',
        subscriptionSummaryOrderFrequencyTitle: 'Bestellhäufigkeit',
        subscriptionDetailsButton: 'Details anzeigen',
        subscriptionDetailsButton_toggled: 'Details ausblenden',
        subscriptionDetailsNoPaymentMethodMessage: 'Es wurde keine Zahlungsmethode ausgewählt.',
        subscriptionDetailsPartiallyFulfilledMessage: 'Eines oder mehrere Produkte sind nicht auf Lager. Wir haben die Bestellung mit dem verfügbaren Produkt(en) erstellt. Wenn die fehlenden Produkte wieder verfügbar sind, werden sie mit der nächsten Bestellung verarbeitet.',
        subscriptionSummaryOrderNowButton: 'Bestell jetzt',
        subscriptionSummarySubscriptionTitle: '{{firstLineItem.title}} - #{{subscription.bold_platform_subscription_id}}',
        subscriptionSummarySubscriptionTitle_plural: '{{count}} Produktabonnement - #{{subscription.bold_platform_subscription_id}}',
        subscriptionSummaryPrepaidLengthHeader: 'Dieses Abonnement hat Produkte mit unterschiedlichen vorausbezahlten Laufzeiten.',
        subscriptionSummaryRenewalMethodHeader: 'Dieses Abonnement enthält Produkte mit unterschiedlichen Verlängerungsmethoden.',
        subscriptionSummaryNextOrderTitle: 'Nächste Bestellung:',
        subscriptionSummaryDiscountCodeTitle: 'Rabattcode',
        subscriptionSummaryPaymentInfoTitle: 'Zahlungsinformationen',
        subscriptionSummaryProductsTitle: 'Produkte',
        subscriptionSummaryShippingAddressTitle: 'Lieferadresse',
        subscriptionSummarySubscriptionPausedMessage: 'Das Abonnement ist pausiert',
        subscriptionSummaryResumeFutureOrdersButton: 'Zukünftige Bestellungen fortsetzen',
        subscriptionSummaryEditFutureOrderButton: 'Zukünftige Bestellung bearbeiten',
        subscriptionSummaryEditFutureOrdersFlowTitle: 'Zukünftige Bestellung bearbeiten',
        subscriptionSummaryEditFutureOrdersFlowUpdateNextOrderOption: 'Nur die nächsten Bestelldaten aktualisieren',
        subscriptionSummaryEditFutureOrdersFlowUpdateFutureOrdersOption: 'Alle zukünftigen Bestellungen basierend auf den ausgewählten Daten aktualisieren',
        subscriptionSummaryEditFutureOrdersFlowPauseFutureOrdersOption: 'Zukünftige Bestellungen pausieren',
        subscriptionSummaryEditFutureOrdersFlowSaveChangesButton: 'Änderungen speichern',
        subscriptionSummaryEditFutureOrdersFlowCancelButton: 'Abbrechen',
        subscriptionSummaryEditFutureOrdersFlowAdditionalOrderWarningMessage: 'Das wird eine Bestellung mit all deinen Produkten im Abonnement erstellen und dein nächstes Bestelldatum automatisch verschieben.',
        subscriptionSummaryNextOrderProcessingTitle: 'Deine nächste Bestellung wird bearbeitet.',
        subscriptionSummaryNextOrderFailedToProcessTitle: 'Deine nächste Bestellung konnte nicht bearbeitet werden',
        subscriptionSummaryNextOrderProcessingMessage: 'Deine neue Bestellung wird gerade bearbeitet. Das kann bis zu {{processingFrequency}} Minuten dauern und dein Datum für die "Nächste Bestellung" wird aktualisiert, um das Bestelldatum des Abonnements genau widerzuspiegeln.',
        subscriptionSummaryNextOrderFailedToProcessMessage: 'Es wird am {{nextProcessingDate}} erneut versucht.',
        subscriptionSummaryOutOfStockProductMessage: 'Beim Verarbeiten deines Abonnements ist ein Fehler aufgetreten. Eines oder mehrere Produkte in deinem Abonnement sind derzeit nicht auf Lager oder haben eine geringe Verfügbarkeit. Bitte beachte, dass wir automatisch versuchen werden, deine Bestellung am {{nextProcessingDate}} erneut zu verarbeiten.',
        subscriptionSummaryChangeFrequencyButton: 'Ändere die Frequenz',
        subscriptionSummaryEditFrequencyFlowSaveButton: 'Speichern',
        subscriptionSummaryEditFrequencyFlowCancelButton: 'Abbrechen',
        subscriptionFrequencyUpdatedSuccessMessage: 'Abonnementshäufigkeit aktualisiert.',
        subscriptionFrequencyUpdatedFailureMessage: 'Die Abonnementfrequenz konnte nicht aktualisiert werden. Bitte versuche es später noch einmal.',
        changeNextOrderUpdatedSuccessMessage: 'Versanddatum aktualisiert.',
        changeNextOrderResumedSuccessMessage: 'Das Abonnement wurde wieder aufgenommen.',
        changeNextOrderPausedSuccessMessage: 'Das Abonnement wurde pausiert.',
        changeNextOrderUpdatedFailureMessage: 'Das Versanddatum konnte nicht aktualisiert werden. Bitte versuche es später noch einmal.',
        changeNextOrderResumedFailureMessage: 'Abonnement konnte nicht wiederhergestellt werden. Bitte versuche es später noch einmal.',
        changeNextOrderPausedFailureMessage: 'Das Abonnement konnte nicht pausiert werden. Bitte versuche es später noch einmal.',
        subscriptionDatePickerDaySunday: 'So',
        subscriptionDatePickerDayMonday: 'Mo',
        subscriptionDatePickerDayTuesday: 'Di',
        subscriptionDatePickerDayWednesday: 'Mi',
        subscriptionDatePickerDayThursday: 'Do',
        subscriptionDatePickerDayFriday: 'Fr',
        subscriptionDatePickerDaySaturday: 'Sa.',
        subscriptionDatePickerDayJanuary: 'Januar',
        subscriptionDatePickerDayFebruary: 'Februar',
        subscriptionDatePickerDayMarch: 'März',
        subscriptionDatePickerDayApril: 'April',
        subscriptionDatePickerDayMay: 'Mai',
        subscriptionDatePickerDayJune: 'Juni',
        subscriptionDatePickerDayJuly: 'Juli',
        subscriptionDatePickerDayAugust: 'August',
        subscriptionDatePickerDaySeptember: 'September',
        subscriptionDatePickerDayOctober: 'Oktober',
        subscriptionDatePickerDayNovember: 'November',
        subscriptionDatePickerDayDecember: 'Dezember',
        subscriptionDatePickerDayToday: 'Heute',
        subscriptionDatePickerDayClear: 'Zurücksetzen',
        subscriptionDatePickerDayClose: 'Schließen',
        productsPanelEditActionText: 'Bearbeiten',
        productsPanelTitle: 'Produkte in meinem Abonnement',
        productsPanelSwapFlowShippingAddressWarning: 'Füge eine Lieferadresse hinzu, bevor du Produkte tauscht.',
        productsPanelSwapFlowDiscountsPersistMessage: '(Rabatt wird übertragen)',
        productsPanelSwapFlowOptionsTitle: 'Artikel tauschen mit dem Folgenden',
        productsPanelSwapFlowHeaderText: 'Produkte für dieses Abonnement tauschen',
        productsPanelSwapFlowHeaderSecondaryText: 'Diese Änderungen werden alle zukünftigen Bestellungen betreffen.',
        productsPanelSwapFlowHeaderSecondaryTextWithDynamicDiscountNotice: 'Diese Änderungen werden alle zukünftigen Bestellungen betreffen. Bitte beachte, dass das Einleiten einer Tauschaktion für ein Produkt alle vorhandenen dynamischen Rabatte entfernt.',
        productsPanelSwapFlowCancelButton: 'Swap abbrechen',
        productsPanelSwapFlowSelectButton: 'Produkt auswählen',
        productsPanelSwapFlowConfirmText: 'Bist du dir sicher, dass du dieses Produkt tauschen möchtest?',
        productsPanelSwapFlowNoSwappableProducts: 'Es gibt keine austauschbaren Produkte.',
        productsPanelSwapFlowSuccessMessage: 'Abonnementprodukt getauscht.',
        productsPanelSwapFlowErrorMessage: 'Das Abonnementsprodukt konnte nicht getauscht werden. Bitte versuche es später erneut.',
        productsPanelSwapFlowShippingAddressMessage: 'Dieses Produkt benötigt eine Lieferadresse. <button>Lieferadresse angeben</button>, bevor du dieses Produkt auswählst.',
        productsPanelSwapFlowVariantSelectLabel: 'Wähle eine Variante',
        productsPanelDetailsActionsConfirmRemove: 'Bist du sicher, dass du dieses Produkt aus dem Abo entfernen möchtest?',
        productsPanelDetailsActionsSwapButton: 'Produkt tauschen',
        productsPanelDetailsActionsRemoveButton: 'Produkt entfernen',
        productsPanelLineItemDetailQuantity: 'Menge: {{quantity}}',
        productsPanelContactToSwapProductsMessage: 'Kontaktier uns, um dieses Produkt umzutauschen.',
        productsPanelEditFlowCancelButton: 'Stornieren',
        productsPanelEditFlowSaveButton: 'Speichern',
        productsPanelEditFlowSubtotalLabel: 'Zwischensumme: ',
        productsPanelPrepaidRenewalFlowSuccessMessage: 'Die Methode zur vorab bezahlten Verlängerung wurde geändert.',
        productsPanelPrepaidRenewalFlowErrorMessage: 'Die Prepaid-Verlängerungsmethode konnte nicht geändert werden.',
        productsPanelSwapFlowUpdatedChargeMessage: 'Du wirst in deinen zukünftigen Bestellungen {{amount}} mehr berechnet.',
        productsPanelDeleteLineItemFlowErrorMessage: 'Produkt konnte nicht aus dem Abonnement entfernt werden. Bitte versuche es später noch einmal.',
        productsPanelDeleteLineItemFlowSuccessMessage: 'Produkt von der Subscription entfernt.',
        productsPanelEditFlowQuantityZeroMessage: 'Die Menge des Einzelpostens muss größer als null sein.',
        productsPanelEditFlowSuccessMessage: 'Abonnement aktualisiert.',
        productsPanelEditFlowErrorMessage: 'Das Abonnement konnte nicht aktualisiert werden. Bitte versuche es später noch einmal.',
        accountInfoTitle: 'Kontoinfo',
        accountInfoMessage: 'Diese Kontoinformationen sind direkt mit deinen Abonnements verknüpft.',
        accountInfoEditButton: 'Bearbeiten',
        accountInfoNameLabel: 'Name',
        accountInfoEmailLabel: 'E-Mail-Adresse',
        accountInfoPhoneNumberLabel: 'Telefonnummer',
        accountInfoEditFirstNameLabel: 'Vorname',
        accountInfoEditLastNameLabel: 'Nachname',
        accountInfoEditEmailLabel: 'E-Mail-Adresse',
        accountInfoEditPhoneNumberLabel: 'Telefonnummer',
        accountInfoEditFirstNameBlankError: 'Der Vorname darf nicht leer sein.',
        accountInfoEditLastNameBlankError: 'Nachname darf nicht leer sein',
        accountInfoEditEmailBlankError: 'Die E-Mail darf nicht leer sein',
        accountInfoCancelButton: 'Abbrechen',
        accountInfoSaveButton: 'Änderungen speichern',
        accountInfoSaveSuccessMessage: 'Kundeninformationen gespeichert!',
        accountInfoSaveFailureMessage: 'Kundeninformationen konnten nicht gespeichert werden.',
        addressPanelEditFirstNameMissingError: 'Das Feld Vorname ist erforderlich.',
        addressPanelEditLastNameMissingError: 'Das Feld Nachname ist erforderlich.',
        addressPanelEditPhoneMissingError: 'Das Feld für die Telefonnummer ist erforderlich.',
        addressPanelEditStreet1MissingError: 'Das Feld Straße 1 ist erforderlich.',
        addressPanelEditCityMissingError: 'Das Feld für die Stadt ist erforderlich.',
        addressPaneEditZipMissingError: 'Das Feld für die Postleitzahl ist erforderlich.',
        addressPanelEditMissingRequiredFieldsMessage: 'Das Abonnementfeld ist erforderlich.',
        manageUpcomingOrdersPanelTitle: 'Zukünftige Bestellungen verwalten',
        manageUpcomingOrdersPanelUpcomingOrdersTitle: 'Bevorstehende Bestellungen',
        manageUpcomingOrdersPanelChangesAffectFutureOrdersMessage: 'Diese Änderungen werden alle zukünftigen Bestellungen betreffen.',
        manageUpcomingOrdersPanelPauseFutureOrdersButton: 'Zukünftige Bestellungen pausieren',
        manageUpcomingOrdersPanelOrderNowButton: 'Jetzt bestellen',
        manageUpcomingOrdersPanelOrderDateTitle: 'Bestelldatum',
        manageUpcomingOrdersPanelProductTitle: 'Produkte',
        manageUpcomingOrdersPanelSkipShipmentFlowOrderCurrentlySkipMessage: '(Bestellung wird momentan übersprungen)',
        manageUpcomingOrdersPanelSkipShipmentFlowSkipOrderSuccessMessage: 'Bestellung übersprungen',
        manageUpcomingOrdersPanelSkipShipmentFlowSkipOrderFailureMessage: 'Die Bestellung konnte nicht übersprungen werden.',
        manageUpcomingOrdersPanelSkipShipmentFlowSkipShipmentButton: 'Lieferung überspringen',
        manageUpcomingOrdersPanelSkipShipmentFlowSkipShipmentConfirmationMessage: 'Bist du dir sicher, dass du diese Lieferung überspringen möchtest?',
        manageUpcomingOrdersPanelRecoverShipmentFlowRecoverShipmentButton: 'Sendung wiederherstellen',
        manageUpcomingOrdersPanelRecoverShipmentFlowRecoverShipmentConfirmationMessage: 'Bist du dir sicher, dass du diese Lieferung wiederherstellen möchtest?',
        manageUpcomingOrdersPanelRecoverShipmentFlowRecoverOrderSuccessMessage: 'Bestellung wiederhergestellt',
        manageUpcomingOrdersPanelRecoverShipmentFlowRecoverOrderFailureMessage: 'Bestellung konnte nicht wiederhergestellt werden.',
        manageUpcomingOrdersPanelPauseFutureOrdersFlowOrdersPauseOrderSuccessMessage: 'Bestellung pausiert',
        manageUpcomingOrdersPanelPauseFutureOrdersFlowOrdersPauseOrderFailureMessage: 'Die Bestellung kann zurzeit nicht pausiert werden.',
        manageUpcomingOrdersPanelRemoveOneTimeProductConfirmationMessage: 'Bist du sicher, dass du "{{productTitle}}" von deiner Bestellung am {{orderDate}} entfernen möchtest?',
        manageUpcomingOrdersPanelRemoveAdjustmentProductSuccessMessage: 'Einmalprodukt entfernt.',
        manageUpcomingOrdersPanelRemoveAdjustmentProductFailureMessage: 'Das einmalige Produkt konnte zu diesem Zeitpunkt nicht entfernt werden.',
        manageUpcomingOrdersAdjustmentProductDefaultLabel: 'Einmalig',
        manageUpcomingOrdersRemoveOneTimeProductButtonText: 'Entfernen',
        manageUpcomingOrdersPanelOrderNowFlowOrderShipOrderSuccessMessage: 'Bestellung versendet',
        manageUpcomingOrdersPanelOrderNowFlowOrderShipOrderFailureMessage: 'Die Bestellung konnte zu diesem Zeitpunkt nicht versendet werden.',
        panelEditText: 'Bearbeiten',
        panelEditText_toggled: 'Schließen',
        paymentPanelTitle: 'Zahlungsinformationen',
        paymentPanelEmailUpdateFlowNoPaymentMethod: 'Es wurde keine Zahlungsmethode ausgewählt.',
        paymentPanelEmailUpdateFlowEmailSent: 'Eine E-Mail wurde gesendet, um deine Zahlungsinformationen zu aktualisieren.',
        paymentPanelEmailUpdateFlowResendEmailButton: 'Schick eine weitere E-Mail',
        paymentPanelEmailUpdateFlowReturnButton: 'Zurück zur vorherigen Seite',
        paymentPanelEmailUpdateFlowCreditCardDetails: 'Kreditkarte - {{ccType}} endet mit {{lastFour}}',
        paymentPanelEmailUpdateFlowBillingAddressTitle: 'Rechnungsadresse',
        paymentPanelEmailUpdateFlowChangePaymentButton: 'Zahlungsinformationen ändern',
        paymentPanelEmailUpdateFlowChangePaymentDetails: 'Dir wird eine E-Mail mit einem sicheren Link geschickt, um deine Zahlungsinformationen zu ändern.',
        paymentPanelEmailUpdateFlowResendEmailConfirmation: 'Wenn du die E-Mail nicht erhältst, bestätige deine Informationen und sende sie erneut.',
        paymentPanelEmailUpdateFlowTitle: 'Zahlungsmethode',
        paymentPanelUrlUpdateFlowNoPaymentMethod: 'Es wurde keine Zahlungsmethode ausgewählt.',
        paymentPanelUpdateSuccessMessage: 'Zahlungsmethode erfolgreich aktualisiert.',
        paymentPanelAddSuccessMessage: 'Zahlungsmethode erfolgreich hinzugefügt.',
        paymentPanelEmailUpdateFlowResendEmailHelpText: 'Schaue nach der E-Mail mit dem Betreff: \'Ändere deine Zahlungsdetails\'.<br>Wenn sie immer noch nicht gefunden wird, überprüfe deinen Spam-Ordner und sende sie erneut.',
        paymentPanelListUpdateErrorMessage: 'Zahlungsmethode aktualisieren fehlgeschlagen.',
        paymentPanelListUpdateSuccessMessage: 'Zahlungsmethode erfolgreich aktualisiert.',
        paymentPanelListLoadFailMessage: 'Fehler beim Abrufen der Zahlungsmethoden.',
        paymentPanelListPaypalLabel: 'Paypal - {{paypalEmail}}',
        paymentPanelListCCLabel: '{{ccType}} - endet mit {{lastFour}} (läuft ab {{expiry}})',
        paymentPanelListAmazonPayLabel: '{{ccType}} - endet mit {{lastFour}}',
        paymentPanelListEditButton: 'Bearbeiten',
        paymentPanelListChangeDefaultCardButton: 'Zahlungsmethode bearbeiten',
        paymentPanelListAddButton: 'Zahlungsmethode hinzufügen',
        paymentPanelListAddAltButton: 'Geschenkkarte hinzufügen',
        paymentPanelListCancelButton: 'Abbrechen',
        paymentPanelListSaveButton: 'Änderungen speichern',
        paymentPanelListLoadErrorMessage: 'Zahlungsmethoden konnten nicht geladen werden.',
        paymentPanelEditErrorMessage: 'Beim Laden der Zahlungsinformationen ist ein Fehler aufgetreten; bitte versuche es später noch einmal.',
        paymentPanelPaymentTitle: 'Zahlungsmethoden',
        altPaymentSummaryCardTitle: 'Geschenkkarten',
        altPaymentSummaryCardPrefix: 'Geschenkkarte:',
        paymentSummaryCardPrefix: 'Kreditkarte:',
        paymentSummaryCardTitle: 'Zahlungsmethoden',
        paymentSummaryNoPaymentMethodMessage: 'Es wurde keine Zahlungsmethode ausgewählt.',
        altPaymentSummaryCardMessage: '${{balance}} übrig',
        paymentPanelInvalidAltPayment: 'Ungültige Nummer oder PIN. Bitte versuche es nochmal.',
        paymentMethodSummaryEndingInMessage: '„endend in {{lastFour}}“',
        paymentMethodSummaryAccountMessage: 'Account {{account}}',
        paymentMethodSummaryAmazonPayLabel: 'Amazon Pay',
        paymentMethodSummaryApplePayLabel: 'Apple Pay',
        paymentMethodSummaryPayPalLabel: 'PayPal',
        paymentMethodSummaryShopPayLabel: 'Shop Pay',
        paymentMethodSummaryVenmo: 'Venmo',
        orderHistoryPanelTitle: 'Bestellhistorie',
        orderHistoryPanelPricesDiscountsApplyMessage: 'Die angezeigten Preise spiegeln auch Rabatte wider, die vor Steuern gelten.',
        orderHistoryPanelOrderIdColumn: 'Bestell-ID',
        orderHistoryPanelSubtotalColumn: 'Zwischensumme',
        orderHistoryPanelTaxColumn: 'Steuer',
        orderHistoryPanelShippingColumn: 'Versand',
        orderHistoryPanelTotalColumn: 'Gesamt',
        orderHistoryPanelDateCreatedColumn: 'Erstellungsdatum',
        activeSubscriptionsTitle: 'Meine Abonnements',
        activeSubscriptionsSubtitle: 'Aktive Abonnements',
        noActiveSubscriptionsMessage: 'Der Kunde hat keine aktiven Abonnements.',
        viewInactiveSubscriptionsTitle: 'Inactive Abonnements anzeigen und reaktivieren',
        viewInactiveSubscriptionsMessage: 'Sieh dir deinen bisherigen Abonnementsverlauf an und wähle aus, welche du reaktivieren möchtest.',
        viewInactiveSubscriptionsButton: 'Inactive Abos anzeigen',
        inactiveSubscriptionsTitle: 'Inaktive Abonnements',
        inactiveSubscriptionsCount: '{{count}} inaktive Abonnements',
        inactiveSubscriptionsCount_plural: '{{count}} inaktive Abonnements',
        hideInactiveSubscriptionsButton: 'Inaktive Abonnements ausblenden',
        hideInactiveSubscriptionsButton_plural: 'Inaktive Abonnements ausblenden',
        reactivateSubscriptionButton: 'Abonnement reaktivieren',
        reactivateSubscriptionConfirmationMessage: 'Bist du sicher, dass du dieses Abonnement erneut aktivieren möchtest?',
        reactivateSubscriptionNextOrderMessage: 'Deine nächste Bestellung wird am: {{date, {"year": "numeric", "month": "long", "day": "numeric"} }} sein.',
        reactivateSubscriptionCancelButton: 'Nein, Abonnement kündigen',
        reactivateSubscriptionConfirmationButton: 'Ja, Abonnement reaktivieren',
        inactiveSubscriptionName: '{{count}} Produktabonnement',
        reactivationFailureMessage: 'Das Abonnement konnte nicht reaktiviert werden. Bitte versuche es später erneut.',
        reactivationSuccessMessage: 'Subscription reaktiviert.',
        addressPanelTitle: 'Adresse und Versandinformationen',
        addressPanelShippingMethodLabel: 'Versandart',
        addressPanelShippingAddressTitle: 'Versandadresse',
        addressPanelBillingAddressTitle: 'Rechnungsadresse',
        addressPanelCreateSuccessMessage: 'Kundenadresse erstellt.',
        addressPanelCreateErrorMessage: 'Die Kundenadresse konnte nicht erstellt werden. Bitte versuche es später erneut.',
        addressPanelUpdateSuccessMessage: 'Kundenadresse aktualisiert.',
        addressPanelUpdateErrorMessage: 'Die Kundenadresse konnte nicht aktualisiert werden. Bitte versuch es später noch einmal.',
        addressPanelSaveButton: 'Änderungen speichern',
        addressPanelCancelButton: 'Abbrechen',
        addressPanelMissingAddressMessage: 'Adresse nicht gefunden',
        addressPanelAddressNotRequiredMessage: 'Ein {{addressType}} wird für die ausgewählten Produkte nicht benötigt.',
        addressPanelEditShippingTitle: 'Lieferadresse',
        addressPanelEditSameAddressLabel: 'Gleich wie die Versandadresse',
        addressPanelEditExistingAddressLabel: 'Benutze eine vorhandene Adresse',
        addressPanelEditExistingAddressSelectLabel: 'Wähle eine vorhandene Adresse aus',
        addressPanelEditExistingAddressSelectMessage: 'Wähle eine Adresse',
        addressPanelEditExistingAddressDeleted: 'Diese Adresse wurde gelöscht. Wähle eine andere Adresse oder benutze eine neue Adresse.',
        addressPanelEditBillingTitle: 'Rechnungsadresse',
        addressPanelEditProvinceLabel: 'Bundesland/Provinz',
        addressPanelEditProvincePlaceholder: 'Bundesland/Provinz',
        addressPanelEditFirstNameLabel: 'Vorname',
        addressPanelEditFirstNamePlaceholder: 'Vorname',
        addressPanelEditLastNameLabel: 'Nachname',
        addressPanelEditLastNamePlaceholder: 'Nachname',
        addressPanelEditCompanyLabel: 'Unternehmensname (optional)',
        addressPanelEditCompanyPlaceholder: 'Firmenname',
        addressPanelEditPhoneLabel: 'Telefonnummer',
        addressPanelEditPhonePlaceholder: 'Telefonnummer',
        addressPanelEditStreet1Label: 'Adresszeile 1',
        addressPanelEditStreet1Placeholder: 'Adresszeile 1',
        addressPanelEditStreet2Label: 'Adressezeile 2 (optional)',
        addressPanelEditStreet2Placeholder: 'Adresszeile 2',
        addressPanelEditCityLabel: 'Stadt',
        addressPanelEditCityPlaceholder: 'Stadt',
        addressPanelEditCountryLabel: 'Land',
        addressPanelEditZipLabel: 'PLZ',
        addressPanelEditZipPlaceholder: 'Postleitzahl',
        loadingSubscriptionsMessage: 'Lade deine Abonnements',
        loadingSubscriptionsLoggedOutError: 'Das ist peinlich. Du musst dich einloggen.',
        loadingSubscriptionsError: 'Ein Fehler ist aufgetreten.',
        loadingSubscriptionsComponentError: 'Ein Fehler ist mit der an die Komponente übergebenen Konfiguration aufgetreten.',
        passwordlessLoginSecured: 'Sekuriert',
        passwordlessLoginHeader: 'Greif auf dein Abonnementkonto zu',
        passwordlessLoginDescription: 'Überspring den Stress, dir Passwörter merken zu müssen. Gib die E-Mail-Adresse ein, die mit deinem Konto verbunden ist, und wir senden dir einen einmaligen Login-Link in dein Postfach.',
        passwordlessLoginInputLabel: 'E-Mail',
        passwordlessLoginInputPlaceholder: 'Gib die E-Mail ein',
        passwordlessLoginButtonLabel: 'Hol dir einen einmaligen Login-Link',
        passwordlessLoginSuccessHeader: 'Eine E-Mail ist auf dem Weg!',
        passwordlessLoginSuccessDescription: 'Wir haben einen Anmeldelink an {{email}} gesendet. Wenn diese E-Mail mit einem Konto registriert ist, findest du einen einmaligen Anmeldelink, der dich in deine Abonnements einloggt.',
        passwordlessLoginSuccessFooter: 'Der Link läuft in 15 Minuten ab, also benutze ihn schnell.',
        passwordlessLoginInvalidHeader: 'Ungültiger Link',
        passwordlessLoginInvalidDescription: '„Oops! Der Link, auf den du geklickt hast, ist nicht mehr gültig. Bitte klicke auf den Button unten, um einen neuen einmaligen Login-Link zu generieren und wieder Zugang zu deinem Konto zu erhalten.“',
        passwordlessLoginInvalidButtonLabel: 'Schick einen neuen einmaligen Anmeldelink',
        loggedInAsCustomerMessage: 'Du bist im Kundenportal als Kunde eingeloggt. Alle vorgenommenen Änderungen werden im Abonnement des Kunden gespeichert.',
        subscriptionValidationMissingPhoneWithLink: '<p>Das Speichern ist wegen eines nicht verwandten Problems fehlgeschlagen. <button>Bitte gib eine Telefonnummer an</button> und versuch es erneut zu speichern.</p>',
        subscriptionValidationMissingPhone: 'Speichern fehlgeschlagen aufgrund eines nicht verwandten Problems. Bitte gib eine Telefonnummer an und versuche es erneut zu speichern.',
        subscriptionValidationMissingZipWithLink: '<p>Fehler beim Speichern aufgrund eines nicht verwandten Problems. <button>Bitte gib eine Postleitzahl an</button> und versuche es erneut zu speichern.</p>',
        subscriptionValidationMissingZip: 'Speichern fehlgeschlagen aufgrund eines nicht verwandten Problems. Bitte gib eine Postleitzahl ein und versuche es erneut.',
        subscriptionValidationInvalidZipWithLink: '<p>Speichern fehlgeschlagen aufgrund eines nicht verwandten Problems. Die von uns gespeicherte Postleitzahl ist ungültig. <button>Bitte gib eine gültige Postleitzahl an</button> und versuche es erneut zu speichern.</p>',
        subscriptionValidationInvalidZip: 'Speichern fehlgeschlagen aufgrund eines nicht verwandten Problems. Die Postleitzahl, die wir in unseren Unterlagen haben, ist ungültig. Bitte gib eine gültige Postleitzahl ein und versuche es erneut zu speichern.',
        subscriptionValidationInvalidShippingAddressCustomerMessage: '„Speichern fehlgeschlagen. Dieses Abonnement hat keinen Versandtarif, der damit verbunden ist. Bitte kontaktiere uns für Unterstützung.“',
        scaWaiting: 'Dieses Abonnement erfordert eine Authentifizierung der Zahlungsmethode. Du kannst dein Abonnement nicht bearbeiten, solange deine Zahlungsauthentifizierung aussteht. Wenn dein Link abgelaufen ist, generiere einen neuen Link.',
        scaGeneratingLink: 'Du wirst eine E-Mail mit dem neuen Link erhalten. Das kann bis zu 60 Minuten dauern.',
        scaAuthenticating: 'Wenn du die Zahlung authentifiziert hast, warte einen Moment und lade die Seite dann neu. Wenn der Link zur Authentifizierung der Zahlung nicht funktioniert hat, generiere einen neuen Link zur Vervollständigung der Authentifizierung.',
        scaError: '„Ein Fehler ist aufgetreten, und wir konnten keinen neuen Link erstellen. Bitte versuche es später noch einmal.“',
        ScaWaitingBoldCheckout: 'Dieses Abonnement erfordert eine Authentifizierung der Zahlungsmethode. Du wirst dein Abonnement nicht bearbeiten können, während die Authentifizierung deiner Zahlung aussteht.',
        scaSuccessBoldCheckout: 'Erfolg! Du hast deine Zahlungsmethode erfolgreich authentifiziert. Bitte beachte, dass es bis zu {{processingFrequency}} Minuten dauern kann, bis dein Abonnement aktualisiert wird.',
        scaFailedBoldCheckout: 'Die Authentifizierung ist fehlgeschlagen. Ein Fehler ist aufgetreten, und wir konnten deine Zahlungsmethode nicht authentifizieren.',
        scaErrorBoldCheckout: 'Es ist ein Fehler aufgetreten, und wir konnten deine Zahlungsmethode nicht authentifizieren.',
        addProductsButton: 'PRODUKTE HINZUFÜGEN',
        addProductMessage: 'Produkt hinzufügen',
        addProductsTitle: 'Produkte zu deinem Abonnement hinzufügen',
        addProductsNoProductsErrorMessage: 'Fehler beim Abrufen der Produkte. Bitte versuche es erneut.',
        addProductsNoProductErrorMessage: 'Fehler beim Abrufen des Produkts. Bitte versuche es erneut.',
        addProductsAddingErrorMessage: 'Fehler beim Hinzufügen des Produkts zu deinem Abonnement. Bitte versuche es erneut.',
        addProductsRetrieveSubscriptionErrorMessage: 'Fehler beim Abrufen deines Abos. Bitte versuche es erneut.',
        addProductsBackButton: 'Zurück zu Produkten',
        addProductsToSubscriptionButton: 'ZU DIESER ABONNEMENT HINZUFÜGEN',
        addProductsTargetSubscription: 'Abonnement',
        addProductsTargetNextOrder: 'nächste Bestellung',
        addProductsSuccessTitle: '{{productName}} wurde zu deinem {{addProductsTarget}} hinzugefügt.',
        addProductsSuccessMessage: '<p>Dein {{productName}} wird zu deiner nächsten Bestellung am {{nextOrderDate}} hinzugefügt.</p><p>Dein neuer Zwischensumme beträgt <strong>{{newTotal}}</strong>, die von deiner gespeicherten Zahlungsmethode abgebucht wird.</p>',
        addProductsManageSubscriptionButton: 'Verwalte dein Abonnement',
        addProductsAddMoreButton: 'Mehr Produkte hinzufügen',
        addProductsSearchPlaceholder: 'Suche',
        addProductsSubscriptionProductTooltipText: 'Preis des Abonnementprodukts in {{currencyCode}}',
        addProductsOneTimeProductTooltipText: 'Einmaliger Kaufpreis des Produkts in {{currencyCode}}',
        addProductsQuantityLabel: 'Anzahl',
        addProductsValidateQuantityError: 'Gib eine gültige Menge ein',
        addProductsOptionSelectorPlaceholder: 'Wähle eine Option',
        addProductsAddToNextOrderButton: 'Nur zur nächsten Bestellung hinzufügen - {{formattedPrice}}',
        addProductsAddToSubscriptionButton: 'Füge dieses Abonnement hinzu - {{formattedPrice}}',
        addProductsOneTimeAdjustmentName: 'Einmalig',
        addProductsOnetimeAdjustmentDescription: 'Fügt x{{quantity}} "{{title}}" zur nächsten Bestellung hinzu.',
        addProductsPriceForSubscribers: '{{formattedPrice}} als Abonnement',
        addProductsVariantNotFoundMessage: 'Es gab ein Problem bei der Identifizierung des Produkts basierend auf deinen Auswahl. Bitte versuche deine Auswahl erneut.',
        addProductsNoMatchesMessage: 'Entschuldigung, es wurden keine Übereinstimmungen gefunden. Versuch eine neue Suche oder kontaktiere uns für Hilfe.',
        upsellWidgetAddProductMessage: 'Produkt hinzufügen',
        upsellWidgetAddedProductMessage: 'Hinzugefügt',
        upsellWidgetProductDetailsBackButton: 'Zurück zu den Produkten',
        upsellWidgetProductDetailsAddMoreButton: 'Mehr Produkte hinzufügen',
        upsellWidgetSubscriptionPriceCurrencyTooltipText: 'Preis des Abonnementprodukts in {{currencyCode}}',
        upsellWidgetOneTimeProductTooltipText: 'Einmalige Kaufproduktpreis in {{currencyCode}}',
        upsellWidgetProductCardAddErrorText: 'Es ist ein Fehler aufgetreten, bitte versuche es erneut.',
        upsellWidgetProductDetailsErrorText: 'Ein Fehler ist aufgetreten, bitte versuche es erneut.',
        upsellWidgetPriceForSubscribers: '{{formattedPrice}} als Abonnement',
        upsellWidgetAddToSubscriptionButton: 'Dieses Abonnement hinzufügen - {{formattedPrice}}',
        upsellWidgetAddToNextOrderButton: 'Nur zur nächsten Bestellung hinzufügen - {{formattedPrice}}',
        upsellWidgetAddSuccessTitle: '{{productName}} wurde zu deinem {{addProductsTarget}} hinzugefügt.',
        upsellWidgetTargetSubscription: 'Abonnement',
        upsellWidgetTargetNextOrder: 'nächste Bestellung',
        upsellWidgetAddSuccessMessage: '<p>Dein {{productName}} wird zu deiner nächsten Bestellung am {{nextOrderDate}} hinzugefügt.</p><p>Dein neuer subtotal ist <strong>{{newTotal}}</strong>, der auf deiner gespeicherten Zahlungsmethode belastet wird.</p>',
        upsellWidgetOneTimeAdjustmentName: 'Einmalig',
        upsellWidgetOnetimeAdjustmentDescription: 'Fügt x{{quantity}} "{{title}}" zur nächsten Bestellung hinzu.',
        discountComponentRegularPriceLabel: 'Regulärer Preis',
        expressAddOnOneTimeSuccess: '<strong>{{itemTitle}} x {{quantity}}</strong> wurde zu deiner nächsten Bestellung am {{longDate}} hinzugefügt. Dein neuer Zwischenstand beträgt <strong>{{newTotal}}</strong>, der von deiner hinterlegten Zahlungsmethode abgebucht wird. {{portalLink}}',
        expressAddOnSubsSuccess: '<strong>{{itemTitle}} x {{quantity}}</strong> wurde zu deinem Abonnement #{{bold_platform_subscription_id}} hinzugefügt. Dieser Artikel wird deiner nächsten Bestellung am {{longDate}} hinzugefügt. Dein neuer Zwischensummenbetrag beträgt <strong>{{newTotal}}</strong>, der von deiner gespeicherten Zahlungsmethode abgebucht wird. {{portalLink}}',
    }

  }

}